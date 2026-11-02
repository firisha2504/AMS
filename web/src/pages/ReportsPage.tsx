import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, TrendingUp, Users, Calendar, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, LoadingSpinner, btnPrimary, Select, DateInput } from '../components/ui';

const REPORT_TYPES = [
  { id: 'unpaid', label: 'Unpaid Contributions' },
  { id: 'contributions', label: 'Contributions' },
  { id: 'penalties', label: 'Penalties' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'special-contributions', label: 'Special Contributions' },
  { id: 'year-end', label: 'Year-End Summary' },
];


// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    VERIFIED: 'bg-green-100 text-green-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    REJECTED: 'bg-red-100 text-red-700',
    PRESENT: 'bg-green-100 text-green-700',
    ABSENT: 'bg-red-100 text-red-700',
    LATE: 'bg-orange-100 text-orange-700',
    EXCUSED: 'bg-blue-100 text-blue-700',
    SETTLED: 'bg-green-100 text-green-700',
    OUTSTANDING: 'bg-red-100 text-red-700',
    WAIVED: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

// ── Per-type renderers ────────────────────────────────────────────────────────
type Payment = {
  id: string; paymentId: string; amount: number; paymentDate: string;
  paymentMethod: string; status: string; receiptNumber: string;
  member?: { fullName: string; memberId: string };
};
type Penalty = {
  id: string; reason: string; amount: number; status: string; createdAt: string;
  member?: { fullName: string; memberId: string };
};
type Attendance = {
  id: string; status: string; createdAt: string;
  member?: { fullName: string; memberId: string };
  meeting?: { title: string; meetingDate: string };
};
type SpecialContribution = {
  id: string; type: string; amount: number; createdAt: string;
  beneficiaryMember?: { fullName: string; memberId: string } | null;
  _count?: { obligations: number };
};
type YearEnd = {
  year: number; totalContributions: number;
  totalPenalties: number; totalAttendance: number; outstandingBalances: number;
  topContributors: { memberId: string; _sum: { amount: number } }[];
};

type WeeklyObligation = {
  id: string; weekNumber: number; year: number;
  contributionAmount: number; penaltyAmount: number; totalDue: number;
  amountPaid: number; status: string; dueDate: string;
  member: { id: string; fullName: string; memberId: string; outstandingBalance: number; user: { phone: string } };
};

type SpecialObligation = {
  id: string; amount: number; amountPaid: number; status: string;
  specialContribution: { title: string; titleOm: string; type: string; dueDate: string; campaignId: string };
  member: { id: string; fullName: string; memberId: string; outstandingBalance: number; user: { phone: string } };
};

type PenaltyRecord = {
  id: string; amount: number; reason: string; weekNumber: number | null; year: number | null;
  isMonthly: boolean; status: string; createdAt: string;
  member: { id: string; fullName: string; memberId: string; outstandingBalance: number; user: { phone: string } };
};

type UnpaidData = {
  summary: {
    weeklyCount: number;
    specialCount: number;
    penaltiesCount: number;
    weeklyUnpaidAmount: number;
    specialUnpaidAmount: number;
    penaltiesUnpaidAmount: number;
    totalUnpaidAmount: number;
    uniqueMembers: number;
  };
  weeklyObligations: WeeklyObligation[];
  specialObligations: SpecialObligation[];
  penalties: PenaltyRecord[];
};



