import { Router, Response } from 'express';
import { OtpChannel, OtpPurpose } from '../types/enums.js';
import prisma from '../config/database.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createAuditEntry } from '../middleware/audit.js';
import {
  comparePassword,
  createRefreshToken,
  hashPassword,
  incrementFailedLogin,
  resetFailedLogin,
  signAccessToken,
} from '../services/helpers.js';
import { createAndSendOtp, verifyOtp } from '../services/notification.service.js';
import {
  loginSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/schemas.js';
import { sendError, sendSuccess } from '../utils/response.js';

const router = Router();

router.post('/login', validateBody(loginSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { identifier, password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: identifier }, { phone: identifier }, { email: identifier }],
    },
    include: { member: true },
  });

  if (!user) {
    sendError(res, 'auth.loginFailed', lang, 401);
    return;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    sendError(res, 'auth.accountLocked', lang, 403);
    return;
  }

  if (!user.isActive) {
    sendError(res, 'auth.accountInactive', lang, 403);
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    await incrementFailedLogin(user.id);
    sendError(res, 'auth.loginFailed', lang, 401);
    return;
  }

  if (user.role === 'MEMBER' && user.member?.status !== 'APPROVED') {
    sendError(res, 'auth.accountInactive', lang, 403);
    return;
  }

  await resetFailedLogin(user.id);

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = await createRefreshToken(user.id);

  await createAuditEntry(user.id, 'LOGIN', 'auth', {}, req.ip);

  // Get profile picture for admin/auditor from system settings
  let profilePicture: string | null = null;
  if (user.role !== 'MEMBER') {
    const avatarSetting = await prisma.systemSetting.findUnique({
      where: { key: `user_avatar_${user.id}` },
    });
    profilePicture = avatarSetting?.value || null;
  }

  sendSuccess(
    res,
    {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        mustChangePassword: user.mustChangePassword,
        profilePicture: user.role !== 'MEMBER' ? profilePicture : undefined,
        member: user.member
          ? {
              id: user.member.id,
              memberId: user.member.memberId,
              fullName: user.member.fullName,
              status: user.member.status,
              profilePicture: user.member.profilePicture,
            }
          : null,
      },
    },
    'auth.loginSuccess',
    lang
  );
});

router.post('/verify-otp', validateBody(verifyOtpSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { userId, code, purpose } = req.body;

  const valid = await verifyOtp(userId, code, purpose as OtpPurpose);
  if (!valid) {
    sendError(res, 'auth.otpInvalid', lang, 400);
    return;
  }

  if (purpose === 'ACCOUNT_VERIFICATION') {
    await prisma.user.update({ where: { id: userId }, data: { isVerified: true } });
  }

  sendSuccess(res, { verified: true }, 'auth.otpVerified', lang);
});

router.post('/request-otp', async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { identifier, purpose, channel } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ phone: identifier }, { email: identifier }],
    },
  });

  if (!user) {
    sendError(res, 'general.notFound', lang, 404);
    return;
  }

  const destination = channel === 'EMAIL' ? user.email : user.phone;
  if (!destination) {
    sendError(res, 'general.error', lang, 400);
    return;
  }

  await createAndSendOtp(user.id, purpose, channel as OtpChannel, destination);
  sendSuccess(res, { userId: user.id }, 'auth.otpSent', lang);
});

router.post('/reset-password', validateBody(resetPasswordSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { userId, code, newPassword } = req.body;

  const valid = await verifyOtp(userId, code, OtpPurpose.PASSWORD_RESET);
  if (!valid) {
    sendError(res, 'auth.otpInvalid', lang, 400);
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  sendSuccess(res, null, 'auth.passwordReset', lang);
});

router.post('/change-password', authenticate, validateBody(changePasswordSchema), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const userId = req.user?.userId;
  if (!userId) {
    sendError(res, 'auth.unauthorized', lang, 401);
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    sendError(res, 'general.notFound', lang, 404);
    return;
  }

  const valid = await comparePassword(req.body.currentPassword, user.passwordHash);
  if (!valid) {
    sendError(res, 'auth.loginFailed', lang, 401);
    return;
  }

  const passwordHash = await hashPassword(req.body.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: false } });

  sendSuccess(res, null, 'auth.passwordReset', lang);
});

router.post('/logout', async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  const { refreshToken } = req.body;

  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  if (req.user) {
    await createAuditEntry(req.user.userId, 'LOGOUT', 'auth', {}, req.ip);
  }

  sendSuccess(res, null, 'auth.logoutSuccess', lang);
});

export default router;
