import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, FileText, Activity, HeartHandshake, Search, CalendarCheck } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, LoadingSpinner, Badge, inputClass, Select } from '../components/ui';
import { formatMeetingShort } from '../lib/meetingUtils';

interface Payment {
  id: string;
  paymentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  member: { fullName: string; memberId: string };
  recordedBy: { username: string } | null;
  verifiedBy: { username: string } | null;
  obligation?: { weekNumber: number; year: number };
  specialContributionObligation?: { specialContribution: { title: string } };
  notes?: string;
}

interface AttendanceRecord {
  id: string;
  status: string;
  remarks?: string;
  createdAt: string;
  member: { fullName: string; memberId: string };
  recordedBy: { username: string };
  meeting: { meetingDate: string; title: string };
}

interface LedgerEntry {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
  member: { fullName: string; memberId: string };
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  metadata: any;
  createdAt: string;
  user: { username: string };
  ipAddress: string;
}

interface SpecialContribution {
  id: string;
  campaignId: string;
  type: string;
  title: string;
  amount: number;
  dueDate: string;
  createdAt: string;
  beneficiaryMember: { fullName: string; memberId: string };
  createdBy: { username: string };
  _count: { obligations: number };
}

interface HistoryData {
  payments: Payment[];
  ledgerEntries: LedgerEntry[];
  auditEntries: AuditEntry[];
  specialContributions: SpecialContribution[];
  attendanceRecords: AttendanceRecord[];
  totals: {
    payments: number;
    ledgerEntries: number;
    auditEntries: number;
    specialContributions: number;
    attendanceRecords: number;
  };
}

type HistoryTab = 'PAYMENTS' | 'TRANSACTIONS' | 'ACTIVITY' | 'CAMPAIGNS' | 'ATTENDANCE';

