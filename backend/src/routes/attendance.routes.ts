import { Router, Response } from 'express';
import prisma from '../config/database.js';
import { AuthRequest, authenticate, authorize } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import {
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeeting,
  cancelMeeting,
  closeMeeting,
  generateOrGetQRSession,
  pauseQRSession,
  resumeQRSession,
  closeQRSession,
  regenerateQRSession,
  recordQRScanAttendance,
  recordManualAttendance,
  correctAttendanceRecord,
  getAttendanceRecords,
  getAttendanceAnalytics,
  getMemberAttendanceHistory,
  getAttendanceSettings,
  updateAttendanceSettings,
} from '../services/attendance.service.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// 1. ATTENDANCE DASHBOARD & ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/dashboard', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const data = await getAttendanceAnalytics();
    sendSuccess(res, data, 'general.success', lang);
  } catch (error: any) {
    console.error('Attendance dashboard error:', error);
    sendError(res, error.message || 'general.error', lang, 500);
  }
});

router.get('/analytics', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const data = await getAttendanceAnalytics();
    sendSuccess(res, data, 'general.success', lang);
  } catch (error: any) {
    console.error('Attendance analytics error:', error);
    sendError(res, error.message || 'general.error', lang, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. MEETING MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

router.get('/meetings', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const { status, meetingType, search, page, limit } = req.query;
    const p = Math.max(1, parseInt(String(page || 1), 10));
    const l = Math.min(100, Math.max(1, parseInt(String(limit || 50), 10)));
    const offset = (p - 1) * l;

    const result = await getMeetings({
      status: status ? String(status) : undefined,
      meetingType: meetingType ? String(meetingType) : undefined,
      search: search ? String(search) : undefined,
      limit: l,
      offset,
    });

    sendSuccess(res, { ...result, page: p, limit: l }, 'general.success', lang);
  } catch (error: any) {
    console.error('Get meetings error:', error);
    sendError(res, error.message || 'general.error', lang, 500);
  }
});

router.post('/meetings', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const { title, description, meetingType, ethiopianDate, meetingDate, startTime, endTime, location, eligibleMemberType } = req.body;
    if (!title || (!meetingDate && !ethiopianDate)) {
      sendError(res, 'Title and Meeting Date are required', lang, 400);
      return;
    }

    const meeting = await createMeeting(
      {
        title,
        description,
        meetingType,
        ethiopianDate,
        meetingDate,
        startTime,
        endTime,
        location,
        eligibleMemberType,
      },
      req.user!.userId,
      req.ip
    );

    sendSuccess(res, meeting, lang === 'en' ? 'Meeting created successfully' : 'Walgahiin milkaa\'inaan uumameera', lang, 201);
  } catch (error: any) {
    console.error('Create meeting error:', error);
    sendError(res, error.message || 'general.error', lang, 400);
  }
});

router.get('/meetings/:id', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const meeting = await getMeetingById(String(req.params.id));
    if (!meeting) {
      sendError(res, 'Meeting not found', lang, 404);
      return;
    }
    sendSuccess(res, meeting, 'general.success', lang);
  } catch (error: any) {
    console.error('Get meeting error:', error);
    sendError(res, error.message || 'general.error', lang, 500);
  }
});

router.put('/meetings/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const updated = await updateMeeting(String(req.params.id), req.body, req.user!.userId, req.ip);
    sendSuccess(res, updated, lang === 'en' ? 'Meeting updated successfully' : 'Walgahiin haaromsameera', lang);
  } catch (error: any) {
    console.error('Update meeting error:', error);
    sendError(res, error.message || 'general.error', lang, 400);
  }
});

router.post('/meetings/:id/cancel', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const cancelled = await cancelMeeting(String(req.params.id), req.user!.userId, req.ip);
    sendSuccess(res, cancelled, lang === 'en' ? 'Meeting cancelled' : 'Walgahiin haqameera', lang);
  } catch (error: any) {
    console.error('Cancel meeting error:', error);
    sendError(res, error.message || 'general.error', lang, 400);
  }
});

