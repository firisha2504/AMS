import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Clock,
  MapPin,
  QrCode,
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Download,
  Printer,
  Copy,
  Plus,
  Edit3,
  Search,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  BarChart2,
  PieChart as PieIcon,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  PageHeader,
  LoadingSpinner,
  Modal,
  inputClass,
  btnPrimary,
  btnSecondary,
} from '../components/ui';
import {
  ETHIOPIAN_MONTHS,
  toEthiopianDate,
  toGregorianDate,
  getDaysInEthiopianMonth,
} from '../lib/ethiopianCalendar';

// ── Types ───────────────────────────────────────────────────────────────────

export type AttendanceTab = 'dashboard' | 'meetings' | 'qr' | 'records' | 'reports' | 'settings';

export interface MeetingItem {
  id: string;
  title: string;
  description?: string;
  agenda?: string;
  meetingType: 'REGULAR' | 'EMERGENCY' | 'ANNUAL' | 'SPECIAL' | 'OTHER';
  meetingDate: string;
  ethiopianDate?: string;
  meetingTime?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  eligibleMemberType: string;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdBy?: { id: string; username: string };
  attendanceStats?: {
    present: number;
    late: number;
    absent: number;
    excused: number;
    totalRecords: number;
    attendancePercentage: number;
  };
  qrSessions?: QRSessionItem[];
}

export interface QRSessionItem {
  id: string;
  meetingId: string;
  sessionToken: string;
  tokenHash: string;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'EXPIRED';
  expiresAt: string;
  startedAt: string;
  closedAt?: string;
  qrCodeDataUrl?: string;
}

export interface AttendanceRecordItem {
  id: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
  source: 'QR' | 'MANUAL' | 'CORRECTION';
  checkInAt?: string;
  verifiedAt?: string;
  remarks?: string;
  memberId: string;
  meetingId: string;
  member: {
    id: string;
    memberId: string;
    fullName: string;
    user?: { phone?: string; email?: string };
  };
  meeting: {
    id: string;
    title: string;
    meetingDate: string;
    ethiopianDate?: string;
    startTime?: string;
    location?: string;
  };
  auditLogs?: Array<{
    id: string;
    action: string;
    previousStatus: string;
    newStatus: string;
    reason: string;
    createdAt: string;
    changedBy?: { username: string };
  }>;
}

export interface AttendanceSettingsData {
  earlyCheckInMinutes: number;
  lateThresholdMinutes: number;
  defaultQRExpirationMinutes: number;
}

