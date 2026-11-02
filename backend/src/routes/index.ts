import { Router } from 'express';
import authRoutes from './auth.routes.js';
import membersRoutes from './members.routes.js';
import paymentsRoutes from './payments.routes.js';
import paymentRequestsRoutes from './payment-requests.routes.js';
import penaltiesRoutes from './penalties.routes.js';
import financeRoutes from './finance.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import settingsRoutes from './settings.routes.js';
import specialContributionsRoutes from './special-contributions.routes.js';
import publicRoutes from './public.routes.js';
import teamRoutes from './team.routes.js';
import joiningObligationsRoutes from './joining-obligations.routes.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/members', membersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/payment-requests', paymentRequestsRoutes);
router.use('/penalties', penaltiesRoutes);
router.use('/finance', financeRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/special-contributions', specialContributionsRoutes);
router.use('/public', publicRoutes);
router.use('/team', teamRoutes);
router.use('/joining-obligations', joiningObligationsRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'AMS API', timestamp: new Date().toISOString() });
});

export default router;