router.post('/meetings/:id/close', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const closed = await closeMeeting(String(req.params.id), req.user!.userId, req.ip);
    sendSuccess(res, closed, lang === 'en' ? 'Meeting closed and attendance finalized' : 'Walgahiin cufamee argamni xumurameera', lang);
  } catch (error: any) {
    console.error('Close meeting error:', error);
    sendError(res, error.message || 'general.error', lang, 400);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. QR SESSIONS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/meetings/:id/qr-session', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const meetingId = String(req.params.id);
    const data = await generateOrGetQRSession(meetingId, req.user!.userId);
    sendSuccess(res, data, 'general.success', lang);
  } catch (error: any) {
    console.error('Get QR session error:', error);
    sendError(res, error.message || 'general.error', lang, 400);
  }
});

router.post('/meetings/:id/qr-session', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const meetingId = String(req.params.id);
    const durationMinutes = req.body.durationMinutes ? Number(req.body.durationMinutes) : undefined;
    const sessionData = await generateOrGetQRSession(meetingId, req.user!.userId, durationMinutes);
    sendSuccess(res, sessionData, 'general.success', lang);
  } catch (error: any) {
    console.error('Generate QR session error:', error);
    sendError(res, error.message || 'general.error', lang, 400);
  }
});

router.post('/meetings/:id/qr-session/pause', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const paused = await pauseQRSession(String(req.params.id), req.user!.userId);
    sendSuccess(res, paused, lang === 'en' ? 'QR session paused' : 'Yeroon QR yeroof dhaabbateera', lang);
  } catch (error: any) {
    console.error('Pause QR session error:', error);
    sendError(res, error.message || 'general.error', lang, 400);
  }
});

router.post('/meetings/:id/qr-session/resume', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const resumed = await resumeQRSession(String(req.params.id), req.user!.userId);
    sendSuccess(res, resumed, lang === 'en' ? 'QR session resumed' : 'Yeroon QR itti fufeera', lang);
  } catch (error: any) {
    console.error('Resume QR session error:', error);
    sendError(res, error.message || 'general.error', lang, 400);
  }
});

router.post('/meetings/:id/qr-session/close', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const closed = await closeQRSession(String(req.params.id), req.user!.userId);
    sendSuccess(res, closed, lang === 'en' ? 'QR session closed' : 'Yeroon QR cufameera', lang);
  } catch (error: any) {
    console.error('Close QR session error:', error);
    sendError(res, error.message || 'general.error', lang, 400);
  }
});

router.post('/meetings/:id/qr-session/regenerate', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const durationMinutes = req.body.durationMinutes ? Number(req.body.durationMinutes) : undefined;
    const sessionData = await regenerateQRSession(String(req.params.id), req.user!.userId, durationMinutes);
    sendSuccess(res, sessionData, lang === 'en' ? 'QR code regenerated successfully' : 'Koodiin QR haaraan uumameera', lang);
  } catch (error: any) {
    console.error('Regenerate QR session error:', error);
    sendError(res, error.message || 'general.error', lang, 400);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. ATTENDANCE SCAN & CHECK-IN
// ─────────────────────────────────────────────────────────────────────────────

router.post('/scan', authenticate, authorize('MEMBER'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const { token, qrCode, code, sessionId, meetingId } = req.body;
    const rawToken = token || qrCode || code;

    if (!rawToken) {
      sendError(res, lang === 'en' ? 'QR code token is required' : 'Koodiin QR dirqama', lang, 400);
      return;
    }

    const result = await recordQRScanAttendance(
      req.user!.userId,
      rawToken,
      sessionId,
      meetingId,
      req.ip
    );

    sendSuccess(res, result, result.message, lang);
  } catch (error: any) {
    console.error('Scan attendance error:', error);
    sendError(res, error.message || 'Failed to record attendance', lang, 400);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. ATTENDANCE RECORDS & CORRECTIONS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/records', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const { meetingId, memberId, status, source, search, page, limit } = req.query;
    const p = Math.max(1, parseInt(String(page || 1), 10));
    const l = Math.min(100, Math.max(1, parseInt(String(limit || 50), 10)));
    const offset = (p - 1) * l;

    const result = await getAttendanceRecords({
      meetingId: meetingId ? String(meetingId) : undefined,
      memberId: memberId ? String(memberId) : undefined,
      status: status ? String(status) : undefined,
      source: source ? String(source) : undefined,
      search: search ? String(search) : undefined,
      limit: l,
      offset,
    });

    sendSuccess(res, { ...result, page: p, limit: l }, 'general.success', lang);
  } catch (error: any) {
    console.error('Get attendance records error:', error);
    sendError(res, error.message || 'general.error', lang, 500);
  }
});

