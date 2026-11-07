import crypto from 'crypto';
import QRCode from 'qrcode';
import { AttendanceStatus, AttendanceSource, MeetingType, MeetingStatus, QRSessionStatus } from '@prisma/client';
import prisma from '../config/database.js';
import { createAuditEntry } from '../middleware/audit.js';
import { toEthiopianDate, toGregorianDate, ETHIOPIAN_MONTHS } from './ethiopian-calendar.service.js';

export function parseEthiopianDateString(str: string): { year: number; month: number; day: number } | null {
  if (!str) return null;
  const parts = str.trim().split(/[\s\/-]+/);
  if (parts.length < 3) return null;

  let y: number | null = null;
  let m: number | null = null;
  let d: number | null = null;

  // Case 1: First part is 4-digit year (YYYY-MM-DD)
  if (/^\d{4}$/.test(parts[0])) {
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
    d = parseInt(parts[2], 10);
  }
  // Case 2: Last part is 4-digit year (DD MM YYYY or DD-MM-YYYY)
  else if (/^\d{4}$/.test(parts[2])) {
    y = parseInt(parts[2], 10);
    d = parseInt(parts[0], 10);
    if (/^\d+$/.test(parts[1])) {
      m = parseInt(parts[1], 10);
    } else {
      const monthLower = parts[1].toLowerCase();
      const match = ETHIOPIAN_MONTHS.find(
        (mInfo) =>
          mInfo.nameEn.toLowerCase() === monthLower ||
          mInfo.nameOm.toLowerCase() === monthLower ||
          mInfo.nameAm === parts[1]
      );
      if (match) m = match.number;
    }
  }

  if (y && m && d && !isNaN(y) && !isNaN(m) && !isNaN(d)) {
    return { year: y, month: m, day: d };
  }
  return null;
}

export interface AttendanceSettings {
  earlyCheckInMinutes: number;
  lateThresholdMinutes: number;
  defaultQRExpirationMinutes: number;
}

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  earlyCheckInMinutes: 30,
  lateThresholdMinutes: 15,
  defaultQRExpirationMinutes: 60,
};

/**
 * Retrieve Attendance Settings from SystemSetting table
 */
export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  const [early, late, exp] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: 'attendance_early_checkin_minutes' } }),
    prisma.systemSetting.findUnique({ where: { key: 'attendance_late_threshold_minutes' } }),
    prisma.systemSetting.findUnique({ where: { key: 'attendance_qr_expiration_minutes' } }),
  ]);

  return {
    earlyCheckInMinutes: early ? Number(early.value) : DEFAULT_ATTENDANCE_SETTINGS.earlyCheckInMinutes,
    lateThresholdMinutes: late ? Number(late.value) : DEFAULT_ATTENDANCE_SETTINGS.lateThresholdMinutes,
    defaultQRExpirationMinutes: exp ? Number(exp.value) : DEFAULT_ATTENDANCE_SETTINGS.defaultQRExpirationMinutes,
  };
}

/**
 * Update Attendance Settings
 */
