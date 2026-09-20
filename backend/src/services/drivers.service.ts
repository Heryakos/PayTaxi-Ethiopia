import { prisma } from '../db/prisma';

export async function getDriverForUser(userId: string) {
  return await prisma.driverProfile.findUnique({
    where: { userId }
  });
}

export async function registerDriver(input: {
  userId: string;
  name: string;
  phone: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  plateNumber: string;
  nationalIdUrl?: string;
  licenseUrl?: string;
}) {
  const existing = await getDriverForUser(input.userId);
  if (existing) {
    throw new Error('A driver profile already exists for this account');
  }

  let profile = await prisma.driverProfile.create({
    data: {
      userId: input.userId,
      displayName: input.name.trim(),
      vehicleMake: input.vehicleMake.trim(),
      vehicleModel: input.vehicleModel.trim(),
      vehicleColor: input.vehicleColor.trim(),
      plateNumber: input.plateNumber.trim().toUpperCase(),
      nationalIdUrl: input.nationalIdUrl || 'mock://id-upload',
      licenseUrl: input.licenseUrl || 'mock://license-upload',
      verificationStatus: 'PENDING',
    }
  });

  return { profile };
}

export async function approveDriver(driverId: string) {
  let profile = await prisma.driverProfile.update({
    where: { id: driverId },
    data: { verificationStatus: 'APPROVED' }
  });

  const taxiId = `TX-${Math.floor(1000 + Math.random() * 8999)}`;
  const backupCode = Math.random().toString(36).slice(2, 10).toUpperCase();

  const qr = await prisma.taxiQr.create({
    data: {
      taxiId,
      driverProfileId: profile.id,
      status: 'ACTIVE',
      qrPayloadUrl: `/t/${taxiId}`,
      backupCode,
    }
  });

  return { profile, qr };
}

export async function replaceLostQr(driverProfileId: string) {
  const driver = await prisma.driverProfile.findUnique({ where: { id: driverProfileId } });
  if (!driver || driver.verificationStatus !== 'APPROVED') {
    throw new Error('Only approved drivers can replace a QR');
  }

  const current = await prisma.taxiQr.findFirst({
    where: {
      driverProfileId,
      status: 'ACTIVE'
    }
  });

  if (current) {
    await prisma.taxiQr.update({
      where: { id: current.id },
      data: {
        status: 'REPLACED',
        disabledAt: new Date(),
        disabledReason: 'LOST_OR_STOLEN'
      }
    });
  }

  const taxiId = `TX-${Math.floor(1000 + Math.random() * 8999)}`;
  const qr = await prisma.taxiQr.create({
    data: {
      taxiId,
      driverProfileId,
      status: 'ACTIVE',
      qrPayloadUrl: `/t/${taxiId}`,
      backupCode: Math.random().toString(36).slice(2, 10).toUpperCase()
    }
  });

  return qr;
}

export async function getScopedDashboard(driverProfileId: string) {
  const driver = await prisma.driverProfile.findUnique({ where: { id: driverProfileId } });
  if (!driver) throw new Error('Driver profile not found');

  const qr = await prisma.taxiQr.findFirst({
    where: { driverProfileId },
    orderBy: { createdAt: 'desc' }
  });

  const transactions = await prisma.transaction.findMany({
    where: { driverProfileId },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  const successful = transactions.filter((r) => r.status === 'SUCCESS');
  const total = successful.reduce((sum, r) => sum + Number(r.amount), 0);

  return { driver, qr, transactions, total, count: successful.length };
}
