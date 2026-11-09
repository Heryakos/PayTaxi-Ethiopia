import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { canTransition } from '../services/fares';
import { providers } from '../services/provider';
import { Prisma } from '@prisma/client';
import { broadcastPaymentSuccess } from '../services/events.service';

type TransactionStatus = string;

const router = Router();
const statuses = new Set<TransactionStatus>(['SUCCESS', 'FAILED', 'REFUNDED', 'UNKNOWN']);

interface ProcessWebhookParams {
  provider: 'ADDISPAY' | 'TELEBIRR' | 'CHAPA' | 'CBE_BIRR';
  eventId: string;
  transactionId: string;
  nextStatus: TransactionStatus;
  providerReference?: string;
  eventType?: string;
  rawPayload: string;
  res: Response;
}

/**
 * Shared compare-and-set idempotency processor across all Ethiopian payment providers.
 */
async function processWebhookTransition({
  provider,
  eventId,
  transactionId,
  nextStatus,
  providerReference,
  eventType,
  rawPayload,
  res,
}: ProcessWebhookParams) {
  try {
    if (!eventId || !transactionId || !nextStatus || !statuses.has(nextStatus)) {
      return res.status(400).json({ error: 'eventId, transactionId, and valid status are required' });
    }

    // Idempotency check via unique constraint on (provider, providerEventId)
    try {
      await prisma.webhookEvent.create({
        data: {
          provider,
          providerEventId: eventId,
          eventType: eventType ?? null,
          transactionId,
          rawPayload,
          processed: false,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.json({ received: true, duplicate: true, provider });
      }
      throw error;
    }

    const current = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!current) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const from = current.status;
    if (!canTransition(from, nextStatus)) {
      await prisma.webhookEvent.update({
        where: { provider_providerEventId: { provider, providerEventId: eventId } },
        data: { processed: true },
      });
      return res.json({
        received: true,
        ignored: true,
        reason: `Illegal transition ${from} -> ${nextStatus}`,
      });
    }

    // Compare-and-set using updateMany to check affected rows (prevents concurrent double-processing)
    const race = { result: 'ok' as string };

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updateResult = await tx.transaction.updateMany({
        where: { id: transactionId, status: from },
        data: {
          status: nextStatus,
          addispayTransactionRef: providerReference ?? current.addispayTransactionRef,
          addispayRawPayload: rawPayload,
          updatedAt: new Date(),
          confirmedAt: nextStatus === 'SUCCESS' ? new Date() : current.confirmedAt,
        },
      });

      if (updateResult.count === 0) {
        // Lost the race — re-read actual status to distinguish idempotent vs conflict
        const fresh = await tx.transaction.findUnique({
          where: { id: transactionId },
          select: { status: true },
        });
        const actualStatus = fresh?.status;

        if (actualStatus === nextStatus) {
          race.result = 'idempotent';
        } else {
          console.warn(
            JSON.stringify({
              event: 'webhook_race_conflict',
              timestamp: new Date().toISOString(),
              transactionId,
              attemptedTransition: `${from} -> ${nextStatus}`,
              actualStatus,
              eventId,
              source: `webhook_${provider.toLowerCase()}`,
            })
          );
          race.result = 'conflict';
        }
      }

      await tx.webhookEvent.update({
        where: { provider_providerEventId: { provider, providerEventId: eventId } },
        data: { processed: true },
      });
    });

    if (race.result === 'idempotent') {
      return res.json({ received: true, ignored: true, reason: 'Already in target status (idempotent)' });
    }
    if (race.result === 'conflict') {
      return res.json({ received: true, ignored: true, reason: 'Race conflict — see server logs for details' });
    }

    console.log(
      JSON.stringify({
        event: 'transaction_state_change',
        timestamp: new Date().toISOString(),
        transactionId,
        oldStatus: from,
        newStatus: nextStatus,
        source: `webhook_${provider.toLowerCase()}`,
      })
    );

    // If successful payment, broadcast EventSource SSE notification so Driver Soundbox chimes instantly!
    if (nextStatus === 'SUCCESS') {
      const txFull = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { qr: true },
      });
      if (txFull) {
        broadcastPaymentSuccess({
          transactionId: txFull.id,
          driverProfileId: txFull.driverProfileId,
          taxiId: txFull.qr.taxiId,
          amount: Number(txFull.amount),
          currency: txFull.currency,
          seats: 1,
          confirmedAt: (txFull.confirmedAt || new Date()).toISOString(),
        });
      }
    }

    res.json({ received: true, processed: true, status: nextStatus, provider });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}