export async function updateAttendanceSettings(
  input: Partial<AttendanceSettings>,
  userId: string,
  ipAddress?: string
): Promise<AttendanceSettings> {
  const current = await getAttendanceSettings();
  const next: AttendanceSettings = {
    earlyCheckInMinutes: input.earlyCheckInMinutes ?? current.earlyCheckInMinutes,
    lateThresholdMinutes: input.lateThresholdMinutes ?? current.lateThresholdMinutes,
    defaultQRExpirationMinutes: input.defaultQRExpirationMinutes ?? current.defaultQRExpirationMinutes,
  };

  await Promise.all([
    prisma.systemSetting.upsert({
      where: { key: 'attendance_early_checkin_minutes' },
      update: { value: String(next.earlyCheckInMinutes) },
      create: { key: 'attendance_early_checkin_minutes', value: String(next.earlyCheckInMinutes), label: 'Early Check-in Minutes' },
    }),
    prisma.systemSetting.upsert({
      where: { key: 'attendance_late_threshold_minutes' },
      update: { value: String(next.lateThresholdMinutes) },
      create: { key: 'attendance_late_threshold_minutes', value: String(next.lateThresholdMinutes), label: 'Late Threshold Minutes' },
    }),
    prisma.systemSetting.upsert({
      where: { key: 'attendance_qr_expiration_minutes' },
      update: { value: String(next.defaultQRExpirationMinutes) },
      create: { key: 'attendance_qr_expiration_minutes', value: String(next.defaultQRExpirationMinutes), label: 'QR Expiration Minutes' },
    }),
  ]);

  await createAuditEntry(userId, 'ATTENDANCE_SETTINGS_UPDATED', 'attendance_settings', { previous: current, updated: next }, ipAddress);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEETING MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateMeetingInput {
  title: string;
  description?: string;
  meetingType?: MeetingType;
  ethiopianDate?: string;
  meetingDate?: string | Date;
  startTime?: string;
  endTime?: string;
  location?: string;
  eligibleMemberType?: string;
}

export async function createMeeting(input: CreateMeetingInput, createdById: string, ipAddress?: string) {
  let gDate: Date;
  let ethFormatted = input.ethiopianDate || '';

  if (input.meetingDate) {
    gDate = new Date(input.meetingDate);
    if (!ethFormatted) {
      const eth = toEthiopianDate(gDate);
      ethFormatted = eth.formattedEth;
    }
  } else if (input.ethiopianDate) {
    const parsed = parseEthiopianDateString(input.ethiopianDate);
    if (parsed) {
      gDate = toGregorianDate(parsed.year, parsed.month, parsed.day);
    } else {
      gDate = new Date();
    }
  } else {
    gDate = new Date();
    const eth = toEthiopianDate(gDate);
    ethFormatted = eth.formattedEth;
  }

  const meeting = await prisma.meeting.create({
    data: {
      title: input.title,
      description: input.description,
      agenda: input.description,
      meetingType: input.meetingType || 'REGULAR',
      ethiopianDate: ethFormatted,
      meetingDate: gDate,
      meetingTime: input.startTime || '09:00 AM',
      startTime: input.startTime || '09:00 AM',
      endTime: input.endTime || '11:00 AM',
      location: input.location || 'Melka Jabdu Community Hall',
      eligibleMemberType: input.eligibleMemberType || 'ALL',
      status: 'SCHEDULED',
      createdById,
    },
    include: {
      createdBy: { select: { id: true, username: true, role: true } },
    },
  });

  await createAuditEntry(createdById, 'MEETING_CREATED', 'meeting', { meetingId: meeting.id, title: meeting.title }, ipAddress);
  return meeting;
}

export async function getMeetings(filters: {
  status?: string;
  meetingType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.meetingType) {
    where.meetingType = filters.meetingType;
  }
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { location: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [total, rawMeetings, totalActiveMembers] = await Promise.all([
    prisma.meeting.count({ where }),
    prisma.meeting.findMany({
      where,
      orderBy: { meetingDate: 'desc' },
      skip: filters.offset || 0,
      take: filters.limit || 50,
      include: {
        createdBy: { select: { id: true, username: true, role: true } },
        qrSessions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        attendance: {
          select: { status: true },
        },
      },
    }),
    prisma.member.count({ where: { status: 'APPROVED', user: { isActive: true } } }),
  ]);

  const meetings = rawMeetings.map((m) => {
    const presentCount = m.attendance.filter((a) => a.status === 'PRESENT').length;
    const lateCount = m.attendance.filter((a) => a.status === 'LATE').length;
    const absentCount = m.attendance.filter((a) => a.status === 'ABSENT').length;
    const excusedCount = m.attendance.filter((a) => a.status === 'EXCUSED').length;
    const recordedTotal = m.attendance.length;
    const attendedCount = presentCount + lateCount;
    const eligibleCount = totalActiveMembers || 1;
    const attendancePercentage = eligibleCount > 0 ? Math.round((attendedCount / eligibleCount) * 100) : 0;
    const latestQRSession = m.qrSessions[0] || null;

    return {
      id: m.id,
      title: m.title,
      description: m.description,
      meetingType: m.meetingType,
      ethiopianDate: m.ethiopianDate,
      meetingDate: m.meetingDate,
      startTime: m.startTime || m.meetingTime,
      endTime: m.endTime,
      location: m.location,
      status: m.status,
      eligibleMemberType: m.eligibleMemberType,
      createdAt: m.createdAt,
      createdBy: m.createdBy,
      stats: {
        presentCount,
        lateCount,
        absentCount,
        excusedCount,
        attendedCount,
        recordedTotal,
        eligibleCount,
        attendancePercentage,
      },
      activeQRSession:
        latestQRSession && latestQRSession.status === 'ACTIVE' && new Date() <= latestQRSession.expiresAt
          ? latestQRSession
          : null,
    };
  });

  return { total, meetings };
}

export async function getMeetingById(id: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, username: true, role: true } },
      qrSessions: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      attendance: {
        include: {
          member: {
            select: { id: true, memberId: true, fullName: true, user: { select: { phone: true, email: true } } },
          },
          auditLogs: {
            orderBy: { createdAt: 'desc' },
            include: { changedBy: { select: { username: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!meeting) return null;

  const totalActiveMembers = await prisma.member.count({
    where: { status: 'APPROVED', user: { isActive: true } },
  });

  const presentCount = meeting.attendance.filter((a) => a.status === 'PRESENT').length;
  const lateCount = meeting.attendance.filter((a) => a.status === 'LATE').length;
  const absentCount = meeting.attendance.filter((a) => a.status === 'ABSENT').length;
  const excusedCount = meeting.attendance.filter((a) => a.status === 'EXCUSED').length;
  const attendedCount = presentCount + lateCount;
  const eligibleCount = totalActiveMembers || 1;
  const attendancePercentage = Math.round((attendedCount / eligibleCount) * 100);

  const activeQRSession =
    meeting.qrSessions.find((s) => s.status === 'ACTIVE' && new Date() <= s.expiresAt) || null;

  return {
    ...meeting,
    stats: {
      presentCount,
      lateCount,
      absentCount,
      excusedCount,
      attendedCount,
      recordedTotal: meeting.attendance.length,
      eligibleCount,
      attendancePercentage,
    },
    activeQRSession,
  };
}

export async function updateMeeting(id: string, input: Partial<CreateMeetingInput>, userId: string, ipAddress?: string) {
  const current = await prisma.meeting.findUnique({ where: { id } });
  if (!current) throw new Error('Meeting not found');

  let gDate = current.meetingDate;
  let ethFormatted = current.ethiopianDate;

  if (input.meetingDate) {
    gDate = new Date(input.meetingDate);
    const eth = toEthiopianDate(gDate);
    ethFormatted = eth.formattedEth;
  } else if (input.ethiopianDate && input.ethiopianDate !== current.ethiopianDate) {
    ethFormatted = input.ethiopianDate;
    const parsed = parseEthiopianDateString(input.ethiopianDate);
    if (parsed) {
      gDate = toGregorianDate(parsed.year, parsed.month, parsed.day);
    }
  }

  const updated = await prisma.meeting.update({
    where: { id },
    data: {
      title: input.title ?? current.title,
      description: input.description ?? current.description,
      agenda: input.description ?? current.agenda,
      meetingType: input.meetingType ?? current.meetingType,
      ethiopianDate: ethFormatted,
      meetingDate: gDate,
      startTime: input.startTime ?? current.startTime,
      endTime: input.endTime ?? current.endTime,
      location: input.location ?? current.location,
      eligibleMemberType: input.eligibleMemberType ?? current.eligibleMemberType,
    },
  });

  await createAuditEntry(userId, 'MEETING_UPDATED', 'meeting', { meetingId: id, changes: input }, ipAddress);
  return updated;
}

export async function cancelMeeting(id: string, userId: string, ipAddress?: string) {
  const meeting = await prisma.meeting.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  // Close any active QR session
  await prisma.meetingQRCodeSession.updateMany({
    where: { meetingId: id, status: 'ACTIVE' },
    data: { status: 'CLOSED', closedAt: new Date() },
  });

  await createAuditEntry(userId, 'MEETING_CANCELLED', 'meeting', { meetingId: id }, ipAddress);
  return meeting;
}

export async function closeMeeting(id: string, userId: string, ipAddress?: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { attendance: true },
  });
  if (!meeting) throw new Error('Meeting not found');

  // Close all active QR sessions
  await prisma.meetingQRCodeSession.updateMany({
    where: { meetingId: id, status: 'ACTIVE' },
    data: { status: 'CLOSED', closedAt: new Date() },
  });

  // Mark all unrecorded eligible active members as ABSENT
  const allActiveMembers = await prisma.member.findMany({
    where: { status: 'APPROVED', user: { isActive: true } },
    select: { id: true },
  });

  const existingMemberIds = new Set(meeting.attendance.map((a) => a.memberId));
  const unrecordedMembers = allActiveMembers.filter((m) => !existingMemberIds.has(m.id));

  if (unrecordedMembers.length > 0) {
    await prisma.attendance.createMany({
      data: unrecordedMembers.map((m) => ({
        meetingId: id,
        memberId: m.id,
        status: 'ABSENT',
        source: 'MANUAL',
        recordedById: userId,
        remarks: 'Auto-marked absent on meeting close',
      })),
      skipDuplicates: true,
    });
  }

  const updatedMeeting = await prisma.meeting.update({
    where: { id },
    data: { status: 'COMPLETED' },
  });

  await createAuditEntry(
    userId,
    'MEETING_CLOSED',
    'meeting',
    { meetingId: id, autoMarkedAbsent: unrecordedMembers.length },
    ipAddress
  );

  return updatedMeeting;
}

// ─────────────────────────────────────────────────────────────────────────────
// QR ATTENDANCE SESSIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function generateOrGetQRSession(meetingId: string, userId: string, customDurationMinutes?: number) {
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) throw new Error('Meeting not found');
  if (meeting.status === 'CANCELLED') throw new Error('Cannot start attendance session for cancelled meeting');
  if (meeting.status === 'COMPLETED') throw new Error('Cannot start attendance session for completed meeting');

  const now = new Date();
  const settings = await getAttendanceSettings();
  const durationMinutes = customDurationMinutes || settings.defaultQRExpirationMinutes;

  // Check for an existing valid ACTIVE session
  const activeSession = await prisma.meetingQRCodeSession.findFirst({
    where: {
      meetingId,
      status: 'ACTIVE',
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (activeSession) {
    const qrPayload = JSON.stringify({
      type: 'AFOSHA_ATTENDANCE',
      sessionId: activeSession.id,
      meetingId,
      token: activeSession.sessionToken,
      expiresAt: activeSession.expiresAt.toISOString(),
    });

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 450,
      margin: 2,
      color: { dark: '#0B1F3A', light: '#FFFFFF' },
    });

    return {
      session: activeSession,
      qrPayload,
      qrDataUrl,
      remainingSeconds: Math.max(0, Math.floor((activeSession.expiresAt.getTime() - now.getTime()) / 1000)),
    };
  }

  // Generate cryptographically secure random session token
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
  const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

  // Close previous sessions for this meeting
  await prisma.meetingQRCodeSession.updateMany({
    where: { meetingId, status: 'ACTIVE' },
    data: { status: 'EXPIRED', closedAt: now },
  });

  // Create new QR session
  const newSession = await prisma.meetingQRCodeSession.create({
    data: {
      meetingId,
      sessionToken,
      tokenHash,
      status: 'ACTIVE',
      expiresAt,
      startedAt: now,
      createdById: userId,
    },
  });

  // Ensure meeting is set to ACTIVE if it was SCHEDULED or DRAFT
  if (meeting.status !== 'ACTIVE') {
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'ACTIVE' },
    });
  }

  const qrPayload = JSON.stringify({
    type: 'AFOSHA_ATTENDANCE',
    sessionId: newSession.id,
    meetingId,
    token: sessionToken,
    expiresAt: expiresAt.toISOString(),
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 450,
    margin: 2,
    color: { dark: '#0B1F3A', light: '#FFFFFF' },
  });

  await createAuditEntry(userId, 'QR_SESSION_GENERATED', 'qr_session', { sessionId: newSession.id, meetingId }, undefined);

  return {
    session: newSession,
    qrPayload,
    qrDataUrl,
    remainingSeconds: durationMinutes * 60,
  };
}