export default function HistoryPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<HistoryTab>('PAYMENTS');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'ALL' | 'WEEKLY' | 'SPECIAL' | 'PENALTY'>('ALL');
  const [meetingFilter, setMeetingFilter] = useState<string>('ALL');
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const tabs = [
    { id: 'PAYMENTS' as const, label: 'Payment History', icon: <CreditCard size={18} />, count: historyData?.totals.payments || 0 },
    { id: 'TRANSACTIONS' as const, label: 'Transaction History', icon: <FileText size={18} />, count: historyData?.totals.ledgerEntries || 0 },
    { id: 'ACTIVITY' as const, label: 'Activity Log', icon: <Activity size={18} />, count: historyData?.totals.auditEntries || 0 },
    { id: 'CAMPAIGNS' as const, label: 'Campaign History', icon: <HeartHandshake size={18} />, count: historyData?.totals.specialContributions || 0 },
    { id: 'ATTENDANCE' as const, label: 'Attendance History', icon: <CalendarCheck size={18} />, count: historyData?.totals.attendanceRecords || 0 },
  ];

  useEffect(() => {
    loadHistory();
  }, [page]);

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/dashboard/history', { params: { page, limit: 50 } });
      setHistoryData(data.data);
    } catch {
      setError('Failed to load history data. Please try again.');
      setHistoryData(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = historyData?.payments.filter(p => {
    const searchMatch = p.member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.paymentId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Determine if this is a penalty payment
    // A payment is a penalty if it has no obligation/specialObligation AND notes mention Week
    const isPenalty = !p.obligation && !p.specialContributionObligation && (
      (p.notes && (p.notes.includes('Penalty payment') || p.notes.toLowerCase().includes('penalty'))) ||
      (p.notes && p.notes.includes('Week') && !p.notes.includes('contribution'))
    );
    
    const typeMatch = paymentTypeFilter === 'ALL' ||
      (paymentTypeFilter === 'WEEKLY' && p.obligation) ||
      (paymentTypeFilter === 'SPECIAL' && p.specialContributionObligation) ||
      (paymentTypeFilter === 'PENALTY' && isPenalty);
    return searchMatch && typeMatch;
  }) || [];

  const filteredLedger = historyData?.ledgerEntries.filter(l =>
    l.member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredAudit = historyData?.auditEntries.filter(a =>
    a.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.user.username.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredCampaigns = historyData?.specialContributions.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.beneficiaryMember.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredAttendance = historyData?.attendanceRecords.filter(a => {
    const searchMatch = a.member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.meeting.title.toLowerCase().includes(searchTerm.toLowerCase());
    const meetingMatch = meetingFilter === 'ALL' || a.meeting.title === meetingFilter;
    return searchMatch && meetingMatch;
  }) || [];

  // Get unique meetings for sub-tabs
  const uniqueMeetings = historyData?.attendanceRecords.reduce((acc, record) => {
    if (!acc.includes(record.meeting.title)) {
      acc.push(record.meeting.title);
    }
    return acc;
  }, [] as string[]) || [];

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={t('nav.history')} />

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
            <p className="text-sm text-slate-600 mb-4">{error}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setError('')}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { setError(''); loadHistory(); }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-xl overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1); if (tab.id === 'ATTENDANCE') setMeetingFilter('ALL'); }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            <span className="hidden xs:inline">{tab.label}</span>
            <span className="xs:hidden">{tab.label.split(' ')[0]}</span>
            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputClass} pl-10`}
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {activeTab === 'PAYMENTS' && (
        <>
          {/* Payment type sub-tabs */}
          <div className="flex gap-2 mb-4 bg-slate-100 p-1.5 rounded-xl overflow-x-auto">
            {[
              { id: 'ALL' as const, label: 'All Payments', count: historyData?.payments.length || 0 },
              { id: 'WEEKLY' as const, label: 'Weekly', count: historyData?.payments.filter(p => p.obligation).length || 0 },
              { id: 'SPECIAL' as const, label: 'Special', count: historyData?.payments.filter(p => p.specialContributionObligation).length || 0 },
              { id: 'PENALTY' as const, label: 'Penalty', count: historyData?.payments.filter(p => !p.obligation && !p.specialContributionObligation && ((p.notes && (p.notes.includes('Penalty payment') || p.notes.toLowerCase().includes('penalty'))) || (p.notes && p.notes.includes('Week') && !p.notes.includes('contribution')))).length || 0 },
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setPaymentTypeFilter(filter.id)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  paymentTypeFilter === filter.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {filter.label}
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-2">{filter.count}</span>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Payment ID</th>
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Member</th>
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="px-4 sm:px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Method</th>
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPayments.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 sm:px-5 py-10 text-center text-sm text-slate-400">No payments found.</td></tr>
                ) : filteredPayments.map(payment => {
                  // Use the same enhanced penalty detection as the filter
                  const isPenaltyPayment = !payment.obligation && !payment.specialContributionObligation && (
                    (payment.notes && (payment.notes.includes('Penalty payment') || payment.notes.toLowerCase().includes('penalty'))) ||
                    (payment.notes && payment.notes.includes('Week') && !payment.notes.includes('contribution'))
                  );
                  const paymentType = payment.obligation ? 'WEEKLY' : payment.specialContributionObligation ? 'SPECIAL' : isPenaltyPayment ? 'PENALTY' : 'GENERAL';
                  const typeColor = paymentType === 'WEEKLY' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : paymentType === 'SPECIAL' ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' : paymentType === 'PENALTY' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200';
                  const typeLabel = paymentType === 'WEEKLY' ? 'Weekly' : paymentType === 'SPECIAL' ? 'Special' : paymentType === 'PENALTY' ? 'Penalty' : 'General';
                  const typeDetail = paymentType === 'WEEKLY' && payment.obligation ? formatMeetingShort(payment.obligation.weekNumber) : paymentType === 'SPECIAL' && payment.specialContributionObligation ? payment.specialContributionObligation.specialContribution?.title : paymentType === 'PENALTY' ? '' : '';
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-4 sm:px-5 py-3 text-xs font-mono text-slate-400">{payment.paymentId}</td>
                      <td className="px-4 sm:px-5 py-3">
                        <p className="text-sm font-medium text-slate-800">{payment.member.fullName}</p>
                        <p className="text-xs text-slate-400">#{payment.member.memberId}</p>
                      </td>
                      <td className="px-4 sm:px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeColor}`}>
                          {typeLabel}
                        </span>
                        {typeDetail && <p className="text-xs text-slate-400 mt-1">{typeDetail}</p>}
                      </td>
                      <td className="px-4 sm:px-5 py-3 text-right text-sm font-bold text-slate-800">{Number(payment.amount).toLocaleString()} ETB</td>
                      <td className="px-4 sm:px-5 py-3 text-xs text-slate-500">{payment.paymentMethod.replace(/_/g, ' ')}</td>
                      <td className="px-4 sm:px-5 py-3 text-sm text-slate-500">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                      <td className="px-4 sm:px-5 py-3"><Badge status={payment.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'TRANSACTIONS' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Member</th>
                <th className="px-4 sm:px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Amount</th>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLedger.length === 0 ? (
                <tr><td colSpan={5} className="px-4 sm:px-5 py-10 text-center text-sm text-slate-400">No transactions found.</td></tr>
              ) : filteredLedger.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-4 sm:px-5 py-3 text-xs font-medium text-slate-600">{entry.type}</td>
                  <td className="px-4 sm:px-5 py-3">
                    <p className="text-sm font-medium text-slate-800">{entry.member.fullName}</p>
                    <p className="text-xs text-slate-400">#{entry.member.memberId}</p>
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-right text-sm font-bold text-slate-800">{Number(entry.amount).toLocaleString()} ETB</td>
                  <td className="px-4 sm:px-5 py-3 text-xs text-slate-500">{entry.description}</td>
                  <td className="px-4 sm:px-5 py-3 text-sm text-slate-500">{new Date(entry.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'ACTIVITY' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Action</th>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Entity</th>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">IP Address</th>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredAudit.length === 0 ? (
                <tr><td colSpan={5} className="px-4 sm:px-5 py-10 text-center text-sm text-slate-400">No activity found.</td></tr>
              ) : filteredAudit.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-4 sm:px-5 py-3 text-xs font-medium text-slate-600">{entry.action}</td>
                  <td className="px-4 sm:px-5 py-3 text-sm text-slate-800">{entry.user.username}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs text-slate-500">{entry.entityType}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs text-slate-400">{entry.ipAddress}</td>
                  <td className="px-4 sm:px-5 py-3 text-sm text-slate-500">{new Date(entry.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'CAMPAIGNS' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Campaign ID</th>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Title</th>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Beneficiary</th>
                <th className="px-4 sm:px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Amount</th>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Obligations</th>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Created By</th>
                <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCampaigns.length === 0 ? (
                <tr><td colSpan={8} className="px-4 sm:px-5 py-10 text-center text-sm text-slate-400">No campaigns found.</td></tr>
              ) : filteredCampaigns.map(campaign => (
                <tr key={campaign.id} className="hover:bg-slate-50">
                  <td className="px-4 sm:px-5 py-3 text-xs font-mono text-slate-400">{campaign.campaignId}</td>
                  <td className="px-4 sm:px-5 py-3 text-sm font-medium text-slate-800">{campaign.title}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs text-slate-500">{campaign.type}</td>
                  <td className="px-4 sm:px-5 py-3">
                    <p className="text-sm font-medium text-slate-800">{campaign.beneficiaryMember.fullName}</p>
                    <p className="text-xs text-slate-400">#{campaign.beneficiaryMember.memberId}</p>
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-right text-sm font-bold text-slate-800">{Number(campaign.amount).toLocaleString()} ETB</td>
                  <td className="px-4 sm:px-5 py-3 text-xs text-slate-500">{campaign._count.obligations}</td>
                  <td className="px-4 sm:px-5 py-3 text-xs text-slate-500">{campaign.createdBy.username}</td>
                  <td className="px-4 sm:px-5 py-3 text-sm text-slate-500">{new Date(campaign.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'ATTENDANCE' && (
        <>
          {/* Meeting filter dropdown */}
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Filter by Meeting:</label>
            <Select
              value={meetingFilter}
              onChange={(value) => setMeetingFilter(value)}
              options={[
                { value: 'ALL', label: `All Meetings (${historyData?.attendanceRecords.length || 0})` },
                ...uniqueMeetings.map(meeting => ({
                  value: meeting,
                  label: `${meeting} (${historyData?.attendanceRecords.filter(a => a.meeting.title === meeting).length || 0})`
                }))
              ]}
              placeholder="Select meeting..."
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Member</th>
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Meeting</th>
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Meeting Date</th>
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Remarks</th>
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Recorded By</th>
                  <th className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAttendance.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 sm:px-5 py-10 text-center text-sm text-slate-400">No attendance records found.</td></tr>
                ) : filteredAttendance.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 sm:px-5 py-3">
                      <p className="text-sm font-medium text-slate-800">{record.member.fullName}</p>
                      <p className="text-xs text-slate-400">#{record.member.memberId}</p>
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-sm text-slate-800">{record.meeting.title}</td>
                    <td className="px-4 sm:px-5 py-3 text-sm text-slate-500">{new Date(record.meeting.meetingDate).toLocaleDateString()}</td>
                    <td className="px-4 sm:px-5 py-3"><Badge status={record.status} /></td>
                    <td className="px-4 sm:px-5 py-3 text-xs text-slate-500">{record.remarks || '-'}</td>
                    <td className="px-4 sm:px-5 py-3 text-xs text-slate-500">{record.recordedBy.username}</td>
                    <td className="px-4 sm:px-5 py-3 text-sm text-slate-500">{new Date(record.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