// Alias for `/records`
router.get('/', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const { meetingId, memberId, status, source, search, page, limit } = req.query;
    const p = Math.max(1, parseInt(String(page || 1), 10));
    const l = Math.min(100, Math.max(1, parseInt(String(limit || 50), 10)));
    const offset = (p - 1) * l;

    const result = await getAttendanceRecords({
      meetingId: meetingId ? String(meetingId) : undefined,
      memberId: memberId ? String(memberId) : undefined,
      status: status ? String(status) : undefined,
      source: source ? String(source) : undefined,
      search: search ? String(search) : undefined,
      limit: l,
      offset,
    });

    sendSuccess(res, { ...result, page: p, limit: l }, 'general.success', lang);
  } catch (error: any) {
    console.error('Get attendance error:', error);
    sendError(res, error.message || 'general.error', lang, 500);
  }
});

router.post('/manual', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const { meetingId, records, memberId, status, remarks } = req.body;
    if (!meetingId) {
      sendError(res, 'Meeting ID is required', lang, 400);
      return;
    }

    let recordsToProcess: Array<{ memberId: string; status: any; remarks?: string }> = [];
    if (Array.isArray(records) && records.length > 0) {
      recordsToProcess = records;
    } else if (memberId && status) {
      recordsToProcess = [{ memberId, status, remarks }];
    } else {
      sendError(res, 'Member ID and status or records array are required', lang, 400);
      return;
    }

    const saved = await recordManualAttendance(meetingId, recordsToProcess, req.user!.userId, req.ip);
    sendSuccess(res, saved, lang === 'en' ? 'Attendance recorded successfully' : 'Argamni milkaa\'inaan galmaa\'eera', lang);
  } catch (error: any) {
    console.error('Record manual attendance error:', error);
    sendError(res, error.message || 'general.error', lang, 400);
  }
});

router.put('/:id/correct', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const { status, reason, remarks } = req.body;
    if (!status || !reason) {
      sendError(res, 'New status and reason are mandatory for attendance correction', lang, 400);
      return;
    }

    const result = await correctAttendanceRecord(String(req.params.id), status, reason, req.user!.userId, remarks);
    sendSuccess(res, result, lang === 'en' ? 'Attendance record corrected successfully' : 'Galmeen argamnaa sirreeffameera', lang);
  } catch (error: any) {
    console.error('Correct attendance error:', error);
    sendError(res, error.message || 'general.error', lang, 400);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. MEMBER PERSONAL ATTENDANCE HISTORY
// ─────────────────────────────────────────────────────────────────────────────

router.get('/my', authenticate, authorize('MEMBER'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const member = await prisma.member.findFirst({
      where: { userId: req.user!.userId },
    });

    if (!member) {
      sendError(res, 'Member not found', lang, 404);
      return;
    }

    const data = await getMemberAttendanceHistory(member.id);
    sendSuccess(res, data, 'general.success', lang);
  } catch (error: any) {
    console.error('Member attendance history error:', error);
    sendError(res, error.message || 'general.error', lang, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. ATTENDANCE SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/settings', authenticate, authorize('ADMIN', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const settings = await getAttendanceSettings();
    sendSuccess(res, settings, 'general.success', lang);
  } catch (error: any) {
    console.error('Get attendance settings error:', error);
    sendError(res, error.message || 'general.error', lang, 500);
  }
});

router.put('/settings', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  const lang = req.lang || 'om';
  try {
    const updated = await updateAttendanceSettings(req.body, req.user!.userId, req.ip);
    sendSuccess(res, updated, lang === 'en' ? 'Attendance settings updated' : 'Qindaa\'inni argamnaa haaromsameera', lang);
  } catch (error: any) {
    console.error('Update attendance settings error:', error);
    sendError(res, error.message || 'general.error', lang, 400);
  }
});

export default router;