export async function pauseQRSession(meetingId: string, userId: string) {
  const session = await prisma.meetingQRCodeSession.findFirst({
    where: { meetingId, status: 'ACTIVE' },
  });
  if (!session) throw new Error('No active QR session found for this meeting');

  const updated = await prisma.meetingQRCodeSession.update({
    where: { id: session.id },
    data: { status: 'PAUSED' },
  });

  await createAuditEntry(userId, 'QR_SESSION_PAUSED', 'qr_session', { sessionId: session.id }, undefined);
  return updated;
}

export async function resumeQRSession(meetingId: string, userId: string) {
  const session = await prisma.meetingQRCodeSession.findFirst({
    where: { meetingId, status: 'PAUSED' },
  });
  if (!session) throw new Error('No paused QR session found for this meeting');

  if (new Date() > session.expiresAt) {
    throw new Error('Cannot resume an expired session. Please generate or regenerate a new QR session.');
  }

  const updated = await prisma.meetingQRCodeSession.update({
    where: { id: session.id },
    data: { status: 'ACTIVE' },
  });

  await createAuditEntry(userId, 'QR_SESSION_RESUMED', 'qr_session', { sessionId: session.id }, undefined);
  return updated;
}

export async function closeQRSession(meetingId: string, userId: string) {
  const sessions = await prisma.meetingQRCodeSession.updateMany({
    where: { meetingId, status: { in: ['ACTIVE', 'PAUSED'] } },
    data: { status: 'CLOSED', closedAt: new Date() },
  });

  await createAuditEntry(userId, 'QR_SESSION_CLOSED', 'qr_session', { meetingId }, undefined);
  return sessions;
}

