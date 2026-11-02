import { useEffect, useState, Fragment, useMemo } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw, TrendingUp, ChevronDown, ChevronUp, Zap, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, LoadingSpinner, Badge, Modal, btnPrimary, Select } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatMeetingLabel } from '../lib/meetingUtils';

// ── Types ────────────────────────────────────────────────────────────────────

interface Payment {
  id: string; amount: number; paymentMethod: string;
  paymentDate: string; status: string; receiptNumber?: string;
}

interface MemberStatus {
  memberId: string; memberNumber: string; fullName: string;
  outstandingBalance: number; obligationId: string | null;
  dueDate: string | null; contributionAmount: number | null;
  penaltyAmount: number; totalDue: number | null;
  amountPaid: number; status: string;
  isMonthlyPenalty: boolean; consecutiveMissedWeeks: number;
  payments: Payment[];
}

interface WeekOption { weekNumber: number; year: number; dueDate: string; }

interface Summary {
  paid: number; pending: number; overdue: number; partial: number;
  total: number; totalCollected: number; totalExpected: number;
  totalPenalties: number; noObligation: number;
}

interface AllWeeksData {
  [key: string]: {
    week: number;
    year: number;
    dueDate: string;
    members: MemberStatus[];
    summary: Summary;
  };
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  PAID:         { label: 'Paid',         bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', icon: <CheckCircle2 size={13} /> },
  PARTIAL:      { label: 'Partial',      bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', icon: <Clock size={13} /> },
  PENDING:      { label: 'Pending',      bg: '#fefce8', text: '#ca8a04', border: '#fef08a', icon: <Clock size={13} /> },
  OVERDUE:      { label: 'Overdue',      bg: '#fef2f2', text: '#dc2626', border: '#fecaca', icon: <XCircle size={13} /> },
  NO_OBLIGATION:{ label: 'No Record',    bg: '#f8fafc', text: '#94a3b8', border: '#e2e8f0', icon: <AlertTriangle size={13} /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.NO_OBLIGATION;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ContributionsPage() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isAdmin = user?.role === 'ADMIN';

  const [allWeeksData, setAllWeeksData] = useState<AllWeeksData>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ totalCreated: number; weeksSummary: any[] } | null>(null);
  const [weeksToGenerate, setWeeksToGenerate] = useState(1); // Number of weeks to generate
  const [showWeeksSelector, setShowWeeksSelector] = useState(false); // Show/hide weeks dropdown

  // Collapsible weeks
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<string, boolean>>({});

  // Table filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Expanded row (to show payments detail)
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleWeek = (weekKey: string) => {
    setCollapsedWeeks(prev => ({ ...prev, [weekKey]: !prev[weekKey] }));
  };

  const loadAllWeeks = async () => {
    setLoading(true);
    try {
      // First, get available weeks
      const { data: initialRes } = await api.get('/finance/contributions/weekly');
      const weeks = initialRes.data.availableWeeks || [];

      // Load data for all available weeks
      const allData: AllWeeksData = {};
      await Promise.all(
        weeks.map(async (w: WeekOption) => {
          try {
            const { data: res } = await api.get('/finance/contributions/weekly', {
              params: { week: w.weekNumber, year: w.year }
            });
            const weekKey = `${w.weekNumber}-${w.year}`;
            allData[weekKey] = {
              week: res.data.week,
              year: res.data.year,
              dueDate: w.dueDate,
              members: res.data.members,
              summary: res.data.summary
            };
          } catch (error) {
            console.error(`Failed to load week ${w.weekNumber}, ${w.year}:`, error);
          }
        })
      );
      setAllWeeksData(allData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAllWeeks(); }, []);

  const generateObligations = async () => {
    if (!isAdmin) return;
    setGenerating(true);
    try {
      const { data: res } = await api.post('/finance/contributions/weekly/generate', { weeks: weeksToGenerate });
      setGenerateResult({ totalCreated: res.data.totalCreated, weeksSummary: res.data.weeksSummary });
      setShowWeeksSelector(false);
      loadAllWeeks(); // Reload all weeks after generation
    } finally { setGenerating(false); }
  };

  // Calculate overall summary across all weeks
  const overallSummary = useMemo(() => {
    const summary = {
      paid: 0, pending: 0, overdue: 0, partial: 0, total: 0,
      totalCollected: 0, totalExpected: 0, totalPenalties: 0, noObligation: 0
    };
    
    Object.values(allWeeksData).forEach(weekData => {
      const s = weekData.summary;
      summary.paid += s.paid;
      summary.pending += s.pending;
      summary.overdue += s.overdue;
      summary.partial += s.partial;
      summary.total += s.total;
      summary.totalCollected += s.totalCollected;
      summary.totalExpected += s.totalExpected;
      summary.totalPenalties += s.totalPenalties;
      summary.noObligation += s.noObligation;
    });
    
    return summary;
  }, [allWeeksData]);

  // Sort weeks: newest first
  const sortedWeeks = useMemo(() => {
    return Object.entries(allWeeksData)
      .sort(([keyA], [keyB]) => {
        const [weekA, yearA] = keyA.split('-').map(Number);
        const [weekB, yearB] = keyB.split('-').map(Number);
        if (yearB !== yearA) return yearB - yearA;
        return weekB - weekA;
      });
  }, [allWeeksData]);

  return (
    <div>
      <PageHeader
        title="Weekly Contributions"
        action={
          <div className="flex gap-2 items-center">
            {/* Generate button - always show for admin */}
            {isAdmin && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                {showWeeksSelector && (
                  <Select
                    value={String(weeksToGenerate)}
                    onChange={(e) => setWeeksToGenerate(Number(e))}
                    options={[
                      { value: '1', label: 'This Week Only' },
                      { value: '2', label: 'Next 2 Weeks' },
                      { value: '3', label: 'Next 3 Weeks' },
                      { value: '4', label: 'Next 4 Weeks (1 Month)' },
                      { value: '6', label: 'Next 6 Weeks' },
                      { value: '8', label: 'Next 8 Weeks (2 Months)' }
                    ]}
                    placeholder="Select weeks..."
                  />
                )}
                <button
                  onClick={() => {
                    if (showWeeksSelector) {
                      generateObligations();
                    } else {
                      setShowWeeksSelector(true);
                    }
                  }}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 shadow-sm disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {generating ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                  {showWeeksSelector ? 'Generate Now' : 'Generate Weeks'}
                </button>
                {showWeeksSelector && (
                  <button
                    onClick={() => {
                      setShowWeeksSelector(false);
                      setWeeksToGenerate(1);
                    }}
                    className="text-sm text-slate-600 hover:text-slate-900 px-2"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        }
      />

      {loading ? <LoadingSpinner /> : sortedWeeks.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          No weekly contributions data available.
        </div>
      ) : (
        <>
          {/* ── Overall Summary Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {[
              { label: 'Total Members', value: overallSummary.total, color: '#64748b', bg: '#f8fafc' },
              { label: 'Paid', value: overallSummary.paid, color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Pending', value: overallSummary.pending, color: '#ca8a04', bg: '#fefce8' },
              { label: 'Overdue', value: overallSummary.overdue, color: '#dc2626', bg: '#fef2f2' },
              { label: 'Partial', value: overallSummary.partial, color: '#2563eb', bg: '#eff6ff' },
              { label: 'No Record', value: overallSummary.noObligation, color: '#94a3b8', bg: '#f8fafc' },
              { label: 'Collected', value: `${overallSummary.totalCollected.toLocaleString()} ETB`, color: '#0d9488', bg: '#f0fdfa' },
              { label: 'Penalties', value: `${overallSummary.totalPenalties.toLocaleString()} ETB`, color: '#dc2626', bg: '#fef2f2' },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border p-3 text-center"
                style={{ background: card.bg, borderColor: card.color + '30' }}>
                <p className="text-lg font-bold" style={{ color: card.color }}>{card.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Overall Collection progress bar */}
          {overallSummary.totalExpected > 0 && (
            <div className="bg-white rounded-xl border p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-slate-600">Overall Collection Progress</span>
                <span className="text-xs font-semibold text-emerald-600 break-words">
                  {overallSummary.totalCollected.toLocaleString()} / {overallSummary.totalExpected.toLocaleString()} ETB
                  &nbsp;({Math.round((overallSummary.totalCollected / overallSummary.totalExpected) * 100)}%)
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((overallSummary.totalCollected / overallSummary.totalExpected) * 100))}%`,
                    background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                  }}
                />
              </div>
              {overallSummary.totalPenalties > 0 && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <AlertTriangle size={11} />
                  {overallSummary.totalPenalties.toLocaleString()} ETB in auto-calculated penalties included in totals
                </p>
              )}
            </div>
          )}

          {/* ── Filters ── */}
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              className="border rounded-xl px-3 py-2 text-sm text-slate-700 bg-white shadow-sm w-56"
              placeholder="Search member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {['ALL', 'PAID', 'PENDING', 'OVERDUE', 'PARTIAL', 'NO_OBLIGATION'].map((s) => (
                <button key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterStatus === s
                      ? 'bg-white shadow-sm text-slate-800'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {s === 'NO_OBLIGATION' ? 'No Record' : s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* ── Collapsible Week Sections ── */}
          <div className="space-y-4">
            {sortedWeeks.map(([weekKey, weekData]) => {
              const isCollapsed = collapsedWeeks[weekKey];
              const s = weekData.summary;
              
              // Filter members for this week
              const filtered = weekData.members.filter((m) => {
                const matchSearch = search === '' ||
                  m.fullName.toLowerCase().includes(search.toLowerCase()) ||
                  m.memberNumber.toLowerCase().includes(search.toLowerCase());
                const matchStatus = filterStatus === 'ALL' || m.status === filterStatus;
                return matchSearch && matchStatus;
              });

              // Sorted: overdue → pending → partial → paid → no_obligation
              const ORDER = ['OVERDUE', 'PENDING', 'PARTIAL', 'PAID', 'NO_OBLIGATION'];
              const sorted = [...filtered].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

              return (
                <div key={weekKey} className="bg-white rounded-xl border overflow-hidden">
                  {/* Week Header (Collapsible) */}
                  <div
                    className="px-5 py-4 bg-slate-100 hover:bg-slate-200 cursor-pointer flex items-center justify-between"
                    onClick={() => toggleWeek(weekKey)}
                  >
                    <div className="flex items-center gap-3">
                      {isCollapsed ? (
                        <ChevronRight size={18} className="text-slate-600" />
                      ) : (
                        <ChevronDown size={18} className="text-slate-600" />
                      )}
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">
                          {formatMeetingLabel(weekData.week, weekData.year, weekData.dueDate, i18n.language)}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Due: {new Date(weekData.dueDate).toLocaleDateString()} • {s.total} members
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">{s.totalCollected.toLocaleString()} ETB</p>
                        <p className="text-xs text-slate-500">Collected</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-700">{s.totalExpected.toLocaleString()} ETB</p>
                        <p className="text-xs text-slate-500">Expected</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                          {s.paid} Paid
                        </span>
                        {s.pending > 0 && (
                          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                            {s.pending} Pending
                          </span>
                        )}
                        {s.overdue > 0 && (
                          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                            {s.overdue} Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Week Members Table (Show/Hide based on collapse state) */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto border rounded-xl">
                      <table className="w-full min-w-full">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="px-3 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Member</th>
                            <th className="px-3 sm:px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Contribution</th>
                            <th className="px-3 sm:px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Penalty</th>
                            <th className="px-3 sm:px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Total Due</th>
                            <th className="px-3 sm:px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Paid</th>
                            <th className="px-3 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                            <th className="px-3 sm:px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Outstanding</th>
                            <th className="px-3 sm:px-5 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {sorted.length === 0 ? (
                            <tr><td colSpan={8} className="px-3 sm:px-5 py-10 text-center text-sm text-slate-400">No members found.</td></tr>
                          ) : sorted.map((m) => (
                            <Fragment key={m.memberId}>
                              <tr
                                className={`hover:bg-slate-50 transition-colors ${
                                  m.status === 'OVERDUE' ? 'bg-red-50/40' :
                                  m.status === 'PENDING' ? 'bg-amber-50/30' : ''
                                }`}
                              >
                                {/* Member */}
                                <td className="px-3 sm:px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                      style={{ background: m.status === 'PAID' ? '#16a34a' : m.status === 'OVERDUE' ? '#dc2626' : '#94a3b8' }}>
                                      {m.fullName[0]}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-slate-800">{m.fullName}</p>
                                      <p className="text-xs text-slate-400">#{m.memberNumber}</p>
                                    </div>
                                  </div>
                                </td>

                                {/* Contribution */}
                                <td className="px-3 sm:px-5 py-3 text-right text-sm text-slate-600">
                                  {m.contributionAmount != null ? `${m.contributionAmount.toLocaleString()} ETB` : '—'}
                                </td>

                                {/* Penalty */}
                                <td className="px-3 sm:px-5 py-3 text-right text-sm">
                                  {/* Only show penalty if status is PENDING, PARTIAL, or OVERDUE (unpaid) */}
                                  {(m.status === 'PENDING' || m.status === 'PARTIAL' || m.status === 'OVERDUE') && m.penaltyAmount > 0 ? (
                                    <span className="font-semibold text-red-600">{m.penaltyAmount.toLocaleString()} ETB</span>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>

                                {/* Total Due */}
                                <td className="px-3 sm:px-5 py-3 text-right text-sm font-semibold text-slate-700">
                                  {m.totalDue != null ? `${m.totalDue.toLocaleString()} ETB` : '—'}
                                </td>

                                {/* Amount Paid */}
                                <td className="px-3 sm:px-5 py-3 text-right text-sm font-medium text-emerald-600">
                                  {m.amountPaid > 0 ? `${m.amountPaid.toLocaleString()} ETB` : '—'}
                                </td>

                                {/* Status */}
                                <td className="px-3 sm:px-5 py-3">
                                  <StatusBadge status={m.status} />
                                </td>

                                {/* Outstanding balance (cumulative) */}
                                <td className="px-3 sm:px-5 py-3 text-right">
                                  {m.outstandingBalance > 0 ? (
                                    <span className="text-sm font-bold text-red-600">{m.outstandingBalance.toLocaleString()} ETB</span>
                                  ) : (
                                    <span className="text-xs text-emerald-500 flex items-center justify-end gap-1">
                                      <CheckCircle2 size={12} /> Clear
                                    </span>
                                  )}
                                </td>

                                {/* Expand payments */}
                                <td className="px-3 sm:px-5 py-3">
                                  {m.payments.length > 0 && (
                                    <button
                                      onClick={() => setExpanded(expanded === `${weekKey}-${m.memberId}` ? null : `${weekKey}-${m.memberId}`)}
                                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                                    >
                                      {expanded === `${weekKey}-${m.memberId}` ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                  )}
                                </td>
                              </tr>

                              {/* Expanded: payments breakdown */}
                              {expanded === `${weekKey}-${m.memberId}` && m.payments.length > 0 && (
                                <tr key={`${weekKey}-${m.memberId}-exp`} className="bg-slate-50">
                                <td colSpan={8} className="px-5 py-3">
                                  <div className="ml-10">
                                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                      <TrendingUp size={11} /> Payment Records
                                    </p>
                                    <div className="space-y-1.5">
                                      {m.payments.map((p) => (
                                        <div key={p.id} className="flex items-center gap-4 bg-white rounded-lg border px-4 py-2 text-xs">
                                          <span className="font-semibold text-emerald-600">{Number(p.amount).toLocaleString()} ETB</span>
                                          <span className="text-slate-500">{p.paymentMethod.replace('_', ' ')}</span>
                                          <span className="text-slate-400">{new Date(p.paymentDate).toLocaleDateString()}</span>
                                          {p.receiptNumber && <span className="text-slate-400 font-mono">#{p.receiptNumber}</span>}
                                          <Badge status={p.status} />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="font-semibold">Legend:</span>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <span key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                {cfg.icon} {cfg.label}
              </span>
            ))}
            <span className="text-red-500 flex items-center gap-1 ml-2">
              <AlertTriangle size={11} /> Red penalty = auto-calculated by system
            </span>
          </div>
        </>
      )}

      {/* Generate Result Modal */}
      <Modal open={!!generateResult} onClose={() => setGenerateResult(null)} title="Obligations Generated">
        {generateResult && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
              {generateResult.totalCreated > 0 ? (
                <>
                  <p className="text-2xl font-bold text-emerald-700">{generateResult.totalCreated}</p>
                  <p className="text-sm text-slate-600 mt-1">Total new weekly obligation(s) created for approved members.</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-slate-700">Already up to date</p>
                  <p className="text-sm text-slate-500 mt-1">All members already have obligations for the selected weeks.</p>
                </>
              )}
            </div>
            
            {/* Weeks Summary */}
            {generateResult.weeksSummary && generateResult.weeksSummary.length > 0 && (
              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 border-b">
                  <p className="text-xs font-semibold text-slate-600 uppercase">Breakdown by Week</p>
                </div>
                <div className="divide-y">
                  {generateResult.weeksSummary.map((week: any, idx: number) => (
                    <div key={idx} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {formatMeetingLabel(week.weekNumber, week.year, week.dueDate, i18n.language)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Due: {new Date(week.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">{week.created}</p>
                        <p className="text-xs text-slate-400">created</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <button className={btnPrimary} onClick={() => setGenerateResult(null)}>OK</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