function ContributionsTableFull({ data }: { data: Payment[] }) {
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <AlertCircle size={40} className="mb-3 opacity-40" />
      <p className="text-sm">No records found for the selected period.</p>
    </div>
  );
  // Calculate total - ensure all amounts are properly converted to numbers
  const total = data.reduce((sum, payment) => {
    const amount = Number(payment.amount) || 0;
    return sum + amount;
  }, 0);
  
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Receipt #', 'Member ID', 'Member Name', 'Amount (ETB)', 'Date', 'Method', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((p, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-700 font-mono text-xs">{p.receiptNumber ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{p.member?.memberId ?? '—'}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{p.member?.fullName ?? '—'}</td>
                <td className="px-4 py-3 text-green-700 font-semibold">{Number(p.amount).toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-600">{new Date(p.paymentDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-gray-600">{p.paymentMethod}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-50 border-t-2 border-green-200">
              <td colSpan={3} className="px-4 py-3 font-semibold text-gray-700">
                Total ({data.length} records found)
              </td>
              <td className="px-4 py-3 font-bold text-green-700">{total.toLocaleString()}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

function PenaltiesTable({ data }: { data: Penalty[] }) {
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <AlertCircle size={40} className="mb-3 opacity-40" />
      <p className="text-sm">No records found for the selected period.</p>
    </div>
  );
  const total = data.reduce((s, p) => s + Number(p.amount), 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['Member ID', 'Member Name', 'Reason', 'Amount (ETB)', 'Status', 'Date'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((p, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-500 text-xs">{p.member?.memberId ?? '—'}</td>
              <td className="px-4 py-3 font-medium text-gray-800">{p.member?.fullName ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{p.reason ?? '—'}</td>
              <td className="px-4 py-3 text-red-600 font-semibold">{Number(p.amount).toLocaleString()}</td>
              <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
              <td className="px-4 py-3 text-gray-600">{new Date(p.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-red-50 border-t-2 border-red-200">
            <td colSpan={3} className="px-4 py-3 font-semibold text-gray-700">Total</td>
            <td className="px-4 py-3 font-bold text-red-600">{total.toLocaleString()}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function AttendanceTable({ data }: { data: Attendance[] }) {
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <AlertCircle size={40} className="mb-3 opacity-40" />
      <p className="text-sm">No records found for the selected period.</p>
    </div>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['Member ID', 'Member Name', 'Meeting', 'Meeting Date', 'Status'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((a, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-500 text-xs">{a.member?.memberId ?? '—'}</td>
              <td className="px-4 py-3 font-medium text-gray-800">{a.member?.fullName ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{a.meeting?.title ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{a.meeting?.meetingDate ? new Date(a.meeting.meetingDate).toLocaleDateString() : '—'}</td>
              <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SpecialContributionsTable({ data }: { data: SpecialContribution[] }) {
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <AlertCircle size={40} className="mb-3 opacity-40" />
      <p className="text-sm">No records found for the selected period.</p>
    </div>
  );
  const total = data.reduce((s, i) => s + Number(i.amount), 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['Type', 'Beneficiary', 'Amount (ETB)', 'Obligations', 'Date'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((item, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{item.type}</span>
              </td>
              <td className="px-4 py-3 font-medium text-gray-800">{item.beneficiaryMember?.fullName ?? <span className="text-gray-400 italic">N/A</span>}</td>
              <td className="px-4 py-3 text-purple-700 font-semibold">{Number(item.amount).toLocaleString()}</td>
              <td className="px-4 py-3 text-gray-600">{item._count?.obligations ?? 0}</td>
              <td className="px-4 py-3 text-gray-600">{new Date(item.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-purple-50 border-t-2 border-purple-200">
            <td colSpan={2} className="px-4 py-3 font-semibold text-gray-700">Total</td>
            <td className="px-4 py-3 font-bold text-purple-700">{total.toLocaleString()}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function YearEndSummary({ data }: { data: YearEnd }) {
  const cards = [
    { label: 'Year', value: String(data.year), icon: Calendar, color: 'text-gray-700', bg: 'bg-gray-50' },
    { label: 'Total Contributions', value: `ETB ${Number(data.totalContributions).toLocaleString()}`, icon: TrendingUp, color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'Total Penalties', value: `ETB ${Number(data.totalPenalties).toLocaleString()}`, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Attendance Records', value: String(data.totalAttendance), icon: Users, color: 'text-indigo-700', bg: 'bg-indigo-50' },
    { label: 'Outstanding Balances', value: `ETB ${Number(data.outstandingBalances).toLocaleString()}`, icon: FileText, color: 'text-orange-700', bg: 'bg-orange-50' },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {cards.map((c) => (
          <div key={c.label} className={`${c.bg} rounded-xl p-4 flex items-center gap-3`}>
            <c.icon className={`${c.color} shrink-0`} size={24} />
            <div>
              <p className="text-xs text-gray-500 font-medium">{c.label}</p>
              <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>
      {data.topContributors?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 10 Contributors</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Member ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Contributed (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.topContributors.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-medium">{i + 1}</td>
                    <td className="px-4 py-3 text-gray-700">{c.memberId}</td>
                    <td className="px-4 py-3 text-green-700 font-semibold">{Number(c._sum.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function UnpaidContributionsReport({ data }: { data: UnpaidData }) {
  const { summary, weeklyObligations, specialObligations, penalties } = data;
  const [activeTab, setActiveTab] = useState<'weekly' | 'special' | 'penalties'>('weekly');

  if (!weeklyObligations.length && !specialObligations.length && !penalties.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <AlertCircle size={40} className="mb-3 opacity-40" />
        <p className="text-sm">No unpaid contributions found. All members are up to date!</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Unpaid</p>
            <p className="text-lg font-bold text-red-600">{Number(summary.totalUnpaidAmount).toLocaleString()} ETB</p>
          </div>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 flex items-center gap-3">
          <Users className="text-orange-600 shrink-0" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-medium">Members with Unpaid</p>
            <p className="text-lg font-bold text-orange-600">{summary.uniqueMembers}</p>
          </div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
          <FileText className="text-blue-600 shrink-0" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-medium">Weekly Unpaid</p>
            <p className="text-lg font-bold text-blue-600">{Number(summary.weeklyUnpaidAmount).toLocaleString()} ETB</p>
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 flex items-center gap-3">
          <TrendingUp className="text-purple-600 shrink-0" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-medium">Special Unpaid</p>
            <p className="text-lg font-bold text-purple-600">{Number(summary.specialUnpaidAmount).toLocaleString()} ETB</p>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-amber-600 shrink-0" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-medium">Penalties Unpaid</p>
            <p className="text-lg font-bold text-amber-600">{Number(summary.penaltiesUnpaidAmount).toLocaleString()} ETB</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
          <Calendar className="text-slate-600 shrink-0" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-medium">Weekly Obligations</p>
            <p className="text-lg font-bold text-slate-600">{summary.weeklyCount}</p>
          </div>
        </div>
        <div className="bg-indigo-50 rounded-xl p-4 flex items-center gap-3">
          <Calendar className="text-indigo-600 shrink-0" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-medium">Special Obligations</p>
            <p className="text-lg font-bold text-indigo-600">{summary.specialCount}</p>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-yellow-600 shrink-0" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-medium">Outstanding Penalties</p>
            <p className="text-lg font-bold text-yellow-600">{summary.penaltiesCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 bg-slate-100 p-1.5 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'weekly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Weekly Contributions
          <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-2">{summary.weeklyCount}</span>
        </button>
        <button
          onClick={() => setActiveTab('special')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'special' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Special Contributions
          <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-2">{summary.specialCount}</span>
        </button>
        <button
          onClick={() => setActiveTab('penalties')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'penalties' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Penalties
          <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs ml-2">{summary.penaltiesCount}</span>
        </button>
      </div>

      {/* Tables */}
      {activeTab === 'weekly' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Member ID', 'Member Name', 'Phone', 'Week', 'Year', 'Due Date', 'Total Due', 'Paid', 'Remaining', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {weeklyObligations.map((o) => {
                const remaining = Number(o.totalDue) - Number(o.amountPaid);
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.member.memberId}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{o.member.fullName}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{o.member.user.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{o.weekNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{o.year}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(o.dueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-700 font-semibold">{Number(o.totalDue).toLocaleString()}</td>
                    <td className="px-4 py-3 text-green-600">{Number(o.amountPaid).toLocaleString()}</td>
                    <td className="px-4 py-3 text-red-600 font-bold">{remaining.toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-red-50 border-t-2 border-red-200">
                <td colSpan={8} className="px-4 py-3 font-semibold text-gray-700">Total Unpaid (Weekly)</td>
                <td className="px-4 py-3 font-bold text-red-600">{Number(summary.weeklyUnpaidAmount).toLocaleString()}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {activeTab === 'special' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Member ID', 'Member Name', 'Phone', 'Campaign', 'Type', 'Due Date', 'Amount', 'Paid', 'Remaining', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {specialObligations.map((o) => {
                const remaining = Number(o.amount) - Number(o.amountPaid);
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-xs">{o.member.memberId}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{o.member.fullName}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{o.member.user.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-800">{o.specialContribution.title}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {o.specialContribution.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(o.specialContribution.dueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-700 font-semibold">{Number(o.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-green-600">{Number(o.amountPaid).toLocaleString()}</td>
                    <td className="px-4 py-3 text-red-600 font-bold">{remaining.toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-red-50 border-t-2 border-red-200">
                <td colSpan={8} className="px-4 py-3 font-semibold text-gray-700">Total Unpaid (Special)</td>
                <td className="px-4 py-3 font-bold text-red-600">{Number(summary.specialUnpaidAmount).toLocaleString()}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {activeTab === 'penalties' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Member ID', 'Member Name', 'Phone', 'Reason', 'Week/Year', 'Type', 'Amount', 'Date', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {penalties.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.member.memberId}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.member.fullName}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{p.member.user.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{p.reason}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.weekNumber && p.year ? `Week ${p.weekNumber}, ${p.year}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.isMonthly ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {p.isMonthly ? 'Monthly' : 'Weekly'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-red-600 font-bold">{Number(p.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-red-50 border-t-2 border-red-200">
                <td colSpan={6} className="px-4 py-3 font-semibold text-gray-700">Total Unpaid (Penalties)</td>
                <td className="px-4 py-3 font-bold text-red-600">{Number(summary.penaltiesUnpaidAmount).toLocaleString()}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { t } = useTranslation();
  const [type, setType] = useState('contributions');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    setLoading(true);
    setGenerated(false);
    try {
      const { data: res } = await api.get(`/settings/reports/${type}`, { params: { from: from || undefined, to: to || undefined } });
      setData(res.data);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'excel' | 'pdf') => {
    const token = localStorage.getItem('accessToken');
    const lang = localStorage.getItem('language') || 'om';
    const params = new URLSearchParams({ format, ...(from && { from }), ...(to && { to }) });
    const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/settings/reports/${type}/export?${params}`, {
      headers: { Authorization: `Bearer ${token}`, 'Accept-Language': lang },
    });
    if (!response.ok) {
      alert('Failed to export report. Please try again.');
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderTable = () => {
    if (!generated || data === null) return null;
    switch (type) {
      case 'unpaid':           return <UnpaidContributionsReport data={data as UnpaidData} />;
      case 'contributions':    return <ContributionsTableFull data={data as Payment[]} />;
      case 'penalties':        return <PenaltiesTable data={data as Penalty[]} />;
      case 'attendance':       return <AttendanceTable data={data as Attendance[]} />;
      case 'special-contributions': return <SpecialContributionsTable data={data as SpecialContribution[]} />;
      case 'year-end':         return <YearEndSummary data={data as YearEnd} />;
      default:
        return (
          <div className="text-center py-10 text-gray-400 text-sm">Unknown report type.</div>
        );
    }
  };

  const currentType = REPORT_TYPES.find((r) => r.id === type);
  const recordCount = type === 'unpaid' 
    ? (data as UnpaidData)?.summary?.weeklyCount + (data as UnpaidData)?.summary?.specialCount + (data as UnpaidData)?.summary?.penaltiesCount || 0
    : Array.isArray(data) ? data.length : null;

  return (
    <div>
      <PageHeader title={t('nav.reports')} />

      {/* Controls */}
      <div className="bg-white rounded-xl border p-4 sm:p-6 mb-6 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <Select 
            value={type} 
            onChange={e => { setType(e); setData(null); setGenerated(false); }}
            options={REPORT_TYPES.map(r => ({ value: r.id, label: r.label }))}
          />
          <DateInput value={from} onChange={setFrom} label="From Date" />
          <DateInput value={to} onChange={setTo} label="To Date" />
          <button className={btnPrimary} onClick={generate} disabled={loading}>
            {loading ? 'Generating…' : t('common.generate', 'Generate')}
          </button>
        </div>
        <div className="flex gap-2">
          <button className={btnPrimary} onClick={() => exportReport('excel')}>
            <Download size={16} className="inline mr-1" />Excel
          </button>
          <button className={btnPrimary} onClick={() => exportReport('pdf')}>
            <Download size={16} className="inline mr-1" />PDF
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner />
      ) : generated && (
        <div className="bg-white rounded-xl border overflow-hidden">
          {/* Table header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
            <div>
              <h2 className="font-semibold text-gray-800">{currentType?.label} Report</h2>
              {recordCount !== null && (
                <p className="text-xs text-gray-500 mt-0.5">{recordCount} record{recordCount !== 1 ? 's' : ''} found</p>
              )}
            </div>
            {from || to ? (
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {from && `From ${new Date(from).toLocaleDateString()}`}
                {from && to && ' – '}
                {to && `To ${new Date(to).toLocaleDateString()}`}
              </span>
            ) : null}
          </div>
          <div className="p-0">
            {renderTable()}
          </div>
        </div>
      )}
    </div>
  );
}