export async function regenerateQRSession(meetingId: string, userId: string, customDurationMinutes?: number) {
  // Invalidate any existing active/paused sessions
  await prisma.meetingQRCodeSession.updateMany({
    where: { meetingId, status: { in: ['ACTIVE', 'PAUSED'] } },
    data: { status: 'EXPIRED', closedAt: new Date() },
  });

  return generateOrGetQRSession(meetingId, userId, customDurationMinutes);
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE CHECK-IN & VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export interface ScanAttendanceResult {
  success: boolean;
  alreadyRecorded: boolean;
  status: AttendanceStatus;
  checkInTime: string;
  meetingTitle: string;
  meetingDateEth: string;
  meetingDateGregorian: string;
  memberName: string;
  message: string;
  attendanceId: string;
}

/**
 * Validates QR code and records member attendance with strict backend integrity
 */
export async function recordQRScanAttendance(
  userId: string,
  tokenInput: string,
  sessionIdInput?: string,
  meetingIdInput?: string,
  clientIp?: string
): Promise<ScanAttendanceResult> {
  const now = new Date();

  // 1. Verify User and Member status
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { member: true },
  });

  if (!user || user.role !== 'MEMBER') {
    throw new Error('Only registered members are authorized to record attendance.');
  }

  if (!user.isActive) {
    throw new Error('Your user account is inactive. Please contact administration.');
  }

  const member = user.member;
  if (!member) {
    throw new Error('Member profile not found for this user account.');
  }

  if (member.status !== 'APPROVED') {
    throw new Error(`Your membership status is ${member.status}. Only APPROVED members may check in.`);
  }

  // 2. Parse token / payload
  let cleanToken = tokenInput.trim();
  if (cleanToken.startsWith('{') && cleanToken.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleanToken);
      if (parsed.token) cleanToken = parsed.token;
      if (parsed.sessionId && !sessionIdInput) sessionIdInput = parsed.sessionId;
      if (parsed.meetingId && !meetingIdInput) meetingIdInput = parsed.meetingId;
    } catch {
      // Keep cleanToken as-is
    }
  }

  // 3. Find matching active QR session
  let session = await prisma.meetingQRCodeSession.findUnique({
    where: { sessionToken: cleanToken },
    include: { meeting: true },
  });

  if (!session && sessionIdInput) {
    session = await prisma.meetingQRCodeSession.findUnique({
      where: { id: sessionIdInput },
      include: { meeting: true },
    });
    if (session && session.sessionToken !== cleanToken) {
      session = null;
    }
  }

  if (!session) {
    throw new Error('Invalid or unrecognized QR attendance token.');
  }

  // 4. Validate session status and expiration
  if (session.status === 'PAUSED') {
    throw new Error('Attendance session is currently paused by the administrator.');
  }

  if (session.status === 'CLOSED') {
    throw new Error('Attendance session for this meeting has ended.');
  }

  if (session.status === 'EXPIRED' || now > session.expiresAt) {
    // Mark expired if not already marked
    if (session.status === 'ACTIVE') {
      await prisma.meetingQRCodeSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' },
      });
    }
    throw new Error('QR code has expired. Please ask the administrator to regenerate or extend the session.');
  }

  const meeting = session.meeting;

  // 5. Validate meeting status
  if (meeting.status === 'CANCELLED') {
    throw new Error('This meeting has been cancelled.');
  }

  if (meeting.status === 'COMPLETED') {
    throw new Error('This meeting has already completed and attendance is closed.');
  }

  // 6. Check duplicate check-in
  const existingAttendance = await prisma.attendance.findUnique({
    where: {
      meetingId_memberId: {
        meetingId: meeting.id,
        memberId: member.id,
      },
    },
  });

  const ethDate = toEthiopianDate(meeting.meetingDate);

  if (existingAttendance) {
    return {
      success: true,
      alreadyRecorded: true,
      status: existingAttendance.status,
      checkInTime: (existingAttendance.checkInAt || existingAttendance.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      meetingTitle: meeting.title,
      meetingDateEth: ethDate.formattedEth,
      meetingDateGregorian: meeting.meetingDate.toISOString().slice(0, 10),
      memberName: member.fullName,
      message: 'Attendance already recorded.',
      attendanceId: existingAttendance.id,
    };
  }

  // 7. Calculate status (PRESENT vs LATE based on scheduled time + lateThreshold)
  const settings = await getAttendanceSettings();
  let assignedStatus: AttendanceStatus = 'PRESENT';

  if (meeting.startTime) {
    // Parse time string e.g. "09:00" or "09:00 AM"
    const timeMatch = meeting.startTime.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const modifier = timeMatch[3]?.toUpperCase();

      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const scheduledStart = new Date(meeting.meetingDate);
      scheduledStart.setHours(hours, minutes, 0, 0);

      const lateCutoff = new Date(scheduledStart.getTime() + settings.lateThresholdMinutes * 60 * 1000);
      if (now > lateCutoff) {
        assignedStatus = 'LATE';
      }
    }
  }

  // 8. Record attendance inside transaction
  const record = await prisma.$transaction(async (tx) => {
    return tx.attendance.create({
      data: {
        meetingId: meeting.id,
        memberId: member.id,
        status: assignedStatus,
        source: 'QR',
        checkInAt: now,
        verifiedAt: now,
        qrSessionId: session!.id,
        recordedById: user.id,
        remarks: `QR scan check-in from IP ${clientIp || 'unknown'}`,
      },
    });
  });

  return {
    success: true,
    alreadyRecorded: false,
    status: record.status,
    checkInTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    meetingTitle: meeting.title,
    meetingDateEth: ethDate.formattedEth,
    meetingDateGregorian: meeting.meetingDate.toISOString().slice(0, 10),
    memberName: member.fullName,
    message: assignedStatus === 'LATE' ? 'Attendance recorded (Marked Late).' : 'Attendance recorded successfully.',
    attendanceId: record.id,
  };
}

