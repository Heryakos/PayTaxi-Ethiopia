import { Router } from 'express';
import { prisma } from '../db/prisma';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { getAllSettings, updateSystemSettings } from '../services/settings.service';

const router = Router();

// Middleware: all routes require at least authentication
router.use(requireAuth);

// -------------------------------------------------------------
// Manager & Admin Shared Routes (Financial Analytics & Ledger)
// -------------------------------------------------------------

// GET /admin/reports — Key Performance Indicators & Financial Analytics
router.get('/reports', requireRole('MANAGER'), async (req: AuthenticatedRequest, res) => {
  try {
    const [
      totalSuccessTransactions,
      allTransactionsCount,
      totalDrivers,
      pendingDrivers,
      activeTaxis,
      recentTransactions,
    ] = await Promise.all([
      prisma.transaction.findMany({
        where: { status: 'SUCCESS' },
        select: { amount: true, createdAt: true },
      }),
      prisma.transaction.count(),
      prisma.driverProfile.count(),
      prisma.driverProfile.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.taxiQr.count({ where: { status: 'ACTIVE' } }),
      prisma.transaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          qr: { select: { taxiId: true } },
          driverProfile: { select: { displayName: true, plateNumber: true } },
          passengerUser: { select: { phone: true, name: true } },
        },
      }),
    ]);

    const grossRevenue = totalSuccessTransactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    // Platform fee calculation (e.g. 2.5%)
    const commissionPercent = 2.5;
    const platformCommission = Number(((grossRevenue * commissionPercent) / 100).toFixed(2));
    const driverNetPayouts = Number((grossRevenue - platformCommission).toFixed(2));
    const averageFare =
      totalSuccessTransactions.length > 0
        ? Number((grossRevenue / totalSuccessTransactions.length).toFixed(2))
        : 0;

    res.json({
      metrics: {
        grossRevenue,
        platformCommission,
        driverNetPayouts,
        completedRides: totalSuccessTransactions.length,
        totalAttempts: allTransactionsCount,
        averageFare,
        totalDrivers,
        pendingDrivers,
        activeTaxis,
      },
      recentTransactions,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /admin/transactions — Ledger with filtering
router.get('/transactions', requireRole('MANAGER'), async (req: AuthenticatedRequest, res) => {
  try {
    const { status, taxiId, search, limit = '50' } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = String(status);
    }
    if (taxiId) {
      where.qr = { taxiId: String(taxiId) };
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { qr: { taxiId: { contains: q } } },
        { driverProfile: { displayName: { contains: q } } },
        { driverProfile: { plateNumber: { contains: q } } },
        { addispayTransactionRef: { contains: q } },
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      take: Math.min(Number(limit) || 50, 100),
      orderBy: { createdAt: 'desc' },
      include: {
        qr: { select: { taxiId: true, backupCode: true } },
        driverProfile: { select: { displayName: true, plateNumber: true, vehicleMake: true, vehicleModel: true } },
        passengerUser: { select: { phone: true, name: true } },
      },
    });

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// -------------------------------------------------------------
// Admin Exclusive Routes (Settings, User Management, Fleet Config)
// -------------------------------------------------------------

// GET /admin/settings — View all system configurations
router.get('/settings', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const settings = await getAllSettings();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /admin/settings — Update live system configuration (No code change needed!)
router.put('/settings', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { updates } = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Valid updates object is required' });
    }

    await updateSystemSettings(updates);
    const updated = await getAllSettings();
    res.json({ success: true, settings: updated });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /admin/users — List all users with filtering
router.get('/users', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const { role, search, limit = '50' } = req.query;

    const where: any = {};
    if (role && role !== 'ALL') {
      where.role = String(role);
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { phone: { contains: q } },
        { name: { contains: q } },
      ];
    }

    const users = await prisma.appUser.findMany({
      where,
      take: Math.min(Number(limit) || 50, 100),
      orderBy: { createdAt: 'desc' },
      include: {
        driverProfile: {
          include: {
            qrs: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// PUT /admin/users/:id — Edit user profile & role
router.put('/users/:id', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const { name, phone, role, isVerified } = req.body;

    const validRoles = ['PASSENGER', 'DRIVER', 'MANAGER', 'ADMIN'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const updated = await prisma.appUser.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(role !== undefined && { role }),
        ...(isVerified !== undefined && { isVerified }),
      },
    });

    res.json({ user: updated });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PUT /admin/drivers/:driverProfileId/backup-code — Update Driver Backup PIN / Security Code
router.put('/drivers/:driverProfileId/backup-code', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const driverProfileId = String(req.params.driverProfileId);
    const { backupCode } = req.body;

    if (!backupCode || typeof backupCode !== 'string') {
      return res.status(400).json({ error: 'backupCode string is required' });
    }

    const updatedQrs = await prisma.taxiQr.updateMany({
      where: { driverProfileId, status: 'ACTIVE' },
      data: { backupCode: backupCode.trim().toUpperCase() },
    });

    res.json({ success: true, updatedCount: updatedQrs.count, backupCode: backupCode.trim().toUpperCase() });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
