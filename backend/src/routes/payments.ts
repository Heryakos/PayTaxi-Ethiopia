import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { resolveFare } from '../services/fares';
import { paymentProvider } from '../services/provider';
import { prisma } from '../db/prisma';

const router = Router();

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many payment requests, please try again later' }
});

router.post('/initiate', paymentLimiter, requireAuth, requireRole('PASSENGER'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { taxiId, farePresetId, returnUrl } = req.body;

    if (!taxiId || !farePresetId) {
      return res.status(400).json({ error: 'taxiId and farePresetId are required' });
    }

    const fare = resolveFare(farePresetId);
    if (!fare) {
      return res.status(400).json({ error: 'Unknown fare preset' });
    }

    const qr = await prisma.taxiQr.findFirst({
      where: {
        taxiId,
        status: 'ACTIVE',
        driverProfile: {
          verificationStatus: 'APPROVED'
        }
      },
      include: { driverProfile: true }
    });

    if (!qr) {
      return res.status(409).json({ error: 'This taxi QR is inactive or its driver is not approved.' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        taxiQrId: qr.id,
        driverProfileId: qr.driverProfileId,
        passengerUserId: userId,
        amount: fare.amount,
        currency: fare.currency,
        status: 'PENDING'
      }
    });

    const result = await paymentProvider.initiatePayment({
      transactionId: transaction.id,
      amount: fare.amount,
      currency: fare.currency,
      taxiId,
      returnUrl,
    });

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        addispayTransactionRef: result.providerReference,
        updatedAt: new Date()
      }
    });

    console.log(JSON.stringify({
      event: 'transaction_state_change',
      timestamp: new Date().toISOString(),
      transactionId: transaction.id,
      oldStatus: null,
      newStatus: 'PENDING',
      source: 'initiate_payment'
    }));

    res.json({ transactionId: transaction.id, fare, ...result });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;