import { Router } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { registerDriver, getDriverForUser, approveDriver } from '../services/drivers.service';

const router = Router();

router.post('/register', requireAuth, requireRole('DRIVER'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { name, vehicleMake, vehicleModel, vehicleColor, plateNumber, nationalIdUrl, licenseUrl } = req.body;
    
    const required = ["name", "vehicleMake", "vehicleModel", "vehicleColor", "plateNumber"];
    for (const key of required) {
      if (!req.body[key] || String(req.body[key]).trim().length === 0) {
        return res.status(400).json({ error: `${key} is required` });
      }
    }

    // In Next.js v0 it simulated phone from user but since we don't have phone in token we just pass empty or fetch it
    const result = await registerDriver({
      userId,
      name,
      phone: '', // Can be fetched from user table if needed
      vehicleMake,
      vehicleModel,
      vehicleColor,
      plateNumber,
      nationalIdUrl,
      licenseUrl,
    });

    res.json({ driver: result.profile });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/profile', requireAuth, requireRole('DRIVER'), async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getDriverForUser(req.user!.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json({ profile });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Admin action
router.post('/:id/approve', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await approveDriver(req.params.id as string);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;