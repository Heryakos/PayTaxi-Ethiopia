import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import QRCode from 'qrcode';
import {
  requestOtp,
  verifyOtp,
  verifyDriverPin,
  createQrLoginSession,
  checkQrLoginSession,
  approveQrLoginSession
} from '../services/auth.service';
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../db/prisma';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';

const IS_PROD = process.env.NODE_ENV === 'production';

// Cookie options:
// - Production (cross-domain e.g. Vercel frontend + Render backend): sameSite: 'none', secure: true
// - Development (localhost): sameSite: 'lax', secure: false
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? ('none' as const) : ('lax' as const),
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many OTP requests from this IP, please try again after 15 minutes' }
});

router.post('/request-otp', otpLimiter, async (req, res) => {
  try {
    const { phone, role } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone is required' });
    }
    const resolvedRole =
      role === 'DRIVER'
        ? 'DRIVER'
        : role === 'ADMIN'
        ? 'ADMIN'
        : role === 'MANAGER'
        ? 'MANAGER'
        : 'PASSENGER';

    const result = await requestOtp(phone, resolvedRole);
    // In dev / test mode, we return the code in result
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { challengeId, code } = req.body;
    if (!challengeId || !code) {
      return res.status(400).json({ error: 'challengeId and code are required' });
    }
    const { user, token } = await verifyOtp(challengeId, code);

    // Set httpOnly cookie for web clients
    res.cookie('token', token, COOKIE_OPTIONS);

    // Also return token in body for mobile clients that use Bearer header
    res.json({ user, token });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Driver backup PIN login fallback (when SMS fails or network is congested)
router.post('/login-pin', async (req, res) => {
  try {
    const { phone, pin } = req.body;
    if (!phone || !pin) {
      return res.status(400).json({ error: 'Phone and Driver Backup PIN are required' });
    }
    const { user, token } = await verifyDriverPin(phone, pin);

    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ user, token });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Create a WhatsApp-style QR login session
router.post('/qr-session', async (req, res) => {
  try {
    const session = await createQrLoginSession();
    const qrPayload = JSON.stringify({
      type: 'PAYTAXI_LOGIN',
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 260 });
    res.json({ token: session.token, qrDataUrl, expiresAt: session.expiresAt });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Poll QR login session status
router.get('/qr-session/:token', async (req, res) => {
  try {
    const token = String(req.params.token);
    const result = await checkQrLoginSession(token);
    if (result.status === 'APPROVED' && result.token) {
      res.cookie('token', result.token, COOKIE_OPTIONS);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Approve QR login session from a mobile app or signed-in session
router.post('/qr-session/:token/approve', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const token = String(req.params.token);
    const result = await approveQrLoginSession(token, req.user!.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// GET /auth/me — returns session user from cookie or Bearer token, no body needed
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.appUser.findUnique({
      where: { id: req.user!.id },
      select: { id: true, phone: true, role: true, name: true, isVerified: true, createdAt: true }
    });
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST /auth/logout — clears the cookie
router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ ok: true });
});

export default router;