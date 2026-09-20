import { Router } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { getDriverForUser, getScopedDashboard } from '../services/drivers.service';

const router = Router();

router.get('/', requireAuth, requireRole('DRIVER'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const driver = await getDriverForUser(userId);
    if (!driver) {
      return res.status(400).json({ error: 'No driver profile' });
    }
    const dashboard = await getScopedDashboard(driver.id);
    res.json(dashboard);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;