/**
 * Record manual attendance for a single member or batch
 */
export async function recordManualAttendance(
  meetingId: string,
  records: Array<{ memberId: string; status: AttendanceStatus; remarks?: string }>,
  recordedById: string,
  ipAddress?: string
) {
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) throw new Error('Meeting not found');

  const results = await prisma.$transaction(
    records.map((r) =>
      prisma.attendance.upsert({
        where: {
          meetingId_memberId: {
            meetingId,
            memberId: r.memberId,
          },
        },
        update: {
          status: r.status,
          remarks: r.remarks,
          source: 'MANUAL',
          recordedById,
        },
        create: {
          meetingId,
          memberId: r.memberId,
          status: r.status,
          remarks: r.remarks,
          source: 'MANUAL',
          recordedById,
          checkInAt: new Date(),
        },
      })
    )
  );

  await createAuditEntry(
    recordedById,
    'ATTENDANCE_MANUAL_RECORDED',
    'attendance',
    { meetingId, count: records.length },
    ipAddress
  );

  return results;
}

/**
 * Correct an existing attendance record with mandatory audit history tracking
 */
export async function correctAttendanceRecord(
  attendanceId: string,
  newStatus: AttendanceStatus,
  reason: string,
  changedById: string,
  remarks?: string
) {
  if (!reason || reason.trim().length < 3) {
    throw new Error('A valid reason is required when correcting attendance records.');
  }

  const existing = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: { member: true, meeting: true },
  });

  if (!existing) throw new Error('Attendance record not found');
  const prevStatus = existing.status;

  const [updatedRecord, auditEntry] = await prisma.$transaction([
    prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status: newStatus,
        source: 'CORRECTION',
        remarks: remarks || existing.remarks,
      },
    }),
    prisma.attendanceAuditLog.create({
      data: {
        attendanceId,
        action: 'STATUS_CORRECTION',
        previousStatus: prevStatus,
        newStatus,
        reason,
        changedById,
      },
    }),
  ]);

  await createAuditEntry(
    changedById,
    'ATTENDANCE_CORRECTED',
    'attendance',
    {
      attendanceId,
      memberId: existing.memberId,
      previousStatus: prevStatus,
      newStatus,
      reason,
    },
    undefined
  );

  return { updatedRecord, auditEntry };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORDS & ANALYTICS & REPORTS
