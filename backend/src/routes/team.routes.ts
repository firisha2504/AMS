import { Router, Response } from 'express';
import prisma from '../config/database.js';
import { AuthRequest, authenticate, authorize } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// Get all team members and leaders
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const team = await prisma.systemSetting.findUnique({
      where: { key: 'team_members' },
    });

    if (!team || !team.value) {
      sendSuccess(res, [], 'general.success', 'om');
      return;
    }

    try {
      const data = JSON.parse(team.value);
      sendSuccess(res, data, 'general.success', 'om');
    } catch {
      sendSuccess(res, [], 'general.success', 'om');
    }
  } catch (error) {
    sendError(res, 'general.error', 'om', 500);
  }
});

// Save team members and leaders (admin only)
router.post('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { members } = req.body;

    if (!Array.isArray(members)) {
      sendError(res, 'Invalid team data', 'om', 400);
      return;
    }

    // Save to system settings
    await prisma.systemSetting.upsert({
      where: { key: 'team_members' },
      create: {
        key: 'team_members',
        value: JSON.stringify(members),
        label: 'Team Members and Leaders',
        labelOm: 'Miseensota Koree fi Dareessota',
      },
      update: {
        value: JSON.stringify(members),
      },
    });

    sendSuccess(res, { saved: true }, 'general.success', 'om');
  } catch (error) {
    sendError(res, 'general.error', 'om', 500);
  }
});

export default router;
