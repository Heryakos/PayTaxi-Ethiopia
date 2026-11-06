import { randomBytes, randomInt, createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';
const OTP_MINUTES = 10;

export function normalizePhone(phone: string) {
  const digits = phone.replace(/[^0-9+]/g, '');
  if (!/^\+?[0-9]{9,15}$/.test(digits)) throw new Error('Enter a valid phone number');
  return digits.startsWith('+') ? digits : `+${digits}`;
}

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export async function requestOtp(phoneInput: string, role: string) {
  const phone = normalizePhone(phoneInput);
  const code = randomInt(100000, 1000000).toString();
  const id = randomBytes(16).toString('hex');
  
  await prisma.otpChallenge.create({
    data: {
      id,
      phone,
      role,
      codeHash: hash(code),
      expiresAt: new Date(Date.now() + OTP_MINUTES * 60_000),
    }
  });

  console.log(`[v0] PayTaxi OTP for ${phone}: ${code}`);
  return { challengeId: id, code, expiresInSeconds: OTP_MINUTES * 60 };
}

export async function verifyOtp(challengeId: string, code: string) {
  const challenge = await prisma.otpChallenge.findUnique({
    where: { id: challengeId }
  });

  if (!challenge || challenge.consumedAt || challenge.expiresAt <= new Date()) {
    throw new Error('OTP expired or invalid');
  }
  
  if (challenge.attempts >= 5) {
    throw new Error('Too many attempts');
  }

  if (hash(code) !== challenge.codeHash) {
    await prisma.otpChallenge.update({
      where: { id: challengeId },
      data: { attempts: challenge.attempts + 1 }
    });
    throw new Error('Incorrect OTP');
  }

  await prisma.otpChallenge.update({
    where: { id: challengeId },
    data: { consumedAt: new Date() }
  });

  let user = await prisma.appUser.findUnique({
    where: { phone: challenge.phone }
  });

  if (!user) {
    user = await prisma.appUser.create({
      data: {
        phone: challenge.phone,
        role: challenge.role,
        isVerified: true
      }
    });
  } else {
    if (user.role !== challenge.role && user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw new Error('This phone is registered for another role');
    }
    user = await prisma.appUser.update({
      where: { id: user.id },
      data: { isVerified: true }
    });
  }

  // Generate JWT access token
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  return { user, token };
}

export async function verifyDriverPin(phoneInput: string, pinInput: string) {
  const phone = normalizePhone(phoneInput);
  const cleanPin = pinInput.trim().toUpperCase();

  const user = await prisma.appUser.findUnique({
    where: { phone },
    include: {
      driverProfile: {
        include: {
          qrs: {
            where: { status: 'ACTIVE' },
          },
        },
      },
    },
  });

  if (!user || user.role !== 'DRIVER' || !user.driverProfile) {
    throw new Error('No driver account found with this phone number');
  }

  const activeQr = user.driverProfile.qrs[0];
  const validBackupCode = activeQr?.backupCode?.toUpperCase();

  // Allow ABCD1234 or the driver's registered backupCode or 123456
  const isMatch = validBackupCode && cleanPin === validBackupCode;
  const isDefaultFallback = cleanPin === 'ABCD1234' || cleanPin === '123456';

  if (!isMatch && !isDefaultFallback) {
    throw new Error('Invalid Driver Backup PIN / Security Code');
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  return { user, token };
}

export async function createQrLoginSession() {
  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 5 * 60_000); // 5 minutes

  const session = await prisma.qrLoginSession.create({
    data: {
      token,
      expiresAt,
      status: 'PENDING',
    },
  });

  return { token: session.token, expiresAt: session.expiresAt };
}

export async function checkQrLoginSession(token: string) {
  const session = await prisma.qrLoginSession.findUnique({
    where: { token },
  });

  if (!session || session.expiresAt <= new Date()) {
    return { status: 'EXPIRED' };
  }

  if (session.status === 'APPROVED' && session.userId && session.jwtToken) {
    const user = await prisma.appUser.findUnique({
      where: { id: session.userId },
    });
    return { status: 'APPROVED', user, token: session.jwtToken };
  }

  return { status: session.status };
}

export async function approveQrLoginSession(token: string, userId: string) {
  const session = await prisma.qrLoginSession.findUnique({
    where: { token },
  });

  if (!session || session.expiresAt <= new Date()) {
    throw new Error('QR login session expired or invalid');
  }

  const user = await prisma.appUser.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const jwtToken = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  await prisma.qrLoginSession.update({
    where: { token },
    data: {
      status: 'APPROVED',
      userId: user.id,
      jwtToken,
    },
  });

  return { success: true };
}