// ─────────────────────────────────────────────────────────────────────────────

export async function getAttendanceRecords(filters: {
  meetingId?: string;
  memberId?: string;
  status?: string;
  source?: string;
  search?: string;
  ethiopianYear?: number;
  ethiopianMonth?: number;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (filters.meetingId) where.meetingId = filters.meetingId;
  if (filters.memberId) where.memberId = filters.memberId;
  if (filters.status) where.status = filters.status;
  if (filters.source) where.source = filters.source;

  if (filters.search) {
    where.OR = [
      { member: { fullName: { contains: filters.search, mode: 'insensitive' } } },
      { member: { memberId: { contains: filters.search, mode: 'insensitive' } } },
      { meeting: { title: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }

  const [total, records] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: filters.offset || 0,
      take: filters.limit || 50,
      include: {
        member: {
          select: { id: true, memberId: true, fullName: true, user: { select: { phone: true, email: true } } },
        },
        meeting: {
          select: { id: true, title: true, meetingDate: true, ethiopianDate: true, startTime: true, location: true },
        },
        recordedBy: {
          select: { id: true, username: true, role: true },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          include: { changedBy: { select: { username: true } } },
        },
      },
    }),
  ]);

  return { total, records };
}

export async function getAttendanceAnalytics() {
  const [totalMeetings, totalActiveMembers, statusCounts, monthlyMeetings, activeMeetingRecord] = await Promise.all([
    prisma.meeting.count(),
    prisma.member.count({ where: { status: 'APPROVED', user: { isActive: true } } }),
    prisma.attendance.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.meeting.findMany({
      orderBy: { meetingDate: 'desc' },
      take: 12,
      include: {
        attendance: { select: { status: true } },
      },
    }),
    prisma.meeting.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        attendance: { select: { status: true } },
        qrSessions: { where: { status: 'ACTIVE' }, take: 1 },
      },
    }),
  ]);

  const counts: Record<string, number> = {
    PRESENT: 0,
    LATE: 0,
    ABSENT: 0,
    EXCUSED: 0,
  };

  statusCounts.forEach((s) => {
    counts[s.status] = s._count;
  });

  const totalRecorded = counts.PRESENT + counts.LATE + counts.ABSENT + counts.EXCUSED;
  const attendedCount = counts.PRESENT + counts.LATE;
  const overallPercentage = totalRecorded > 0 ? Math.round((attendedCount / totalRecorded) * 100) : 0;

  // Chart 1: Status Distribution (Doughnut)
  const distributionChart = [
    { name: 'Present', nameOm: 'Argama', value: counts.PRESENT, color: '#16A34A' },
    { name: 'Late', nameOm: 'Turanii', value: counts.LATE, color: '#F59E0B' },
    { name: 'Absent', nameOm: 'Hafanii', value: counts.ABSENT, color: '#EF4444' },
    { name: 'Excused', nameOm: 'Eeyyaman', value: counts.EXCUSED, color: '#6366F1' },
  ];

  // Chart 2: Meeting Attendance Comparison (Bar)
  const meetingComparisonChart = monthlyMeetings
    .map((m) => {
      const p = m.attendance.filter((a) => a.status === 'PRESENT').length;
      const l = m.attendance.filter((a) => a.status === 'LATE').length;
      const ab = m.attendance.filter((a) => a.status === 'ABSENT').length;
      const ex = m.attendance.filter((a) => a.status === 'EXCUSED').length;
      return {
        meetingId: m.id,
        title: m.title.length > 18 ? m.title.slice(0, 18) + '...' : m.title,
        date: m.meetingDate.toISOString().slice(0, 10),
        ethDate: m.ethiopianDate || toEthiopianDate(m.meetingDate).formattedEth,
        present: p,
        late: l,
        attended: p + l,
        absent: ab,
        excused: ex,
        total: m.attendance.length,
      };
    })
    .reverse();

  // Chart 3: Monthly Attendance Rate Trends (Line)
  const monthlyTrends = meetingComparisonChart.map((m) => {
    const rate = m.total > 0 ? Math.round((m.attended / m.total) * 100) : 0;
    return {
      name: m.ethDate,
      attendanceRate: rate,
      present: m.present,
      absent: m.absent,
    };
  });

  let activeMeeting: any = null;
  if (activeMeetingRecord) {
    const presentCount = activeMeetingRecord.attendance.filter((a) => a.status === 'PRESENT').length;
    const lateCount = activeMeetingRecord.attendance.filter((a) => a.status === 'LATE').length;
    activeMeeting = {
      ...activeMeetingRecord,
      attendanceStats: {
        present: presentCount,
        late: lateCount,
        total: activeMeetingRecord.attendance.length,
      },
      activeQRSession: activeMeetingRecord.qrSessions[0] || null,
    };
  }

  return {
    summary: {
      totalMeetings,
      totalActiveMembers,
      activeMembers: totalActiveMembers,
      totalPresent: counts.PRESENT,
      presentCount: counts.PRESENT,
      totalLate: counts.LATE,
      lateCount: counts.LATE,
      totalAbsent: counts.ABSENT,
      absentCount: counts.ABSENT,
      totalExcused: counts.EXCUSED,
      excusedCount: counts.EXCUSED,
      totalAttended: attendedCount,
      overallPercentage,
      overallAttendanceRate: overallPercentage,
    },
    activeMeeting,
    statusDistribution: distributionChart,
    meetingComparisons: meetingComparisonChart,
    monthlyTrends,
    charts: {
      distribution: distributionChart,
      meetingComparison: meetingComparisonChart,
      monthlyTrends,
    },
  };
}

export async function getMemberAttendanceHistory(memberId: string) {
  const records = await prisma.attendance.findMany({
    where: { memberId },
    orderBy: { createdAt: 'desc' },
    include: {
      meeting: {
        select: {
          id: true,
          title: true,
          meetingDate: true,
          ethiopianDate: true,
          location: true,
          startTime: true,
          status: true,
        },
      },
    },
  });

  const presentCount = records.filter((r) => r.status === 'PRESENT').length;
  const lateCount = records.filter((r) => r.status === 'LATE').length;
  const absentCount = records.filter((r) => r.status === 'ABSENT').length;
  const excusedCount = records.filter((r) => r.status === 'EXCUSED').length;
  const attendedCount = presentCount + lateCount;
  const totalMeetings = records.length;
  const attendancePercentage = totalMeetings > 0 ? Math.round((attendedCount / totalMeetings) * 100) : 0;

  return {
    records,
    attendancePercentage,
    stats: {
      totalMeetings,
      presentCount,
      lateCount,
      absentCount,
      excusedCount,
      attendedCount,
      attendancePercentage,
    },
  };
}
