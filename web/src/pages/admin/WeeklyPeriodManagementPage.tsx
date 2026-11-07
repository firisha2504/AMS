import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Users,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  ChevronRight,
  ShieldCheck,
  CalendarDays,
  Settings,
  Building,
} from 'lucide-react';
import { api } from '../../lib/api';
import { ETHIOPIAN_MONTHS, toEthiopianDate } from '../../lib/ethiopianCalendar';
import { useNavigate } from 'react-router-dom';

interface WeeklyPeriodData {
  id: string;
  periodId: string;
  ethiopianYear: number;
  ethiopianMonth: number;
  ethiopianMonthName: string;
  weekNumber: number;
  ethiopianStartDate: string;
  ethiopianEndDate: string;
  ethiopianDueDate: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  contributionAmount: number;
  isGenerated: boolean;
  obligationsCount: number;
  eligibleMembersCount: number;
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
}

interface PeriodPreviewData {
  ethiopianYear: number;
  targetMonth?: number;
  totalPlannedWeeks: number;
  eligibleMembersCount: number;
  estimatedTotalExpectedPerWeek: number;
  estimatedGrandTotalExpected: number;
  periods: any[];
}

interface OrgConfigData {
  startingEthiopianYear: number;
  startingEthiopianMonth: number;
  startingEthiopianDate: number;
  startingDate: string;
  ethiopianMonthNameEn: string;
  ethiopianMonthNameOm: string;
  weeklyContributionRate: number;
  rateEffectiveDate: string;
}

export default function WeeklyPeriodManagementPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language === 'en' ? 'en' : 'om';

  // Organization configuration loaded from backend
  const [orgConfig, setOrgConfig] = useState<OrgConfigData | null>(null);

  // Filters
  const [selectedYear, setSelectedYear] = useState<number>(2017);
  const [selectedMonth, setSelectedMonth] = useState<number | ''>(''); // '' means All Months
  const [contributionRate, setContributionRate] = useState<number>(50);

  // Available Ethiopian Years for Selector (derived dynamically from orgConfig)
  const [ethiopianYears, setEthiopianYears] = useState<number[]>([2017, 2018, 2019, 2020, 2021]);

  // Data & loading
  const [periods, setPeriods] = useState<WeeklyPeriodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [showGeneratePeriodsModal, setShowGeneratePeriodsModal] = useState(false);
  const [showGenerateObligationsModal, setShowGenerateObligationsModal] = useState(false);
  const [previewData, setPreviewData] = useState<PeriodPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch organization configuration
  useEffect(() => {
    const fetchOrgConfig = async () => {
      try {
        const res = await api.get('/settings/organization');
        if (res.data?.success && res.data.data) {
          const conf: OrgConfigData = res.data.data;
          setOrgConfig(conf);
          setSelectedYear(conf.startingEthiopianYear);
          setContributionRate(conf.weeklyContributionRate);

          // Build dynamic year options starting from configured starting year
          const startYr = conf.startingEthiopianYear;
          const currentEthYear = toEthiopianDate(new Date())?.year || startYr;
          const endYr = Math.max(startYr + 5, currentEthYear + 2);
          const years: number[] = [];
          for (let y = startYr; y <= endYr; y++) {
            years.push(y);
          }
          setEthiopianYears(years);
        }
      } catch (err) {
        console.error('Failed to load organization config:', err);
      }
    };
    fetchOrgConfig();
  }, []);

  const fetchPeriods = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { year: selectedYear };
      if (selectedMonth !== '') params.month = selectedMonth;

      const res = await api.get('/calendar/weekly-periods', { params });
      if (res.data?.success) {
        setPeriods(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load weekly periods:', err);
      setError(err?.response?.data?.message || 'Failed to load weekly periods');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, [selectedYear, selectedMonth]);

  // Open Period Generation Preview Modal
  const handleOpenGeneratePeriodsModal = async () => {
    if (orgConfig && selectedYear < orgConfig.startingEthiopianYear) {
      setError(
        lang === 'en'
          ? `Cannot generate weekly periods prior to organization starting year (${orgConfig.startingEthiopianYear} E.C.).`
          : `Yeroon torbee waggaa hundeeffama gamtaa (${orgConfig.startingEthiopianYear} ALH) dura hin maddisiifamu.`
      );
      return;
    }

    if (
      orgConfig &&
      selectedYear === orgConfig.startingEthiopianYear &&
      selectedMonth !== '' &&
      Number(selectedMonth) < orgConfig.startingEthiopianMonth
    ) {
      setError(
        lang === 'en'
          ? `Cannot generate periods for month ${selectedMonth} in starting year ${selectedYear}. Organization started in ${orgConfig.ethiopianMonthNameEn} (${orgConfig.startingEthiopianMonth}).`
          : `Ji'a ${selectedMonth} waggaa ${selectedYear} keessatti hin maddisiifamu. Gamtaan ji'a ${orgConfig.ethiopianMonthNameOm} hundeeffame.`
      );
      return;
    }

    setPreviewLoading(true);
    setShowGeneratePeriodsModal(true);
    try {
      const params: any = { year: selectedYear, rate: contributionRate };
      if (selectedMonth !== '') params.month = selectedMonth;

      const res = await api.get('/calendar/weekly-periods/preview', { params });
      if (res.data?.success) {
        setPreviewData(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load period preview:', err);
      setError(err?.response?.data?.message || 'Failed to load period preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Submit Period Generation
  const handleConfirmGeneratePeriods = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/calendar/weekly-periods/generate', {
        ethiopianYear: selectedYear,
        ethiopianMonth: selectedMonth === '' ? undefined : selectedMonth,
        contributionRate,
      });

      if (res.data?.success) {
        const { createdPeriodsCount, existingPeriodsCount } = res.data.data;
        setSuccessMessage(
          lang === 'en'
            ? `Successfully generated ${createdPeriodsCount} new periods (${existingPeriodsCount} already existed).`
            : `Yeroon torbee haaraan ${createdPeriodsCount} milkaa'inaan uumameera (${existingPeriodsCount} duraan ture).`
        );
        setShowGeneratePeriodsModal(false);
        fetchPeriods();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to generate weekly periods');
    } finally {
      setActionLoading(false);
    }
  };

  // Single Period Obligation Generation
  const handleGenerateSinglePeriodObligations = async (period: WeeklyPeriodData) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/calendar/weekly-periods/${period.id}/generate-obligations`);
      if (res.data?.success) {
        const { createdObligationsCount } = res.data.data;
        setSuccessMessage(
          lang === 'en'
            ? `Generated ${createdObligationsCount} member obligations for ${period.periodId}.`
            : `Dirqamni kaffaltii miseensotaa ${createdObligationsCount} ${period.periodId} tiif uumameera.`
        );
        fetchPeriods();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to generate obligations');
    } finally {
      setActionLoading(false);
    }
  };

  // Batch Obligations Generation
  const handleConfirmBatchGenerateObligations = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/calendar/weekly-periods/generate-obligations-batch', {
        year: selectedYear,
        month: selectedMonth === '' ? undefined : selectedMonth,
      });

      if (res.data?.success) {
        const { periodsProcessed, totalCreatedObligations } = res.data.data;
        setSuccessMessage(
          lang === 'en'
            ? `Batch processed ${periodsProcessed} periods. Created ${totalCreatedObligations} member obligations.`
            : `Yeroon ${periodsProcessed} adeemsifameera. Dirqamni kaffaltii miseensotaa ${totalCreatedObligations} uumameera.`
        );
        setShowGenerateObligationsModal(false);
        fetchPeriods();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to batch generate obligations');
    } finally {
      setActionLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (periods.length === 0) return;

    const headers = [
      'Period ID',
      'Week Number',
      'Ethiopian Month',
      'Ethiopian Start Date',
      'Ethiopian End Date',
      'Ethiopian Saturday Due Date',
      'Gregorian Saturday Due Date',
      'Rate (ETB)',
      'Obligations Generated',
      'Eligible Members',
      'Total Expected (ETB)',
      'Total Collected (ETB)',
      'Total Outstanding (ETB)',
      'Status',
    ];

    const rows = periods.map((p) => [
      p.periodId,
      p.weekNumber,
      p.ethiopianMonthName,
      `"${p.ethiopianStartDate}"`,
      `"${p.ethiopianEndDate}"`,
      `"${p.ethiopianDueDate}"`,
      p.dueDate.slice(0, 10),
      p.contributionAmount,
      p.obligationsCount,
      p.eligibleMembersCount,
      p.totalExpected,
      p.totalCollected,
      p.totalOutstanding,
      p.isGenerated ? 'Generated' : 'Pending Obligations',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AMS_Weekly_Periods_${selectedYear}_EC.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metric Aggregations
  const totalExpectedAll = periods.reduce((acc, p) => acc + (p.totalExpected || 0), 0);
  const totalCollectedAll = periods.reduce((acc, p) => acc + (p.totalCollected || 0), 0);
  const totalOutstandingAll = periods.reduce((acc, p) => acc + (p.totalOutstanding || 0), 0);
  const activeMembersEstimate = periods[0]?.eligibleMembersCount || 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-[#0a2540] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 translate-x-12 -translate-y-12">
          <Calendar size={260} />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3 border border-emerald-400/20">
            <CalendarDays size={14} />
            <span>{lang === 'en' ? 'Ethiopian Calendar Financial Engine' : 'Mootora Faayinaansii Dhaha Itoophiyaa'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {lang === 'en' ? 'Weekly Period Management' : 'Bulchiinsa Yeroo Kaffaltii Torbee'}
          </h1>
          <p className="text-emerald-100/80 text-sm mt-2 leading-relaxed">
            {lang === 'en'
              ? `Automatically generate Saturday-based weekly contribution periods using the verified 13-month Ethiopian Calendar. Enforce ${contributionRate} ETB Saturday deadlines and prevent duplicate obligations.`
              : `Dhaha Itoophiyaa ji'oota 13 qabuun yeroo kaffaltii Sanbata torbanii ofumaan maddisiisaa. Kaffaltii Qar. ${contributionRate} Sanbata duraa fi ittisa kaffaltii dachaa mirkaneessaa.`}
          </p>

          {/* Configured Starting Year Badge & Settings Link */}
          <div className="mt-4 p-3.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0">
                <Building size={16} />
              </div>
              <div>
                <span className="text-emerald-200/90 font-medium">
                  {lang === 'en' ? 'Configured Organization Starting Year:' : 'Waggaa Hundeeffama Gamtaa Qindaa\'e:'}
                </span>{' '}
                <strong className="text-white text-sm font-extrabold ml-1">
                  {orgConfig ? `${orgConfig.startingEthiopianYear} E.C.` : '2017 E.C.'}
                </strong>
                <span className="text-emerald-100/75 ml-2 text-[11px]">
                  {orgConfig
                    ? `(${orgConfig.ethiopianMonthNameEn} ${orgConfig.startingEthiopianDate}, ${orgConfig.startingEthiopianYear} E.C. / ${new Date(orgConfig.startingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} G.C.)`
                    : '(Meskerem 1, 2017 E.C. / Sep 11, 2024 G.C.)'}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/settings')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/35 text-white font-semibold text-xs transition-colors border border-emerald-400/30 active:scale-95"
            >
              <Settings size={13} />
              <span>{lang === 'en' ? 'Configure in Settings' : 'Qindaa\'ina keessatti Jijjiiri'}</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={handleOpenGeneratePeriodsModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-bold text-sm transition-all shadow-md active:scale-95"
            >
              <Plus size={16} className="stroke-[3]" />
              <span>{lang === 'en' ? 'Generate Weekly Periods' : 'Yeroo Torbee Maddisiisi'}</span>
            </button>

            <button
              onClick={() => setShowGenerateObligationsModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all border border-white/20 active:scale-95"
            >
              <ShieldCheck size={16} />
              <span>{lang === 'en' ? 'Generate Obligations' : 'Dirqama Miseensaa Uumi'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={periods.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all border border-white/20 disabled:opacity-40"
            >
              <FileSpreadsheet size={16} />
              <span>{lang === 'en' ? 'Export Weekly Report' : 'Gabaasa CSV Baasi'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-900 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Year Selector */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              {lang === 'en' ? 'Ethiopian Year' : 'Waggaa Itoophiyaa'}
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3.5 py-2 text-sm font-semibold border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {ethiopianYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr} {lang === 'en' ? 'EC' : 'ALH'}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              {lang === 'en' ? 'Ethiopian Month' : "Ji'a Itoophiyaa"}
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === '' ? '' : Number(e.target.value))}
              className="px-3.5 py-2 text-sm font-semibold border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{lang === 'en' ? 'All 13 Months' : "Ji'oota 13 Hunda"}</option>
              {ETHIOPIAN_MONTHS.map((m) => (
                <option key={m.number} value={m.number}>
                  {m.number}. {lang === 'en' ? m.nameEn : m.nameOm}
                </option>
              ))}
            </select>
          </div>

          {/* Rate Selector */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              {lang === 'en' ? 'Weekly Rate (ETB)' : 'Gatii Torbee (Qar)'}
            </label>
            <input
              type="number"
              value={contributionRate}
              onChange={(e) => setContributionRate(Number(e.target.value))}
              min={1}
              className="w-24 px-3 py-2 text-sm font-semibold border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <button
          onClick={fetchPeriods}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin text-emerald-600' : ''} />
          <span>{lang === 'en' ? 'Refresh' : 'Haaromsi'}</span>
        </button>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase">{lang === 'en' ? 'Total Weeks' : 'Waliigala Torban'}</span>
            <Calendar size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{periods.length}</p>
          <p className="text-xs text-gray-500 mt-1">
            {selectedYear} {lang === 'en' ? 'Ethiopian Year' : 'Waggaa Itoophiyaa'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase">{lang === 'en' ? 'Eligible Members' : 'Miseensota Ga\'an'}</span>
            <Users size={18} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-700">{activeMembersEstimate}</p>
          <p className="text-xs text-gray-500 mt-1">{lang === 'en' ? 'Approved Status' : 'Mirkanaa\'an'}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase">{lang === 'en' ? 'Total Expected' : 'Eegamu'}</span>
            <DollarSign size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{totalExpectedAll.toLocaleString()} ETB</p>
          <p className="text-xs text-emerald-600 mt-1 font-medium">{contributionRate} ETB / {lang === 'en' ? 'week' : 'torban'}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase">{lang === 'en' ? 'Total Collected' : 'Walitti Qabame'}</span>
            <TrendingUp size={18} className="text-teal-500" />
          </div>
          <p className="text-2xl font-bold text-teal-700">{totalCollectedAll.toLocaleString()} ETB</p>
          <p className="text-xs text-teal-600 mt-1">
            {totalExpectedAll > 0 ? Math.round((totalCollectedAll / totalExpectedAll) * 100) : 0}% {lang === 'en' ? 'collected' : 'sassaabame'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase">{lang === 'en' ? 'Outstanding' : 'Hafaa'}</span>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-700">{totalOutstandingAll.toLocaleString()} ETB</p>
          <p className="text-xs text-amber-600 mt-1">{lang === 'en' ? 'Due on Saturdays' : 'Sanbata Kaffalama'}</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            {lang === 'en' ? 'Weekly Contribution Periods' : 'Yeroolee Kaffaltii Torbee'}
          </h2>
          <span className="text-xs text-gray-500 font-medium">
            {periods.length} {lang === 'en' ? 'periods found' : 'argaman'}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw size={28} className="animate-spin mx-auto text-emerald-600 mb-3" />
            <p className="text-sm text-gray-500 font-medium">
              {lang === 'en' ? 'Loading Ethiopian weekly periods...' : 'Yerooleen torbee fe\'amaa jiru...'}
            </p>
          </div>
        ) : periods.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Calendar size={32} />
            </div>
            <h3 className="text-base font-bold text-gray-800">
              {lang === 'en' ? 'No weekly periods generated yet for this filter' : 'Yeroon torbee filannoo kanaaf hin maddisiifamne'}
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-5">
              {lang === 'en'
                ? `Click "Generate Weekly Periods" to calculate and store all Saturday periods for Ethiopian Year ${selectedYear}.`
                : `Waggaa Itoophiyaa ${selectedYear} tiif yeroo Sanbata torbee hunda maddisiisuuf "Yeroo Torbee Maddisiisi" cuqqaalaa.`}
            </p>
            <button
              onClick={handleOpenGeneratePeriodsModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm"
            >
              <Plus size={16} />
              <span>{lang === 'en' ? 'Generate Periods Now' : 'Amma Maddisiisi'}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4">Period ID</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Week' : 'Torban'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Ethiopian Dates' : 'Guyyoota Itoophiyaa'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Saturday Due Date' : 'Sanbata Kaffaltii'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Gregorian Date' : 'Dhaha Faranjii'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Rate' : 'Gatii'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Obligations' : 'Dirqamoota'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Financials' : 'Faayinaansii'}</th>
                  <th className="py-3 px-4">{lang === 'en' ? 'Status' : 'Haala'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'en' ? 'Actions' : 'Tarkaanfii'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                {periods.map((p) => {
                  const hasObligations = p.obligationsCount > 0;
                  const gDateStr = p.dueDate ? p.dueDate.slice(0, 10) : '';

                  return (
                    <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors">
                      {/* Period ID */}
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                        {p.periodId}
                      </td>

                      {/* Week # */}
                      <td className="py-3 px-4 font-medium text-gray-800">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 font-semibold">
                          W{p.weekNumber}
                        </span>
                      </td>

                      {/* Ethiopian Dates */}
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        {p.ethiopianStartDate} — {p.ethiopianEndDate}
                      </td>

                      {/* Saturday Due Date */}
                      <td className="py-3 px-4 font-bold text-emerald-700">
                        {p.ethiopianDueDate}
                      </td>

                      {/* Gregorian Date */}
                      <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                        {gDateStr}
                      </td>

                      {/* Rate */}
                      <td className="py-3 px-4 font-bold text-gray-800">
                        {p.contributionAmount} ETB
                      </td>

                      {/* Obligations Count */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              hasObligations ? 'text-emerald-700' : 'text-amber-600'
                            }`}
                          >
                            {p.obligationsCount} / {p.eligibleMembersCount || 0}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {lang === 'en' ? 'members' : 'miseensota'}
                          </span>
                        </div>
                      </td>

                      {/* Financials (Expected / Collected) */}
                      <td className="py-3 px-4">
                        <div className="text-xs">
                          <div className="font-bold text-gray-900">
                            {p.totalCollected} / {p.totalExpected} ETB
                          </div>
                          {p.totalOutstanding > 0 && (
                            <div className="text-[11px] text-amber-600 font-semibold">
                              {p.totalOutstanding} ETB {lang === 'en' ? 'outstanding' : 'hafe'}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {p.totalCollected >= p.totalExpected && p.totalExpected > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle size={12} />
                            {lang === 'en' ? 'Collected' : 'Guutame'}
                          </span>
                        ) : hasObligations ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                            <Clock size={12} />
                            {lang === 'en' ? 'Active' : 'Hojirra'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700">
                            <AlertTriangle size={12} />
                            {lang === 'en' ? 'Pending Obligations' : 'Dirqamni Hin Uumamne'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleGenerateSinglePeriodObligations(p)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            title={lang === 'en' ? 'Generate / Sync Member Obligations' : 'Dirqama Miseensaa Uumi / Haaromsi'}
                          >
                            {hasObligations
                              ? (lang === 'en' ? 'Sync' : 'Haaromsi')
                              : (lang === 'en' ? 'Generate' : 'Maddisiisi')}
                          </button>

                          <button
                            onClick={() => navigate('/records')}
                            className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                            title={lang === 'en' ? 'View in Member Records' : 'Galmee Miseensotaa keessatti Ilaali'}
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal 1: Generate Weekly Periods */}
      {showGeneratePeriodsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Calendar size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {lang === 'en' ? 'Confirm Weekly Period Generation' : 'Yeroo Torbee Maddisiisuu Mirkaneessi'}
                </h3>
                <p className="text-xs text-gray-500">
                  {lang === 'en'
                    ? 'Calculate exact Saturday deadlines using Ethiopian calendar'
                    : 'Dhaha Itoophiyaatiin Sanbata kaffaltii qindeessi'}
                </p>
              </div>
            </div>

            {previewLoading ? (
              <div className="py-8 text-center">
                <RefreshCw size={24} className="animate-spin mx-auto text-emerald-600 mb-2" />
                <p className="text-xs text-gray-500">{lang === 'en' ? 'Calculating preview...' : 'Shallagamaa jira...'}</p>
              </div>
            ) : previewData ? (
              <div className="space-y-3 my-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{lang === 'en' ? 'Ethiopian Year:' : 'Waggaa Itoophiyaa:'}</span>
                    <span className="font-bold text-gray-800">{previewData.ethiopianYear} EC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{lang === 'en' ? 'Target Month:' : "Ji'a:"}</span>
                    <span className="font-bold text-gray-800">
                      {selectedMonth === ''
                        ? (lang === 'en' ? 'All 13 Months' : "Ji'oota 13 Hunda")
                        : `${selectedMonth}. ${ETHIOPIAN_MONTHS[Number(selectedMonth) - 1]?.nameOm}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{lang === 'en' ? 'Periods to Generate:' : 'Torban Maddisiifamu:'}</span>
                    <span className="font-bold text-emerald-700">{previewData.totalPlannedWeeks} Saturdays</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{lang === 'en' ? 'Eligible Active Members:' : 'Miseensota Ga\'an:'}</span>
                    <span className="font-bold text-purple-700">{previewData.eligibleMembersCount} members</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{lang === 'en' ? 'Rate per Week:' : 'Kaffaltii Torbee:'}</span>
                    <span className="font-bold text-gray-900">{contributionRate} ETB</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-bold text-gray-700">{lang === 'en' ? 'Est. Total Expected:' : 'Waliigala Eegamu:'}</span>
                    <span className="font-bold text-emerald-700 text-sm">
                      {previewData.estimatedGrandTotalExpected.toLocaleString()} ETB
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs">
                  <p className="font-semibold mb-1">
                    {lang === 'en' ? '✓ Duplicate Prevention Guarantee' : '✓ Ittisa Dachaa'}
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    {lang === 'en'
                      ? 'The system checks unique period IDs and existing obligations. No existing financial periods or member obligations will be duplicated or modified.'
                      : 'Sirnichi koodii yeroo fi dirqama duraanii qorata. Yeroon ykn dirqamni kaffaltii duraan ture hin dachoomu.'}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowGeneratePeriodsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {lang === 'en' ? 'Cancel' : 'Dhiisi'}
              </button>
              <button
                type="button"
                onClick={handleConfirmGeneratePeriods}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all disabled:opacity-50"
              >
                {actionLoading && <RefreshCw size={14} className="animate-spin" />}
                <span>{lang === 'en' ? 'Confirm & Generate Periods' : 'Mirkaneessi & Maddisiisi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal 2: Batch Generate Obligations */}
      {showGenerateObligationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Users size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {lang === 'en' ? 'Generate Obligations for All Periods' : 'Dirqama Miseensaa Hunda Uumi'}
                </h3>
                <p className="text-xs text-gray-500">
                  {lang === 'en'
                    ? `Create ${contributionRate} ETB weekly payment obligations for all approved members`
                    : `Miseensota mirkanaa'an hundaaf dirqama kaffaltii Qar. ${contributionRate} uumi`}
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">{lang === 'en' ? 'Ethiopian Year:' : 'Waggaa Itoophiyaa:'}</span>
                  <span className="font-bold text-gray-800">{selectedYear} EC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{lang === 'en' ? 'Selected Scope:' : 'Bal\'ina:'}</span>
                  <span className="font-bold text-gray-800">
                    {selectedMonth === ''
                      ? (lang === 'en' ? 'All Periods in Year' : 'Yeroolee Waggaa Hunda')
                      : `${selectedMonth}. ${ETHIOPIAN_MONTHS[Number(selectedMonth) - 1]?.nameOm}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{lang === 'en' ? 'Eligible Active Members:' : 'Miseensota Ga\'an:'}</span>
                  <span className="font-bold text-purple-700">{activeMembersEstimate} members</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{lang === 'en' ? 'Weekly Rate:' : 'Kaffaltii Torbee:'}</span>
                  <span className="font-bold text-emerald-700">{contributionRate} ETB / Saturday</span>
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-xs">
                <p className="font-semibold mb-1">
                  {lang === 'en' ? '✓ Unique Member-Week Protection' : '✓ Eegumsa Dirqama Miseensaa'}
                </p>
                <p className="text-[11px] text-purple-800">
                  {lang === 'en'
                    ? 'Only members who do not already have an obligation for that specific week will receive one. Existing payments and balances are strictly preserved.'
                    : 'Miseensota torban sanaaf dirqama hin qabne qofatu uumamaaf. Kaffaltii fi baalaansiin duraanii hin tuqamu.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowGenerateObligationsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {lang === 'en' ? 'Cancel' : 'Dhiisi'}
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchGenerateObligations}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all disabled:opacity-50"
              >
                {actionLoading && <RefreshCw size={14} className="animate-spin" />}
                <span>{lang === 'en' ? 'Confirm & Create Obligations' : 'Mirkaneessi & Dirqama Uumi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