export default function AttendancePage() {
  const { t, i18n } = useTranslation();
  const isOm = i18n.language === 'om';
  const { user } = useAuth();

  const isMember = user?.role === 'MEMBER';
  const isAuditor = user?.role === 'AUDITOR';
  const isAdmin = user?.role === 'ADMIN';

  // Navigation tab
  const [activeTab, setActiveTab] = useState<AttendanceTab>('dashboard');

  // Loading & Global notification states
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Data states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [membersList, setMembersList] = useState<any[]>([]);
  const [settingsData, setSettingsData] = useState<AttendanceSettingsData>({
    earlyCheckInMinutes: 30,
    lateThresholdMinutes: 15,
    defaultQRExpirationMinutes: 60,
  });

  // Member-specific state
  const [memberHistory, setMemberHistory] = useState<any>(null);
  const [manualScanToken, setManualScanToken] = useState('');
  const [submittingScan, setSubmittingScan] = useState(false);

  // Active QR session tab state
  const [selectedMeetingIdForQR, setSelectedMeetingIdForQR] = useState<string>('');
  const [qrSessionData, setQrSessionData] = useState<any>(null);
  const [qrRemainingSeconds, setQrRemainingSeconds] = useState<number>(0);
  const [qrDurationMinutes, setQrDurationMinutes] = useState<number>(60);
  const [isFullscreenQR, setIsFullscreenQR] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Meeting Management modals
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingItem | null>(null);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    meetingType: 'REGULAR',
    ethYear: 2017,
    ethMonth: 1,
    ethDate: 1,
    startTime: '09:00 AM',
    endTime: '11:00 AM',
    location: 'Melka Jabdu Community Hall',
    eligibleMemberType: 'ALL',
  });
  const [savingMeeting, setSavingMeeting] = useState(false);

  // Manual Attendance & Correction modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    meetingId: '',
    memberId: '',
    status: 'PRESENT',
    remarks: '',
  });
  const [savingManual, setSavingManual] = useState(false);

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecordItem | null>(null);
  const [correctionForm, setCorrectionForm] = useState({
    newStatus: 'PRESENT',
    reason: '',
    remarks: '',
  });
  const [savingCorrection, setSavingCorrection] = useState(false);

  // Filters for Records & Reports
  const [filterMeetingId, setFilterMeetingId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [recordPage, setRecordPage] = useState(1);

  // Settings saving
  const [savingSettings, setSavingSettings] = useState(false);

  // ── Auto-clear feedback ──
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // ── Initial Load ──
  const loadAll = async () => {
    setLoading(true);
    try {
      if (isMember) {
        // Load Member's personal attendance history
        const res = await api.get('/attendance/my');
        if (res.data?.success) {
          setMemberHistory(res.data.data);
        }
      } else {
        // Load Admin/Auditor data
        const [dashRes, meetRes, recRes, setRes, memRes] = await Promise.all([
          api.get('/attendance/dashboard').catch(() => ({ data: { data: null } })),
          api.get('/attendance/meetings').catch(() => ({ data: { data: [] } })),
          api.get('/attendance/records', { params: { limit: 50 } }).catch(() => ({ data: { data: { records: [], total: 0 } } })),
          api.get('/attendance/settings').catch(() => ({ data: { data: null } })),
          api.get('/members', { params: { limit: 500, status: 'APPROVED' } }).catch(() => ({ data: { data: [] } })),
        ]);

        if (dashRes.data?.data) setDashboardData(dashRes.data.data);
        if (meetRes.data?.data) {
          setMeetings(meetRes.data.data);
          if (meetRes.data.data.length > 0 && !selectedMeetingIdForQR) {
            // Find active meeting or first scheduled
            const active = meetRes.data.data.find((m: any) => m.status === 'ACTIVE') || meetRes.data.data[0];
            setSelectedMeetingIdForQR(active.id);
          }
        }
        if (recRes.data?.data?.records) {
          setRecords(recRes.data.data.records);
          setTotalRecords(recRes.data.data.total || recRes.data.data.records.length);
        }
        if (setRes.data?.data) setSettingsData(setRes.data.data);
        if (memRes.data?.data) setMembersList(memRes.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [isMember]);

  // ── Load Records on filter/page change ──
  const fetchFilteredRecords = async () => {
    try {
      const res = await api.get('/attendance/records', {
        params: {
          meetingId: filterMeetingId || undefined,
          status: filterStatus || undefined,
          source: filterSource || undefined,
          search: searchQuery || undefined,
          page: recordPage,
          limit: 50,
        },
      });
      if (res.data?.success && res.data.data) {
        setRecords(res.data.data.records || []);
        setTotalRecords(res.data.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to filter records:', err);
    }
  };

  useEffect(() => {
    if (!isMember && (activeTab === 'records' || activeTab === 'reports')) {
      fetchFilteredRecords();
    }
  }, [filterMeetingId, filterStatus, filterSource, searchQuery, recordPage, activeTab]);

  // ── Load QR session when meeting selector changes in QR Tab ──
  const loadQRSession = async (meetingId: string) => {
    if (!meetingId) return;
    try {
      const res = await api.get(`/attendance/meetings/${meetingId}/qr-session`);
      if (res.data?.success && res.data.data) {
        setQrSessionData(res.data.data);
        if (res.data.data.remainingSeconds) {
          setQrRemainingSeconds(res.data.data.remainingSeconds);
        }
      } else {
        setQrSessionData(null);
      }
    } catch {
      setQrSessionData(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'qr' && selectedMeetingIdForQR) {
      loadQRSession(selectedMeetingIdForQR);
    }
  }, [activeTab, selectedMeetingIdForQR]);

  // ── Countdown timer for QR session ──
  useEffect(() => {
    if (qrSessionData?.status === 'ACTIVE' && qrRemainingSeconds > 0) {
      const timer = setInterval(() => {
        setQrRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            loadQRSession(selectedMeetingIdForQR);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [qrSessionData?.status, qrRemainingSeconds, selectedMeetingIdForQR]);

  // ── Helper formatters ──
  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-600" />
            {isOm ? 'Argame' : 'Present'}
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={13} className="text-amber-600" />
            {isOm ? 'Ture' : 'Late'}
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={13} className="text-rose-600" />
            {isOm ? 'Hin Argamne' : 'Absent'}
          </span>
        );
      case 'EXCUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <HelpCircle size={13} className="text-indigo-600" />
            {isOm ? 'Eeyyama' : 'Excused'}
          </span>
        );
      default:
        return <span className="text-xs text-gray-500 font-medium">{status}</span>;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'QR':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
            <QrCode size={12} /> QR Code
          </span>
        );
      case 'MANUAL':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <Edit3 size={12} /> Manual
          </span>
        );
      case 'CORRECTION':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            <ShieldCheck size={12} /> Corrected
          </span>
        );
      default:
        return <span className="text-xs text-gray-400">{source || '—'}</span>;
    }
  };

  // ── Handlers: QR Session Actions ──
  const handleGenerateQR = async () => {
    if (!selectedMeetingIdForQR) return;
    try {
      const res = await api.post(`/attendance/meetings/${selectedMeetingIdForQR}/qr-session`, {
        durationMinutes: qrDurationMinutes,
      });
      if (res.data?.success) {
        setQrSessionData(res.data.data);
        setQrRemainingSeconds(res.data.data.remainingSeconds || qrDurationMinutes * 60);
        setFeedback({
          type: 'success',
          message: isOm ? 'Koodiin QR milkaa\'inaan uumameera!' : 'QR attendance session started successfully!',
        });
        loadAll();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Failed to generate QR session' });
    }
  };

  const handlePauseQR = async () => {
    if (!selectedMeetingIdForQR) return;
    try {
      const res = await api.post(`/attendance/meetings/${selectedMeetingIdForQR}/qr-session/pause`);
      if (res.data?.success) {
        setQrSessionData((prev: any) => ({ ...prev, status: 'PAUSED' }));
        setFeedback({ type: 'success', message: isOm ? 'Yeroon QR dhaabbateera.' : 'QR session paused.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Failed to pause QR session' });
    }
  };

  const handleResumeQR = async () => {
    if (!selectedMeetingIdForQR) return;
    try {
      const res = await api.post(`/attendance/meetings/${selectedMeetingIdForQR}/qr-session/resume`);
      if (res.data?.success) {
        setQrSessionData((prev: any) => ({ ...prev, status: 'ACTIVE' }));
        setFeedback({ type: 'success', message: isOm ? 'Yeroon QR itti fufeera.' : 'QR session resumed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Failed to resume QR session' });
    }
  };

  const handleCloseQR = async () => {
    if (!selectedMeetingIdForQR) return;
    try {
      const res = await api.post(`/attendance/meetings/${selectedMeetingIdForQR}/qr-session/close`);
      if (res.data?.success) {
        setQrSessionData((prev: any) => ({ ...prev, status: 'CLOSED' }));
        setFeedback({ type: 'success', message: isOm ? 'Yeroon QR cufameera.' : 'QR session closed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Failed to close QR session' });
    }
  };

  const handleRegenerateQR = async () => {
    if (!selectedMeetingIdForQR) return;
    try {
      const res = await api.post(`/attendance/meetings/${selectedMeetingIdForQR}/qr-session/regenerate`, {
        durationMinutes: qrDurationMinutes,
      });
      if (res.data?.success) {
        setQrSessionData(res.data.data);
        setQrRemainingSeconds(res.data.data.remainingSeconds || qrDurationMinutes * 60);
        setFeedback({
          type: 'success',
          message: isOm ? 'Koodiin QR haaraan milkaa\'inaan uumameera!' : 'QR code regenerated successfully!',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Failed to regenerate QR session' });
    }
  };

  const handleCopyToken = () => {
    if (qrSessionData?.sessionToken) {
      navigator.clipboard.writeText(qrSessionData.sessionToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (!qrSessionData?.qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrSessionData.qrCodeDataUrl;
    a.download = `QR-Attendance-${selectedMeeting?.title || 'meeting'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintQR = () => {
    window.print();
  };

  // ── Member Manual Scan Check-in ──
  const handleMemberScanCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualScanToken.trim()) return;

    setSubmittingScan(true);
    try {
      const res = await api.post('/attendance/scan', { token: manualScanToken.trim() });
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: isOm
            ? `Hirmaannaan keessan milkaa'inaan galmaa'eera! Haala: ${res.data.data.status}`
            : `Attendance recorded successfully! Status: ${res.data.data.status}`,
        });
        setManualScanToken('');
        // Reload member history
        const myRes = await api.get('/attendance/my');
        if (myRes.data?.success) setMemberHistory(myRes.data.data);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to check in. Check token or QR session validity.',
      });
    } finally {
      setSubmittingScan(false);
    }
  };

  // ── Meeting CRUD ──
  const openCreateMeetingModal = () => {
    setEditingMeeting(null);
    setMeetingForm({
      title: '',
      description: '',
      meetingType: 'REGULAR',
      ethYear: 2017,
      ethMonth: 1,
      ethDate: 1,
      startTime: '09:00 AM',
      endTime: '11:00 AM',
      location: 'Melka Jabdu Community Hall',
      eligibleMemberType: 'ALL',
    });
    setShowMeetingModal(true);
  };

  const openEditMeetingModal = (m: MeetingItem) => {
    setEditingMeeting(m);
    let y = 2017,
      mo = 1,
      d = 1;
    if (m.meetingDate) {
      try {
        const eth = toEthiopianDate(m.meetingDate);
        if (eth) {
          y = eth.year;
          mo = eth.month;
          d = eth.date;
        }
      } catch {
        // Fallback
      }
    }
    setMeetingForm({
      title: m.title,
      description: m.description || m.agenda || '',
      meetingType: m.meetingType || 'REGULAR',
      ethYear: y,
      ethMonth: mo,
      ethDate: d,
      startTime: m.startTime || m.meetingTime || '09:00 AM',
      endTime: m.endTime || '11:00 AM',
      location: m.location || 'Melka Jabdu Community Hall',
      eligibleMemberType: m.eligibleMemberType || 'ALL',
    });
    setShowMeetingModal(true);
  };

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.title.trim()) {
      setFeedback({ type: 'error', message: 'Meeting title is required' });
      return;
    }

    setSavingMeeting(true);
    try {
      const gDate = toGregorianDate(meetingForm.ethYear, meetingForm.ethMonth, meetingForm.ethDate);
      const mInfo = ETHIOPIAN_MONTHS[meetingForm.ethMonth - 1] || ETHIOPIAN_MONTHS[0];
      const ethFormatted = `${meetingForm.ethDate} ${mInfo.nameEn} ${meetingForm.ethYear}`;

      const payload = {
        title: meetingForm.title.trim(),
        description: meetingForm.description.trim(),
        meetingType: meetingForm.meetingType,
        meetingDate: gDate.toISOString(),
        ethiopianDate: ethFormatted,
        startTime: meetingForm.startTime,
        endTime: meetingForm.endTime,
        location: meetingForm.location.trim(),
        eligibleMemberType: meetingForm.eligibleMemberType,
      };

      if (editingMeeting) {
        await api.put(`/attendance/meetings/${editingMeeting.id}`, payload);
        setFeedback({
          type: 'success',
          message: isOm ? 'Walga\'iin milkaa\'inaan haaromsameera!' : 'Meeting updated successfully!',
        });
      } else {
        await api.post('/attendance/meetings', payload);
        setFeedback({
          type: 'success',
          message: isOm ? 'Walga\'ii haaraan milkaa\'inaan uumameera!' : 'Meeting created successfully!',
        });
      }
      setShowMeetingModal(false);
      loadAll();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to save meeting',
      });
    } finally {
      setSavingMeeting(false);
    }
  };

  const handleCloseMeeting = async (meetingId: string) => {
    if (!window.confirm(isOm ? 'Walga\'ii kana cufuu barbaadduu? Miseensonni hin argamin haala \'Hin Argamne\' ta\'u.' : 'Close this meeting? Any member without attendance will be recorded as Absent.')) return;
    try {
      await api.post(`/attendance/meetings/${meetingId}/close`);
      setFeedback({
        type: 'success',
        message: isOm ? 'Walga\'iin cufameera!' : 'Meeting closed successfully!',
      });
      loadAll();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Failed to close meeting' });
    }
  };

  const handleCancelMeeting = async (meetingId: string) => {
    if (!window.confirm(isOm ? 'Walga\'ii kana haqsuu barbaadduu?' : 'Cancel this meeting?')) return;
    try {
      await api.delete(`/attendance/meetings/${meetingId}`);
      setFeedback({
        type: 'success',
        message: isOm ? 'Walga\'iin haqameera!' : 'Meeting cancelled successfully!',
      });
      loadAll();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Failed to cancel meeting' });
    }
  };

  // ── Manual Attendance & Corrections ──
  const handleSaveManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.meetingId || !manualForm.memberId) {
      setFeedback({ type: 'error', message: 'Please select both meeting and member' });
      return;
    }

    setSavingManual(true);
    try {
      await api.post('/attendance/records/manual', manualForm);
      setFeedback({
        type: 'success',
        message: isOm ? 'Galmeen hirmaannaa harkaan galfameera!' : 'Manual attendance recorded successfully!',
      });
      setShowManualModal(false);
      fetchFilteredRecords();
      loadAll();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to record attendance',
      });
    } finally {
      setSavingManual(false);
    }
  };

  const openCorrectionModal = (rec: AttendanceRecordItem) => {
    setCorrectingRecord(rec);
    setCorrectionForm({
      newStatus: rec.status,
      reason: '',
      remarks: rec.remarks || '',
    });
    setShowCorrectionModal(true);
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingRecord) return;
    if (!correctionForm.reason.trim() || correctionForm.reason.trim().length < 3) {
      setFeedback({ type: 'error', message: 'A valid reason is strictly mandatory for attendance correction!' });
      return;
    }

    setSavingCorrection(true);
    try {
      await api.put(`/attendance/records/${correctingRecord.id}/correct`, {
        newStatus: correctionForm.newStatus,
        reason: correctionForm.reason.trim(),
        remarks: correctionForm.remarks.trim(),
      });
      setFeedback({
        type: 'success',
        message: isOm ? 'Sirreeffamni milkaa\'inaan galmeeffameera!' : 'Attendance corrected and audited successfully!',
      });
      setShowCorrectionModal(false);
      fetchFilteredRecords();
      loadAll();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to correct attendance',
      });
    } finally {
      setSavingCorrection(false);
    }
  };

  // ── Attendance Settings ──
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await api.put('/attendance/settings', settingsData);
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: isOm ? 'Qindaa\'inni hirmaannaa haaromsameera!' : 'Attendance settings saved successfully!',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to save settings',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  // ── Export CSV ──
  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = ['Member Name', 'Member ID', 'Meeting Title', 'Meeting Date', 'Status', 'Source', 'Check-In Time', 'Remarks'];
    const rows = records.map((r) => [
      `"${r.member?.fullName || ''}"`,
      `"${r.member?.memberId || ''}"`,
      `"${r.meeting?.title || ''}"`,
      `"${r.meeting?.ethiopianDate || r.meeting?.meetingDate || ''}"`,
      r.status,
      r.source,
      r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString() : '',
      `"${r.remarks || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedMeeting = useMemo(() => {
    return meetings.find((m) => m.id === selectedMeetingIdForQR);
  }, [meetings, selectedMeetingIdForQR]);

  if (loading) return <LoadingSpinner />;

  // ─────────────────────────────────────────────────────────────────────────
  // 1. MEMBER-SPECIFIC VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (isMember) {
    const stats = memberHistory?.stats || {
      attendancePercentage: memberHistory?.attendancePercentage || 0,
      totalMeetings: memberHistory?.records?.length || 0,
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      excusedCount: 0,
    };
    const memberRecords = memberHistory?.records || [];

    return (
      <div className="space-y-6">
        <PageHeader
          title={isOm ? 'Argamnaa Walga\'ii Koo' : 'My Meeting Attendance'}
          subtitle={
            isOm
              ? 'Seenaa hirmaannaa walga\'ii keessanii fi koodii QR fayyadamuun hirmaannaa galmeessaa'
              : 'Review your attendance history and check in to ongoing meetings'
          }
        />

        {feedback && (
          <div
            className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Member Summary Header */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-emerald-200 font-bold block mb-1">
                {isOm ? 'Dhibbeentaa Argamnaa' : 'Attendance Rate'}
              </span>
              <div className="text-4xl font-extrabold tracking-tight">{stats.attendancePercentage}%</div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-emerald-950/40 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, stats.attendancePercentage))}%` }}
                />
              </div>
              <span className="text-xs text-emerald-200 mt-2 block">
                {stats.presentCount + stats.lateCount} / {stats.totalMeetings} {isOm ? 'walga\'ii' : 'meetings attended'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <span className="text-xs text-gray-500 font-semibold uppercase">{isOm ? 'Yeroon Argame' : 'Present'}</span>
              <div className="text-2xl font-bold text-gray-900">{stats.presentCount}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Clock size={24} />
            </div>
            <div>
              <span className="text-xs text-gray-500 font-semibold uppercase">{isOm ? 'Turee Argame' : 'Late'}</span>
              <div className="text-2xl font-bold text-gray-900">{stats.lateCount}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <XCircle size={24} />
            </div>
            <div>
              <span className="text-xs text-gray-500 font-semibold uppercase">{isOm ? 'Hafaniiru' : 'Absent'}</span>
              <div className="text-2xl font-bold text-gray-900">{stats.absentCount}</div>
            </div>
          </div>
        </div>

        {/* Check-In Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <QrCode size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isOm ? 'Koodii Hirmaannaa Galchaa' : 'Attendance Check-in'}
              </h2>
              <p className="text-xs text-gray-500">
                {isOm
                  ? 'Koodii QR walga\'ii iskään godhaa ykn lakkoofsa token harkaan galchuun check-in godhaa'
                  : 'Scan the meeting QR code with your mobile camera or paste the attendance token below'}
              </p>
            </div>
          </div>

          <form onSubmit={handleMemberScanCheckIn} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={manualScanToken}
              onChange={(e) => setManualScanToken(e.target.value)}
              placeholder={isOm ? 'Koodii QR ykn Token asitti barreessaa...' : 'Paste attendance token or JSON payload here...'}
              className={`${inputClass} font-mono`}
            />
            <button
              type="submit"
              disabled={submittingScan || !manualScanToken.trim()}
              className={`${btnPrimary} shrink-0 px-6`}
            >
              <CheckCircle2 size={16} />
              <span>{submittingScan ? t('common.loading') : isOm ? 'Hirmaadheera' : 'Check In Now'}</span>
            </button>
          </form>
        </div>

        {/* Member Records Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">
              {isOm ? 'Seenaa Hirmaannaa Hunda' : 'Full Attendance Records'}
            </h3>
            <span className="text-xs text-gray-500 font-medium">
              {memberRecords.length} {isOm ? 'galmee' : 'records'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">{isOm ? 'Walga\'ii' : 'Meeting Title'}</th>
                  <th className="px-5 py-3.5">{isOm ? 'Guyyaa (ALH & GC)' : 'Date'}</th>
                  <th className="px-5 py-3.5">{isOm ? 'Sa\'aatii' : 'Time'}</th>
                  <th className="px-5 py-3.5">{isOm ? 'Haala' : 'Status'}</th>
                  <th className="px-5 py-3.5">{isOm ? 'Madda' : 'Source'}</th>
                  <th className="px-5 py-3.5">{isOm ? 'Yaada' : 'Remarks'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {memberRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                      {isOm ? 'Galmeen hirmaannaa hin argamne.' : 'No attendance records found.'}
                    </td>
                  </tr>
                ) : (
                  memberRecords.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-gray-900">{r.meeting?.title}</td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {r.meeting?.ethiopianDate || (r.meeting?.meetingDate ? new Date(r.meeting.meetingDate).toLocaleDateString() : '—')}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString() : r.meeting?.startTime || '—'}</td>
                      <td className="px-5 py-3.5">{getStatusBadge(r.status)}</td>
                      <td className="px-5 py-3.5">{getSourceBadge(r.source)}</td>
                      <td className="px-5 py-3.5 text-gray-500">{r.remarks || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. ADMIN & AUDITOR VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const navTabs = [
    { id: 'dashboard', label: isOm ? 'Daashboordii' : 'Dashboard', icon: BarChart2 },
    { id: 'meetings', label: isOm ? 'Walga\'iiwwan' : 'Meeting Management', icon: Calendar },
    { id: 'qr', label: isOm ? 'Koodii QR' : 'QR Attendance', icon: QrCode },
    { id: 'records', label: isOm ? 'Galmee Hirmaannaa' : 'Attendance Records', icon: Users },
    { id: 'reports', label: isOm ? 'Gabaasa' : 'Attendance Reports', icon: FileSpreadsheet },
    { id: 'settings', label: isOm ? 'Qindaa\'ina' : 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={isOm ? 'Bulchiinsa Hirmaannaa QR' : 'QR Attendance Management'}
        subtitle={
          isOm
            ? 'Koodii QR fayyadamuun hirmaannaa walga\'ii qindeessaa, to\'adhaa, fi gabaasa argadhaa'
            : 'Secure, production-ready QR code attendance, meeting management, and compliance reports'
        }
        action={
          isAdmin && activeTab === 'meetings' ? (
            <button className={btnPrimary} onClick={openCreateMeetingModal}>
              <Plus size={16} />
              <span>{isOm ? 'Walga\'ii Haaraa' : 'Create Meeting'}</span>
            </button>
          ) : isAdmin && activeTab === 'records' ? (
            <button className={btnPrimary} onClick={() => setShowManualModal(true)}>
              <Plus size={16} />
              <span>{isOm ? 'Harkaan Galchi' : 'Mark Manual'}</span>
            </button>
          ) : null
        }
      />

      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto gap-2 pb-px scrollbar-none">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AttendanceTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          TAB 1: ATTENDANCE DASHBOARD
      ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase">{isOm ? 'Miseensota Qophaa\'an' : 'Active Members'}</span>
              <div className="text-2xl font-black text-gray-900 mt-1">{dashboardData?.summary?.activeMembers || 0}</div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase">{isOm ? 'Walga\'ii Hunda' : 'Total Meetings'}</span>
              <div className="text-2xl font-black text-gray-900 mt-1">{dashboardData?.summary?.totalMeetings || 0}</div>
            </div>

            <div className="bg-white rounded-xl border border-emerald-100 p-4 shadow-xs bg-emerald-50/30">
              <span className="text-[11px] font-bold text-emerald-700 uppercase">{isOm ? 'Argame' : 'Present'}</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{dashboardData?.summary?.presentCount || 0}</div>
            </div>

            <div className="bg-white rounded-xl border border-amber-100 p-4 shadow-xs bg-amber-50/30">
              <span className="text-[11px] font-bold text-amber-700 uppercase">{isOm ? 'Ture' : 'Late'}</span>
              <div className="text-2xl font-black text-amber-700 mt-1">{dashboardData?.summary?.lateCount || 0}</div>
            </div>

            <div className="bg-white rounded-xl border border-rose-100 p-4 shadow-xs bg-rose-50/30">
              <span className="text-[11px] font-bold text-rose-700 uppercase">{isOm ? 'Hin Argamne' : 'Absent'}</span>
              <div className="text-2xl font-black text-rose-700 mt-1">{dashboardData?.summary?.absentCount || 0}</div>
            </div>

            <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-xs bg-blue-50/30">
              <span className="text-[11px] font-bold text-blue-700 uppercase">{isOm ? 'Dhibbeentaa Argamnaa' : 'Attendance %'}</span>
              <div className="text-2xl font-black text-blue-700 mt-1">{dashboardData?.summary?.overallAttendanceRate || 0}%</div>
            </div>
          </div>

          {/* Active Meeting Live Widget */}
          {dashboardData?.activeMeeting && (
            <div className="bg-gradient-to-r from-emerald-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  {isOm ? 'WALGA\'II AMMAA HOJIIRRA JIRU' : 'LIVE ACTIVE MEETING'}
                </div>
                <h3 className="text-xl font-black text-white">{dashboardData.activeMeeting.title}</h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-emerald-400" />
                    {dashboardData.activeMeeting.ethiopianDate || new Date(dashboardData.activeMeeting.meetingDate).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-emerald-400" />
                    {dashboardData.activeMeeting.startTime} - {dashboardData.activeMeeting.endTime}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-400" />
                    {dashboardData.activeMeeting.location}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center bg-white/10 px-4 py-2.5 rounded-xl backdrop-blur-xs border border-white/10">
                  <span className="text-[11px] text-gray-300 block">{isOm ? 'Argamaniiru' : 'Checked In'}</span>
                  <span className="text-xl font-bold text-emerald-300">
                    {dashboardData.activeMeeting.attendanceStats?.present + dashboardData.activeMeeting.attendanceStats?.late || 0}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setSelectedMeetingIdForQR(dashboardData.activeMeeting.id);
                    setActiveTab('qr');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <QrCode size={16} />
                  <span>{isOm ? 'Koodii QR Bani' : 'Open QR Session'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Recharts Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution Chart */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <PieIcon size={16} className="text-emerald-600" />
                <span>{isOm ? 'Qoodiinsa Haala Hirmaannaa' : 'Attendance Status Distribution'}</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData?.statusDistribution || []}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                    >
                      {(dashboardData?.statusDistribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#16A34A'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Meeting Comparison Chart */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart2 size={16} className="text-emerald-600" />
                <span>{isOm ? 'Waliindorgommii Walga\'iiwwanii' : 'Recent Meeting Attendance Comparison'}</span>
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData?.meetingComparisons || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="title" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" fill="#16A34A" name={isOm ? 'Argame' : 'Present'} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" fill="#F59E0B" name={isOm ? 'Ture' : 'Late'} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" fill="#EF4444" name={isOm ? 'Hafaniiru' : 'Absent'} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 2: MEETING MANAGEMENT
      ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-gray-900">
                {isOm ? 'Tarree Walga\'iiwwan Melka Jabdu' : 'Melka Jabdu Meetings Registry'}
              </h3>
              <span className="text-xs text-gray-500 font-medium">{meetings.length} {isOm ? 'walga\'ii' : 'meetings listed'}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">{isOm ? 'Walga\'ii & Gosa' : 'Meeting & Type'}</th>
                    <th className="px-5 py-3.5">{isOm ? 'Guyyaa (ALH / GC)' : 'Ethiopian & Gregorian Date'}</th>
                    <th className="px-5 py-3.5">{isOm ? 'Sa\'aatii & Bakka' : 'Time & Location'}</th>
                    <th className="px-5 py-3.5">{isOm ? 'Hirmaannaa' : 'Attendance Stats'}</th>
                    <th className="px-5 py-3.5">{isOm ? 'Haala' : 'Status'}</th>
                    <th className="px-5 py-3.5 text-right">{isOm ? 'Gocha' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {meetings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                        {isOm ? 'Walga\'iin tokkollee hin jiru.' : 'No meetings found. Click "Create Meeting" to schedule one.'}
                      </td>
                    </tr>
                  ) : (
                    meetings.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-gray-900 block">{m.title}</span>
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                            {m.meetingType} • {m.eligibleMemberType}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-emerald-800 block">
                            {m.ethiopianDate || '—'}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {new Date(m.meetingDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-gray-900 block font-medium">
                            {m.startTime || m.meetingTime || '09:00 AM'} - {m.endTime || '11:00 AM'}
                          </span>
                          <span className="text-[11px] text-gray-500">{m.location}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          {m.attendanceStats ? (
                            <div>
                              <span className="font-bold text-gray-900">
                                {m.attendanceStats.present + m.attendanceStats.late}
                              </span>
                              <span className="text-gray-400"> / {m.attendanceStats.totalRecords} ({m.attendanceStats.attendancePercentage}%)</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              m.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.status === 'SCHEDULED'
                                ? 'bg-blue-100 text-blue-800'
                                : m.status === 'COMPLETED'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedMeetingIdForQR(m.id);
                                setActiveTab('qr');
                              }}
                              title="QR Session"
                              className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
                            >
                              <QrCode size={15} />
                            </button>

                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => openEditMeetingModal(m)}
                                  title="Edit Meeting"
                                  className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                >
                                  <Edit3 size={15} />
                                </button>
                                {m.status !== 'COMPLETED' && m.status !== 'CANCELLED' && (
                                  <button
                                    onClick={() => handleCloseMeeting(m.id)}
                                    title="Close Meeting"
                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                  >
                                    <CheckCircle2 size={15} />
                                  </button>
                                )}
                                {m.status !== 'CANCELLED' && (
                                  <button
                                    onClick={() => handleCancelMeeting(m.id)}
                                    title="Cancel Meeting"
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                                  >
                                    <XCircle size={15} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 3: QR ATTENDANCE
      ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'qr' && (
        <div className="space-y-6">
          {/* Meeting Selector Header */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="w-full sm:max-w-md">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {isOm ? 'Walga\'ii Filadhaa' : 'Select Meeting for QR Session'}
              </label>
              <select
                value={selectedMeetingIdForQR}
                onChange={(e) => setSelectedMeetingIdForQR(e.target.value)}
                className={inputClass}
              >
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.ethiopianDate || new Date(m.meetingDate).toLocaleDateString()}) - [{m.status}]
                  </option>
                ))}
              </select>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <select
                  value={qrDurationMinutes}
                  onChange={(e) => setQrDurationMinutes(Number(e.target.value))}
                  className={`${inputClass} !w-auto text-xs`}
                >
                  <option value={15}>15 {isOm ? 'Daqiiqaa' : 'Minutes'}</option>
                  <option value={30}>30 {isOm ? 'Daqiiqaa' : 'Minutes'}</option>
                  <option value={45}>45 {isOm ? 'Daqiiqaa' : 'Minutes'}</option>
                  <option value={60}>60 {isOm ? 'Daqiiqaa' : 'Minutes'}</option>
                  <option value={90}>90 {isOm ? 'Daqiiqaa' : 'Minutes'}</option>
                  <option value={120}>120 {isOm ? 'Daqiiqaa' : 'Minutes'}</option>
                </select>

                <button onClick={qrSessionData ? handleRegenerateQR : handleGenerateQR} className={btnPrimary}>
                  <QrCode size={16} />
                  <span>{qrSessionData ? (isOm ? 'Haaromsaa' : 'Regenerate') : isOm ? 'Koodii QR Uumi' : 'Generate QR'}</span>
                </button>
              </div>
            )}
          </div>

          {/* QR Display Card */}
          {qrSessionData ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                {/* QR Code Graphic Frame */}
                <div className="flex flex-col items-center">
                  <div className="p-4 bg-white rounded-2xl border-2 border-emerald-500 shadow-md relative">
                    {qrSessionData.status === 'PAUSED' && (
                      <div className="absolute inset-0 bg-white/90 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center gap-2 z-10">
                        <Pause size={36} className="text-amber-500" />
                        <span className="font-bold text-xs uppercase text-amber-700 tracking-wider">
                          {isOm ? 'Yeroof Dhaabbateera' : 'Session Paused'}
                        </span>
                      </div>
                    )}
                    {qrSessionData.status === 'CLOSED' && (
                      <div className="absolute inset-0 bg-white/90 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center gap-2 z-10">
                        <XCircle size={36} className="text-gray-500" />
                        <span className="font-bold text-xs uppercase text-gray-700 tracking-wider">
                          {isOm ? 'Cufameera' : 'Session Closed'}
                        </span>
                      </div>
                    )}
                    <img
                      src={qrSessionData.qrCodeDataUrl}
                      alt="Attendance QR Code"
                      className="w-64 h-64 sm:w-72 sm:h-72 object-contain"
                    />
                  </div>

                  {/* Status & Countdown */}
                  <div className="mt-4 flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        qrSessionData.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : qrSessionData.status === 'PAUSED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${qrSessionData.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                      {qrSessionData.status}
                    </span>

                    {qrSessionData.status === 'ACTIVE' && (
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        <Clock size={13} />
                        {formatCountdown(qrRemainingSeconds)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Session Details & Interactive Controls */}
                <div className="flex-1 max-w-md space-y-5 text-center lg:text-left">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                      {isOm ? 'Walga\'ii Ammaa' : 'Current Meeting Session'}
                    </span>
                    <h2 className="text-2xl font-black text-gray-900">{selectedMeeting?.title}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedMeeting?.ethiopianDate} • {selectedMeeting?.location}
                    </p>
                  </div>

                  {/* Token Box */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      {isOm ? 'Token Hirmaannaa' : 'Session Token'}
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-slate-800 truncate select-all">
                        {qrSessionData.sessionToken}
                      </span>
                      <button
                        onClick={handleCopyToken}
                        className="px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        {copiedToken ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-2">
                    <button
                      onClick={() => setIsFullscreenQR(true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Maximize2 size={14} />
                      <span>{isOm ? 'Iskiriinii Guutuu' : 'Fullscreen Presenter'}</span>
                    </button>

                    <button
                      onClick={handleDownloadQR}
                      className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download size={14} />
                      <span>PNG</span>
                    </button>

                    <button
                      onClick={handlePrintQR}
                      className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer size={14} />
                      <span>{isOm ? 'Maxxansi' : 'Print Flyer'}</span>
                    </button>

                    {isAdmin && (
                      <>
                        {qrSessionData.status === 'ACTIVE' ? (
                          <button
                            onClick={handlePauseQR}
                            className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Pause size={14} />
                            <span>{isOm ? 'Dhaabi' : 'Pause'}</span>
                          </button>
                        ) : qrSessionData.status === 'PAUSED' ? (
                          <button
                            onClick={handleResumeQR}
                            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Play size={14} />
                            <span>{isOm ? 'Itti Fufsiisi' : 'Resume'}</span>
                          </button>
                        ) : null}

                        {qrSessionData.status !== 'CLOSED' && (
                          <>
                            <button
                              onClick={handleRegenerateQR}
                              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <RotateCcw size={14} />
                              <span>{isOm ? 'Haaromsaa' : 'Regenerate'}</span>
                            </button>
                            <button
                              onClick={handleCloseQR}
                              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <XCircle size={14} />
                              <span>{isOm ? 'Cufi' : 'Close Session'}</span>
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-xs">
              <QrCode size={48} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-base font-bold text-gray-800">
                {isOm ? 'Koodiin QR hin uumamne' : 'No Active QR Session for this Meeting'}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
                {isOm
                  ? 'Walga\'ii kanaaf koodii QR maddisiisuun hirmaattotaaf iskiriinii irratti agarsiisaa.'
                  : 'Click the button below to generate a secure random attendance QR code token with an expiration timer.'}
              </p>
              {isAdmin && (
                <button onClick={handleGenerateQR} className={btnPrimary}>
                  <QrCode size={16} />
                  <span>{isOm ? 'Koodii QR Maddisiisi' : 'Generate QR Session'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 4: ATTENDANCE RECORDS
      ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">{isOm ? 'Walga\'ii' : 'Meeting'}</label>
              <select
                value={filterMeetingId}
                onChange={(e) => {
                  setFilterMeetingId(e.target.value);
                  setRecordPage(1);
                }}
                className={inputClass}
              >
                <option value="">{isOm ? 'Walga\'ii Hunda' : 'All Meetings'}</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">{isOm ? 'Haala' : 'Status'}</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setRecordPage(1);
                }}
                className={inputClass}
              >
                <option value="">{isOm ? 'Haala Hunda' : 'All Statuses'}</option>
                <option value="PRESENT">{isOm ? 'Argame' : 'Present'}</option>
                <option value="LATE">{isOm ? 'Ture' : 'Late'}</option>
                <option value="ABSENT">{isOm ? 'Hin Argamne' : 'Absent'}</option>
                <option value="EXCUSED">{isOm ? 'Eeyyama' : 'Excused'}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">{isOm ? 'Madda' : 'Source'}</label>
              <select
                value={filterSource}
                onChange={(e) => {
                  setFilterSource(e.target.value);
                  setRecordPage(1);
                }}
                className={inputClass}
              >
                <option value="">{isOm ? 'Madda Hunda' : 'All Sources'}</option>
                <option value="QR">QR Code</option>
                <option value="MANUAL">Manual</option>
                <option value="CORRECTION">Correction</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">{isOm ? 'Barbaadi' : 'Search'}</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setRecordPage(1);
                  }}
                  placeholder={isOm ? 'Maqaa, ID, ykn bilbila...' : 'Name, Member ID, phone...'}
                  className={inputClass}
                />
                <Search size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                {isOm ? 'Galmee Hirmaannaa Miseensotaa' : 'Member Attendance Records'}
              </h3>
              <span className="text-xs text-gray-500 font-medium">{totalRecords} {isOm ? 'galmee' : 'records found'}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">{isOm ? 'Miseensa' : 'Member'}</th>
                    <th className="px-5 py-3.5">{isOm ? 'Walga\'ii' : 'Meeting'}</th>
                    <th className="px-5 py-3.5">{isOm ? 'Haala' : 'Status'}</th>
                    <th className="px-5 py-3.5">{isOm ? 'Madda' : 'Source'}</th>
                    <th className="px-5 py-3.5">{isOm ? 'Sa\'aatii Galmee' : 'Check-In Time'}</th>
                    <th className="px-5 py-3.5">{isOm ? 'Yaada' : 'Remarks'}</th>
                    {isAdmin && <th className="px-5 py-3.5 text-right">{isOm ? 'Sirreeffama' : 'Correction'}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                        {isOm ? 'Galmeen hin argamne.' : 'No records match the current filters.'}
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-gray-900 block">{r.member?.fullName}</span>
                          <span className="text-[11px] text-gray-400 font-mono">{r.member?.memberId}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-gray-800 block">{r.meeting?.title}</span>
                          <span className="text-[11px] text-gray-400">
                            {r.meeting?.ethiopianDate || (r.meeting?.meetingDate ? new Date(r.meeting.meetingDate).toLocaleDateString() : '')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">{getStatusBadge(r.status)}</td>
                        <td className="px-5 py-3.5">{getSourceBadge(r.source)}</td>
                        <td className="px-5 py-3.5 text-gray-600">
                          {r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString() : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate">
                          {r.remarks || '—'}
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => openCorrectionModal(r)}
                              className="px-2.5 py-1 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-colors cursor-pointer"
                            >
                              {isOm ? 'Sirreessi' : 'Correct'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 5: ATTENDANCE REPORTS
      ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isOm ? 'Gabaasa Hirmaannaa Walga\'ii' : 'Attendance Analytics & Compliance Report'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isOm ? 'Gabaasa guutuu Excel ykn PDF tiin baasaa ykn maxxansaa' : 'Export attendance metrics or generate printable compliance summaries'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handleExportCSV} className={btnSecondary}>
                <FileSpreadsheet size={16} />
                <span>{isOm ? 'CSV Baasi' : 'Export Excel/CSV'}</span>
              </button>
              <button onClick={handlePrintQR} className={btnSecondary}>
                <Printer size={16} />
                <span>{isOm ? 'Maxxansi' : 'Print'}</span>
              </button>
            </div>
          </div>

          {/* Meeting Aggregate Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100">
              <h4 className="font-bold text-xs uppercase text-gray-500 tracking-wider">
                {isOm ? 'Cuunfaa Walga\'ii Hunda' : 'Meeting Aggregate Performance'}
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">{isOm ? 'Walga\'ii' : 'Meeting Title'}</th>
                    <th className="px-5 py-3.5">{isOm ? 'Guyyaa ALH' : 'Ethiopian Date'}</th>
                    <th className="px-5 py-3.5 text-center">{isOm ? 'Argame' : 'Present'}</th>
                    <th className="px-5 py-3.5 text-center">{isOm ? 'Ture' : 'Late'}</th>
                    <th className="px-5 py-3.5 text-center">{isOm ? 'Hafaniiru' : 'Absent'}</th>
                    <th className="px-5 py-3.5 text-center">{isOm ? 'Eeyyama' : 'Excused'}</th>
                    <th className="px-5 py-3.5 text-right">{isOm ? 'Dhibbeentaa' : 'Attendance %'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {meetings.map((m) => {
                    const stats = m.attendanceStats || { present: 0, late: 0, absent: 0, excused: 0, attendancePercentage: 0 };
                    return (
                      <tr key={m.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3.5 font-bold text-gray-900">{m.title}</td>
                        <td className="px-5 py-3.5 text-emerald-800 font-medium">{m.ethiopianDate || '—'}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-emerald-700">{stats.present}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-amber-700">{stats.late}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-rose-700">{stats.absent}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-indigo-700">{stats.excused}</td>
                        <td className="px-5 py-3.5 text-right font-black text-gray-900">
                          {stats.attendancePercentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 6: ATTENDANCE SETTINGS
      ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs max-w-2xl">
          <div className="flex items-center gap-3 pb-6 border-b border-gray-100 mb-6">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <Settings size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isOm ? 'Qindaa\'ina To\'annoo Hirmaannaa' : 'Attendance Policy & Rules'}
              </h3>
              <p className="text-xs text-gray-500">
                {isOm
                  ? 'Yeroo check-in duraanii, yeroo turinsaa, fi turtii koodii QR murteessaa'
                  : 'Configure grace periods, late arrival thresholds, and default QR session timers'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {isOm ? 'Yeroo Check-In Duraa (Daqiiqaa)' : 'Early Check-In Window (Minutes)'}
              </label>
              <input
                type="number"
                min={0}
                max={180}
                disabled={isAuditor}
                value={settingsData.earlyCheckInMinutes}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, earlyCheckInMinutes: Number(e.target.value) })
                }
                className={inputClass}
              />
              <p className="text-[11px] text-gray-500 mt-1">
                {isOm
                  ? 'Miseensonni walga\'iin eegaluun daqiiqaa meeqa dura koodii scan gochuu danda\'u.'
                  : 'Minutes prior to meeting start time members are permitted to check in.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {isOm ? 'Yeroo Turinsaa (Daqiiqaa)' : 'Late Arrival Threshold (Minutes)'}
              </label>
              <input
                type="number"
                min={0}
                max={120}
                disabled={isAuditor}
                value={settingsData.lateThresholdMinutes}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, lateThresholdMinutes: Number(e.target.value) })
                }
                className={inputClass}
              />
              <p className="text-[11px] text-gray-500 mt-1">
                {isOm
                  ? 'Daqiiqaa kana booda miseensi check-in godhe \'Ture\' jedhamee galmaa\'a.'
                  : 'Check-ins beyond this window past start time are automatically categorized as LATE.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {isOm ? 'Turtii Koodii QR (Daqiiqaa)' : 'Default QR Expiration Duration (Minutes)'}
              </label>
              <input
                type="number"
                min={5}
                max={300}
                disabled={isAuditor}
                value={settingsData.defaultQRExpirationMinutes}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, defaultQRExpirationMinutes: Number(e.target.value) })
                }
                className={inputClass}
              />
              <p className="text-[11px] text-gray-500 mt-1">
                {isOm
                  ? 'Turtii yeroo koodiin QR haaraan hojiirra turu.'
                  : 'Default expiration timer assigned when generating a new QR attendance session.'}
              </p>
            </div>

            {isAdmin && (
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button type="submit" disabled={savingSettings} className={btnPrimary}>
                  <span>{savingSettings ? t('common.loading') : isOm ? 'Olkaa\'i' : 'Save Attendance Policy'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: CREATE / EDIT MEETING
      ───────────────────────────────────────────────────────────────── */}
      {showMeetingModal && (
        <Modal
          open={showMeetingModal}
          onClose={() => setShowMeetingModal(false)}
          title={
            editingMeeting
              ? isOm
                ? 'Walga\'ii Gulaali'
                : 'Edit Meeting'
              : isOm
              ? 'Walga\'ii Haaraa Uumi'
              : 'Create New Meeting'
          }
        >
          <form onSubmit={handleSaveMeeting} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {isOm ? 'Mata Duree Walga\'ii' : 'Meeting Title'} *
              </label>
              <input
                type="text"
                required
                value={meetingForm.title}
                onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                placeholder="e.g. Melka Jabdu Monthly Assembly"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {isOm ? 'Gosa Walga\'ii' : 'Meeting Type'}
                </label>
                <select
                  value={meetingForm.meetingType}
                  onChange={(e) => setMeetingForm({ ...meetingForm, meetingType: e.target.value })}
                  className={inputClass}
                >
                  <option value="REGULAR">{isOm ? 'Idilee' : 'Regular'}</option>
                  <option value="EMERGENCY">{isOm ? 'Aariifachiisaa' : 'Emergency'}</option>
                  <option value="ANNUAL">{isOm ? 'Waggaa' : 'Annual'}</option>
                  <option value="SPECIAL">{isOm ? 'Addaa' : 'Special'}</option>
                  <option value="OTHER">{isOm ? 'Kan biroo' : 'Other'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {isOm ? 'Miseensota Eeyyamaman' : 'Eligible Members'}
                </label>
                <select
                  value={meetingForm.eligibleMemberType}
                  onChange={(e) => setMeetingForm({ ...meetingForm, eligibleMemberType: e.target.value })}
                  className={inputClass}
                >
                  <option value="ALL">{isOm ? 'Miseensota Hunda' : 'All Members'}</option>
                  <option value="COMMITTEE">{isOm ? 'Koree Qofa' : 'Committee Members Only'}</option>
                  <option value="LEADERS">{isOm ? 'Hoggantoota Qofa' : 'Leaders Only'}</option>
                </select>
              </div>
            </div>

            {/* Ethiopian Date Selector */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                {isOm ? 'Guyyaa Walga\'ii (Dhaha Itoophiyaa)' : 'Ethiopian Meeting Date'}
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">
                    {isOm ? 'Waggaa (ALH)' : 'Year (E.C.)'}
                  </label>
                  <select
                    value={meetingForm.ethYear}
                    onChange={(e) => setMeetingForm({ ...meetingForm, ethYear: Number(e.target.value) })}
                    className={inputClass}
                  >
                    {[2016, 2017, 2018, 2019, 2020].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">
                    {isOm ? 'Ji\'a' : 'Month'}
                  </label>
                  <select
                    value={meetingForm.ethMonth}
                    onChange={(e) => setMeetingForm({ ...meetingForm, ethMonth: Number(e.target.value) })}
                    className={inputClass}
                  >
                    {ETHIOPIAN_MONTHS.map((m) => (
                      <option key={m.number} value={m.number}>
                        {m.number}. {m.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase block mb-1">
                    {isOm ? 'Guyyaa' : 'Day'}
                  </label>
                  <select
                    value={meetingForm.ethDate}
                    onChange={(e) => setMeetingForm({ ...meetingForm, ethDate: Number(e.target.value) })}
                    className={inputClass}
                  >
                    {Array.from(
                      { length: getDaysInEthiopianMonth(meetingForm.ethYear, meetingForm.ethMonth) },
                      (_, i) => i + 1
                    ).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Gregorian Equivalent preview */}
              <div className="text-[11px] text-slate-600 font-medium pt-1">
                {isOm ? 'Walqixa Faranjii: ' : 'Gregorian Equivalent: '}
                <strong className="text-emerald-700">
                  {toGregorianDate(meetingForm.ethYear, meetingForm.ethMonth, meetingForm.ethDate).toDateString()}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {isOm ? 'Sa\'aatii Jalqabaa' : 'Start Time'}
                </label>
                <input
                  type="text"
                  value={meetingForm.startTime}
                  onChange={(e) => setMeetingForm({ ...meetingForm, startTime: e.target.value })}
                  placeholder="09:00 AM"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {isOm ? 'Sa\'aatii Xumuraa' : 'End Time'}
                </label>
                <input
                  type="text"
                  value={meetingForm.endTime}
                  onChange={(e) => setMeetingForm({ ...meetingForm, endTime: e.target.value })}
                  placeholder="11:00 AM"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {isOm ? 'Bakka' : 'Location'}
              </label>
              <input
                type="text"
                value={meetingForm.location}
                onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {isOm ? 'Ibsa / Ajandaa' : 'Description / Agenda'}
              </label>
              <textarea
                rows={3}
                value={meetingForm.description}
                onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowMeetingModal(false)}
                className={btnSecondary}
              >
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={savingMeeting} className={btnPrimary}>
                <span>{savingMeeting ? t('common.loading') : t('common.save')}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: MANUAL ATTENDANCE
      ───────────────────────────────────────────────────────────────── */}
      {showManualModal && (
        <Modal
          open={showManualModal}
          onClose={() => setShowManualModal(false)}
          title={isOm ? 'Hirmaannaa Harkaan Galchi' : 'Mark Manual Attendance'}
        >
          <form onSubmit={handleSaveManualAttendance} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {isOm ? 'Walga\'ii Filadhaa' : 'Select Meeting'} *
              </label>
              <select
                required
                value={manualForm.meetingId}
                onChange={(e) => setManualForm({ ...manualForm, meetingId: e.target.value })}
                className={inputClass}
              >
                <option value="">-- Choose Meeting --</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.ethiopianDate || new Date(m.meetingDate).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {isOm ? 'Miseensa Filadhaa' : 'Select Member'} *
              </label>
              <select
                required
                value={manualForm.memberId}
                onChange={(e) => setManualForm({ ...manualForm, memberId: e.target.value })}
                className={inputClass}
              >
                <option value="">-- Choose Member --</option>
                {membersList.map((mem) => (
                  <option key={mem.id} value={mem.id}>
                    {mem.fullName} ({mem.memberId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {isOm ? 'Haala Hirmaannaa' : 'Attendance Status'} *
              </label>
              <select
                value={manualForm.status}
                onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                className={inputClass}
              >
                <option value="PRESENT">{isOm ? 'Argame' : 'Present'}</option>
                <option value="LATE">{isOm ? 'Ture' : 'Late'}</option>
                <option value="ABSENT">{isOm ? 'Hin Argamne' : 'Absent'}</option>
                <option value="EXCUSED">{isOm ? 'Eeyyama' : 'Excused'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {isOm ? 'Yaada' : 'Remarks'}
              </label>
              <input
                type="text"
                value={manualForm.remarks}
                onChange={(e) => setManualForm({ ...manualForm, remarks: e.target.value })}
                placeholder="e.g. Checked in manually at reception"
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className={btnSecondary}
              >
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={savingManual} className={btnPrimary}>
                <span>{savingManual ? t('common.loading') : isOm ? 'Galmeessi' : 'Record'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: ATTENDANCE CORRECTION (AUDITED)
      ───────────────────────────────────────────────────────────────── */}
      {showCorrectionModal && correctingRecord && (
        <Modal
          open={showCorrectionModal}
          onClose={() => setShowCorrectionModal(false)}
          title={isOm ? 'Sirreeffama Hirmaannaa Galmeessi' : 'Audited Attendance Correction'}
        >
          <form onSubmit={handleSaveCorrection} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="font-bold text-slate-800">{correctingRecord.member?.fullName}</div>
              <div className="text-slate-500">{correctingRecord.meeting?.title}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-slate-500">{isOm ? 'Haala Duraanii:' : 'Previous Status:'}</span>
                {getStatusBadge(correctingRecord.status)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {isOm ? 'Haala Haaraa' : 'New Status'} *
              </label>
              <select
                value={correctionForm.newStatus}
                onChange={(e) => setCorrectionForm({ ...correctionForm, newStatus: e.target.value })}
                className={inputClass}
              >
                <option value="PRESENT">{isOm ? 'Argame' : 'Present'}</option>
                <option value="LATE">{isOm ? 'Ture' : 'Late'}</option>
                <option value="ABSENT">{isOm ? 'Hin Argamne' : 'Absent'}</option>
                <option value="EXCUSED">{isOm ? 'Eeyyama' : 'Excused'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-rose-700 uppercase mb-1">
                {isOm ? 'Sababa Sirreeffamaa (Dirqama)' : 'Reason for Correction (Mandatory)'} *
              </label>
              <textarea
                required
                rows={3}
                value={correctionForm.reason}
                onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                placeholder={isOm ? 'Sababa sirreeffama kanaa ifaan galchaa...' : 'State why this record is being corrected for auditor compliance...'}
                className={`${inputClass} border-rose-300 focus:border-rose-500`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                {isOm ? 'Yaada Dabalataa' : 'Additional Remarks'}
              </label>
              <input
                type="text"
                value={correctionForm.remarks}
                onChange={(e) => setCorrectionForm({ ...correctionForm, remarks: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className={btnSecondary}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={savingCorrection || !correctionForm.reason.trim()}
                className={`${btnPrimary} bg-purple-600 hover:bg-purple-700`}
              >
                <span>{savingCorrection ? t('common.loading') : isOm ? 'Sirreessi & Galmeessi' : 'Save Correction'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          FULLSCREEN PROJECTOR VIEW MODAL
      ───────────────────────────────────────────────────────────────── */}
      {isFullscreenQR && qrSessionData && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-8 sm:p-12 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30">
                <QrCode size={24} />
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold block">
                  MELKA JABDU YOUTH ASSOCIATION
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white">{selectedMeeting?.title}</h1>
              </div>
            </div>

            <button
              onClick={() => setIsFullscreenQR(false)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/15 cursor-pointer"
            >
              <Minimize2 size={16} />
              <span>{isOm ? 'Bahi' : 'Exit Fullscreen'}</span>
            </button>
          </div>

          <div className="flex flex-col items-center justify-center my-auto">
            <div className="p-6 bg-white rounded-3xl shadow-2xl border-4 border-emerald-400">
              <img
                src={qrSessionData.qrCodeDataUrl}
                alt="Fullscreen QR"
                className="w-80 h-80 sm:w-96 sm:h-96 object-contain"
              />
            </div>

            <div className="mt-6 text-center space-y-2">
              <div className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                {isOm ? 'Appilikeeshinii Moobaayilaatiin Scan Godhaa' : 'Scan With Member Mobile App'}
              </div>
              <div className="flex items-center justify-center gap-3 text-sm text-emerald-300 font-mono">
                <Clock size={16} />
                <span>{formatCountdown(qrRemainingSeconds)} {isOm ? 'hafeera' : 'remaining'}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-gray-500 font-medium">
            {selectedMeeting?.ethiopianDate} • {selectedMeeting?.location} • Afosha Management System
          </div>
        </div>
      )}
    </div>
  );
}
