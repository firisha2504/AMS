import { Router, Response } from 'express';
import prisma from '../config/database.js';
import { AuthRequest, authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// Get all team members and leaders (Public)
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

// Upload image file for leader or team member (Admin only)
router.post('/upload', authenticate, authorize('ADMIN'), upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      sendError(res, 'No image file uploaded', 'om', 400);
      return;
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    sendSuccess(res, { imageUrl }, 'general.success', 'om');
  } catch (error) {
    sendError(res, 'general.error', 'om', 500);
  }
});

// Save team members and leaders (Admin only)
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