// -------------------------------------------------------------
// 1. AddisPay Webhook Callback
// -------------------------------------------------------------
router.post('/addispay', async (req: Request, res: Response) => {
  const rawBody = JSON.stringify(req.body);
  const signature = req.header('x-addispay-signature') || null;

  if (!providers.ADDISPAY.verifyWebhook(signature, rawBody)) {
    return res.status(401).json({ error: 'Invalid AddisPay webhook signature.' });
  }

  const body = req.body;
  await processWebhookTransition({
    provider: 'ADDISPAY',
    eventId: body.eventId || `evt-adsp-${Date.now()}`,
    transactionId: body.transactionId,
    nextStatus: body.status,
    providerReference: body.providerReference,
    eventType: body.eventType,
    rawPayload: rawBody,
    res,
  });
});

// -------------------------------------------------------------
// 2. Ethio Telecom Telebirr Webhook Callback
// -------------------------------------------------------------
router.post('/telebirr', async (req: Request, res: Response) => {
  const rawBody = JSON.stringify(req.body);
  const signature = req.header('x-telebirr-signature') || null;

  if (!providers.TELEBIRR.verifyWebhook(signature, rawBody)) {
    return res.status(401).json({ error: 'Invalid Telebirr webhook signature.' });
  }

  const body = req.body;
  // Telebirr typically passes outTradeNo (or transactionId) and tradeStatus
  const transactionId = body.transactionId || body.outTradeNo;
  const statusRaw = String(body.tradeStatus || body.status || 'SUCCESS').toUpperCase();
  const nextStatus = statusRaw === 'PAY_SUCCESS' || statusRaw === 'SUCCESS' ? 'SUCCESS' : 'FAILED';
  const eventId = body.eventId || body.tradeNo || `evt-tlb-${Date.now()}`;

  await processWebhookTransition({
    provider: 'TELEBIRR',
    eventId,
    transactionId,
    nextStatus,
    providerReference: body.tradeNo || body.providerReference || `TLB-${eventId}`,
    eventType: 'TELEBIRR_PAYMENT',
    rawPayload: rawBody,
    res,
  });
});

// -------------------------------------------------------------
// 3. Chapa Webhook Callback (Telebirr, CBE Birr & Card)
// -------------------------------------------------------------
router.post('/chapa', async (req: Request, res: Response) => {
  const rawBody = JSON.stringify(req.body);
  const signature = req.header('x-chapa-signature') || null;

  if (!providers.CHAPA.verifyWebhook(signature, rawBody)) {
    return res.status(401).json({ error: 'Invalid Chapa webhook signature.' });
  }

  const body = req.body;
  // Chapa tx_ref format: CHP-XXXXXXXX or contains the transactionId
  const transactionId = body.transactionId || body.tx_ref;
  const statusRaw = String(body.status || 'success').toLowerCase();
  const nextStatus = statusRaw === 'success' ? 'SUCCESS' : 'FAILED';
  const eventId = body.eventId || body.reference || `evt-chp-${Date.now()}`;

  await processWebhookTransition({
    provider: 'CHAPA',
    eventId,
    transactionId,
    nextStatus,
    providerReference: body.reference || body.tx_ref,
    eventType: body.event || 'charge.complete',
    rawPayload: rawBody,
    res,
  });
});

// -------------------------------------------------------------
// 4. Commercial Bank of Ethiopia (CBE Birr) Callback
// -------------------------------------------------------------
router.post('/cbe', async (req: Request, res: Response) => {
  const rawBody = JSON.stringify(req.body);
  const signature = req.header('x-cbe-signature') || null;

  if (!providers.CBE_BIRR.verifyWebhook(signature, rawBody)) {
    return res.status(401).json({ error: 'Invalid CBE Birr webhook signature.' });
  }

  const body = req.body;
  const transactionId = body.transactionId || body.reference;
  const nextStatus = String(body.status || 'SUCCESS').toUpperCase();
  const eventId = body.eventId || `evt-cbe-${Date.now()}`;

  await processWebhookTransition({
    provider: 'CBE_BIRR',
    eventId,
    transactionId,
    nextStatus,
    providerReference: body.providerReference || `CBE-${eventId}`,
    eventType: 'CBE_BIRR_PAYMENT',
    rawPayload: rawBody,
    res,
  });
});

export default router;
