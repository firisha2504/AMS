import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { PageHeader, LoadingSpinner, inputClass, btnPrimary, btnSecondary, Modal } from '../components/ui';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Building,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Save,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import {
  ETHIOPIAN_MONTHS,
  getDaysInEthiopianMonth,
  toGregorianDate,
} from '../lib/ethiopianCalendar';

interface Setting {
  key: string;
  value: string;
  label?: string;
  labelOm?: string;
}

interface OrgConfigData {
  id?: string;
  startingEthiopianYear: number;
  startingEthiopianMonth: number;
  startingEthiopianDate: number;
  startingDate: string;
  ethiopianMonthNameEn: string;
  ethiopianMonthNameOm: string;
  weeklyContributionRate: number;
  rateEffectiveDate: string;
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const isOm = i18n.language === 'om';

  // System Settings state
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Logo state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);

  // Organization Config state
  const [orgConfig, setOrgConfig] = useState<OrgConfigData | null>(null);
  const [orgYear, setOrgYear] = useState<number>(2017);
  const [orgMonth, setOrgMonth] = useState<number>(1);
  const [orgDate, setOrgDate] = useState<number>(1);
  const [orgRate, setOrgRate] = useState<number>(50);
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgFeedback, setOrgFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Obligation Recalculation state
  const [showRecalcModal, setShowRecalcModal] = useState(false);
  const [recalcReason, setRecalcReason] = useState('');
  const [recalcConfirmed, setRecalcConfirmed] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // General Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [modalMessage, setModalMessage] = useState('');

  // Available Ethiopian Years (2000 to 2035 E.C.)
  const availableYears = useMemo(() => {
    const list: number[] = [];
    for (let y = 2010; y <= 2030; y++) {
      list.push(y);
    }
    return list;
  }, []);

  // Days in current selected Ethiopian month
  const maxDaysInSelectedMonth = useMemo(() => {
    return getDaysInEthiopianMonth(orgYear, orgMonth);
  }, [orgYear, orgMonth]);

  // Ensure selected date does not exceed max days when month/year changes
  useEffect(() => {
    if (orgDate > maxDaysInSelectedMonth) {
      setOrgDate(maxDaysInSelectedMonth);
    }
  }, [maxDaysInSelectedMonth, orgDate]);

  // Live Gregorian conversion preview
  const gregorianPreview = useMemo(() => {
    try {
      const gDate = toGregorianDate(orgYear, orgMonth, orgDate);
      return gDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Ethiopian Date';
    }
  }, [orgYear, orgMonth, orgDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, orgRes] = await Promise.all([
        api.get('/settings'),
        api.get('/settings/organization'),
      ]);

      setSettings(settingsRes.data.data || []);

      const logoSetting = settingsRes.data.data?.find((s: Setting) => s.key === 'mobile_app_logo');
      if (logoSetting?.value) {
        setCurrentLogo(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${logoSetting.value}`);
      }

      if (orgRes.data?.success && orgRes.data.data) {
        const conf: OrgConfigData = orgRes.data.data;
        setOrgConfig(conf);
        setOrgYear(conf.startingEthiopianYear);
        setOrgMonth(conf.startingEthiopianMonth);
        setOrgDate(conf.startingEthiopianDate);
        setOrgRate(conf.weeklyContributionRate);
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const update = (key: string, value: string) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/settings', { settings: settings.map(({ key, value }) => ({ key, value })) });
      setModalType('success');
      setModalMessage(isOm ? 'Gulaalliin milkaa\'inaan olkaa\'ameera.' : 'Settings saved successfully.');
      setModalOpen(true);
    } catch (err: any) {
      setModalType('error');
      setModalMessage(err?.response?.data?.message || 'Failed to save settings.');
      setModalOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrgConfig = async () => {
    if (orgRate <= 0) {
      setOrgFeedback({
        type: 'error',
        message: isOm ? 'Gatiin gumaacha torbee 0 ol ta\'uu qaba.' : 'Weekly contribution rate must be greater than 0.',
      });
      return;
    }

    setSavingOrg(true);
    setOrgFeedback(null);
    try {
      const calculatedGregorianDate = toGregorianDate(orgYear, orgMonth, orgDate);
      const res = await api.put('/settings/organization', {
        startingEthiopianYear: orgYear,
        startingEthiopianMonth: orgMonth,
        startingEthiopianDate: orgDate,
        weeklyContributionRate: orgRate,
        rateEffectiveDate: calculatedGregorianDate.toISOString().slice(0, 10),
      });

      if (res.data?.success) {
        setOrgConfig(res.data.data);
        setOrgFeedback({
          type: 'success',
          message: isOm
            ? `Qindaa'inni gamtaa milkaa'inaan haaromsameera (${orgDate}/${orgMonth}/${orgYear} ALH).`
            : `Organization configuration saved successfully (${orgDate}/${orgMonth}/${orgYear} E.C.).`,
        });
      }
    } catch (err: any) {
      setOrgFeedback({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to save organization configuration.',
      });
    } finally {
      setSavingOrg(false);
    }
  };

  const handleCancelOrgConfig = () => {
    if (orgConfig) {
      setOrgYear(orgConfig.startingEthiopianYear);
      setOrgMonth(orgConfig.startingEthiopianMonth);
      setOrgDate(orgConfig.startingEthiopianDate);
      setOrgRate(orgConfig.weeklyContributionRate);
    }
    setOrgFeedback(null);
  };

  const handleRecalculateObligations = async () => {
    if (!recalcConfirmed) return;

    setRecalculating(true);
    try {
      const res = await api.post('/settings/organization/recalculate-obligations', {
        confirmRecalculate: true,
        reason: recalcReason || 'Manual recalculation triggered from Organization Settings',
      });

      if (res.data?.success) {
        const d = res.data.data;
        setShowRecalcModal(false);
        setRecalcReason('');
        setRecalcConfirmed(false);

        setModalType('success');
        setModalMessage(
          isOm
            ? `Dirqamni kaffaltii milkaa'inaan shallagameera! Miseensota: ${d.totalApprovedMembers}, Yeroolee: ${d.totalPeriodsEvaluated}, Dirqama haaraa uumame: ${d.newObligationsCreated}. Nagaheen duraanii hundi eegamaniiru.`
            : `Obligations successfully recalculated! Members evaluated: ${d.totalApprovedMembers}, Periods: ${d.totalPeriodsEvaluated}, New obligations created: ${d.newObligationsCreated}. All historical payment records remain preserved.`
        );
        setModalOpen(true);
      }
    } catch (err: any) {
      setModalType('error');
      setModalMessage(err?.response?.data?.message || 'Failed to recalculate obligations.');
      setModalOpen(true);
    } finally {
      setRecalculating(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);

      const { data } = await api.post('/settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setCurrentLogo(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${data.data.logoPath}`);
      setLogoFile(null);
      setLogoPreview(null);

      setModalType('success');
      setModalMessage('Logo uploaded successfully! The new logo will appear in the mobile app immediately.');
      setModalOpen(true);
    } catch {
      setModalType('error');
      setModalMessage('Failed to upload logo. Please try again.');
      setModalOpen(true);
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title={t('nav.settings')}
          subtitle={
            isOm
              ? 'Qindaa\'ina Gamtaa, Dhaha Itoophiyaa, fi loogoo moobaayilaa bulchaa'
              : 'Manage organization founding parameters, Ethiopian calendar timeline, and system settings'
          }
          action={
            <button className={btnPrimary} onClick={saveSettings} disabled={saving}>
              <Save size={16} />
              <span>{saving ? t('common.loading') : t('common.save')}</span>
            </button>
          }
        />

        {/* ════════════════════════════════════════════════════════════════
            SECTION 1: ORGANIZATION CONFIGURATION & STARTING YEAR
        ════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                <Building size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {isOm ? 'Qindaa\'ina Hundeeffama Gamtaa' : 'Organization Foundation & Calendar Settings'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isOm
                    ? 'Waggaa hundeeffama gamtaa fi gatii gumaacha torbanii dhaha Itoophiyaatiin qindeessaa'
                    : 'Configure the organization starting Ethiopian year, month, date, and weekly contribution rate'}
                </p>
              </div>
            </div>

            {orgConfig && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold self-start sm:self-auto">
                <Calendar size={14} />
                <span>
                  {isOm ? 'Hundeeffama: ' : 'Active Starting Date: '}
                  <strong>
                    {orgConfig.startingEthiopianDate} {orgConfig.ethiopianMonthNameEn} {orgConfig.startingEthiopianYear} E.C.
                  </strong>
                </span>
              </div>
            )}
          </div>

          {orgFeedback && (
            <div
              className={`mt-4 p-4 rounded-xl text-sm flex items-center gap-2.5 ${
                orgFeedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {orgFeedback.type === 'success' ? (
                <CheckCircle size={18} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={18} className="text-red-600 shrink-0" />
              )}
              <span className="font-semibold text-xs sm:text-sm">{orgFeedback.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
            {/* 1. Ethiopian Starting Year */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {isOm ? '1. Waggaa Hundeeffamaa (ALH)' : '1. Starting Ethiopian Year (E.C.)'}
              </label>
              <select
                value={orgYear}
                onChange={(e) => setOrgYear(Number(e.target.value))}
                className={inputClass}
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr} {isOm ? 'ALH' : 'E.C.'}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                {isOm
                  ? 'Yeroon torbee waggaa kana dura hin maddisiifamu.'
                  : 'Weekly periods cannot be generated before this Ethiopian year.'}
              </p>
            </div>

            {/* 2. Ethiopian Starting Month */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {isOm ? '2. Ji\'a Hundeeffamaa' : '2. Starting Ethiopian Month'}
              </label>
              <select
                value={orgMonth}
                onChange={(e) => setOrgMonth(Number(e.target.value))}
                className={inputClass}
              >
                {ETHIOPIAN_MONTHS.map((m) => (
                  <option key={m.number} value={m.number}>
                    {m.number}. {m.nameEn} ({m.nameOm})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                {orgMonth === 13
                  ? isOm
                    ? 'Ji\'a 13ffaa (Qaammee) guyyoota 5 ykn 6 qaba.'
                    : '13th month (Pagume) contains 5 or 6 leap days.'
                  : isOm
                  ? 'Ji\'oonni 1–12 guyyoota 30 qabu.'
                  : 'Months 1 to 12 each have 30 days.'}
              </p>
            </div>

            {/* 3. Ethiopian Starting Day */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {isOm ? `3. Guyyaa Hundeeffamaa (1–${maxDaysInSelectedMonth})` : `3. Starting Ethiopian Day (1–${maxDaysInSelectedMonth})`}
              </label>
              <select
                value={orgDate}
                onChange={(e) => setOrgDate(Number(e.target.value))}
                className={inputClass}
              >
                {Array.from({ length: maxDaysInSelectedMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                {isOm
                  ? `Ji'a ${orgMonth} keessa guyyoota ${maxDaysInSelectedMonth} qofatu jira.`
                  : `Month ${orgMonth} has ${maxDaysInSelectedMonth} valid days.`}
              </p>
            </div>

            {/* 4. Automatically Calculated Gregorian Equivalent (read-only) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>{isOm ? '4. Walqixa Faranjii' : '4. Gregorian Equivalent'}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase">
                  <Lock size={10} />
                  {isOm ? 'Dubbisa Qofa' : 'Read-only'}
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={gregorianPreview}
                  className={`${inputClass} bg-slate-100 text-slate-800 border-slate-300 font-semibold cursor-not-allowed pr-8 select-all shadow-inner`}
                  title={gregorianPreview}
                />
                <Lock size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>
              <p className="text-[11px] text-emerald-700 font-medium mt-1">
                {isOm
                  ? 'Ofumaan herreegama; harkaan galchuun hin barbaachisu.'
                  : 'Auto-calculated instantly; manual entry is prohibited.'}
              </p>
            </div>
          </div>

          {/* Gregorian Equivalent Detailed Preview Card */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50/70 to-blue-50/70 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-slate-800 text-xs sm:text-sm">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Calendar size={15} />
              </div>
              <div>
                <span className="font-medium text-slate-600 block text-[11px]">
                  {isOm ? 'Hundeeffama Dhaha Itoophiyaa & Walqixa Faranjii:' : 'Ethiopian Foundation Date & Gregorian Equivalent:'}
                </span>
                <span className="font-bold text-slate-900">
                  {orgDate} {ETHIOPIAN_MONTHS[orgMonth - 1]?.nameEn} ({ETHIOPIAN_MONTHS[orgMonth - 1]?.nameOm}) {orgYear} E.C.
                  <span className="mx-2 text-slate-400">↔</span>
                  <span className="text-emerald-700 underline decoration-emerald-400 font-semibold">{gregorianPreview}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-300">
                {orgDate}/{orgMonth}/{orgYear} E.C.
              </span>
              <span className="text-[11px] font-mono text-slate-600 bg-white px-2 py-1 rounded-md border border-slate-200">
                {(() => {
                  try {
                    return toGregorianDate(orgYear, orgMonth, orgDate).toISOString().slice(0, 10);
                  } catch {
                    return '—';
                  }
                })()}
              </span>
            </div>
          </div>

          <div className="mt-5 max-w-md">
            {/* 4. Weekly Contribution Rate */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {isOm ? 'Gatii Kaffaltii Torbanii (Qar)' : 'Weekly Contribution Rate (ETB)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={orgRate}
                  onChange={(e) => setOrgRate(Number(e.target.value))}
                  className={inputClass}
                  placeholder="50"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-gray-400">
                  ETB
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {isOm
                  ? 'Gatiin kun Sanbata hunda kaffaltii torbee uumamuuf bu\'uura ta\'a.'
                  : 'Standard weekly rate applied when generating Saturday periods.'}
              </p>
            </div>
          </div>

          {/* Action Buttons for Organization Settings */}
          <div className="flex flex-wrap items-center justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCancelOrgConfig}
              disabled={savingOrg}
              className={btnSecondary}
            >
              <RotateCcw size={15} />
              <span>{isOm ? 'Dhiisi / Deebisi' : 'Cancel / Reset'}</span>
            </button>
            <button
              type="button"
              onClick={handleSaveOrgConfig}
              disabled={savingOrg}
              className={btnPrimary}
            >
              {savingOrg && <LoadingSpinner />}
              <Save size={15} />
              <span>{savingOrg ? (isOm ? 'Olkaa\'amaa...' : 'Saving...') : isOm ? 'Qindaa\'ina Olkaa\'i' : 'Save Organization Settings'}</span>
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 2: MEMBER OBLIGATION RECALCULATION ENGINE
        ════════════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-white rounded-2xl border border-amber-200 p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
                <ShieldAlert size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">
                  {isOm ? 'Mootora Dirqama Kaffaltii Miseensotaa Haaromsuu' : 'Member Financial Obligation Engine'}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed max-w-2xl">
                  {isOm
                    ? 'Dirqamni kaffaltii miseensaa guyyaa miseensichi itti mirkanaa\'e (joinDate) bu\'uureffata. Miseensi kamiyyuu guyyaa hundeeffama gamtaa irraa qabee dirqama hin kaffalchiifamu; guyyaa mirkanaa\'ee as qofa shallagama. Kaffaltiiwwan fi adabbiin duraanii hundi hin tuqaman.'
                    : "Member weekly obligations are strictly rooted in each individual member's approved financial eligibility date (join date). Members are never back-charged for weeks prior to joining. Historical payments, verified receipts, and penalties are safely preserved."}
                </p>
                <div className="pt-2 flex items-center gap-2 text-[11px] font-semibold text-amber-800">
                  <span>🔒 Audit Log Protected</span>
                  <span>•</span>
                  <span>Explicit Admin Confirmation Required</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRecalcModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all self-start shrink-0 active:scale-95"
            >
              <RotateCcw size={15} />
              <span>{isOm ? 'Dirqamoota Haaromsi' : 'Recalculate Obligations'}</span>
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 3: MOBILE APP LOGO
        ════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-gray-600" />
            {isOm ? 'Loogoo Moobaayilaa' : 'Mobile App Logo'}
          </h2>

          <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start">
            {/* Current Logo */}
            <div className="flex-shrink-0">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                {isOm ? 'Loogoo Ammaa' : 'Current Logo'}
              </p>
              <div className="w-24 sm:w-32 h-24 sm:h-32 border-2 border-gray-200 rounded-xl flex items-center justify-center bg-gray-50 flex-shrink-0 overflow-hidden">
                {currentLogo ? (
                  <img src={currentLogo} alt="App Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <ImageIcon className="w-8 sm:w-12 h-8 sm:h-12 text-gray-400" />
                )}
              </div>
            </div>

            {/* Upload New Logo */}
            <div className="flex-1 w-full">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                {isOm ? 'Loogoo Haaraa Fe\'i' : 'Upload New Logo'}
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 text-center hover:border-emerald-400 transition-colors bg-gray-50/50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="logo-upload"
                />
                <label htmlFor="logo-upload" className="cursor-pointer block">
                  <Upload className="w-8 sm:w-10 h-8 sm:h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">
                    {isOm ? 'Fe\'uuf as cuqqaalaa' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-400">PNG, JPG, WEBP up to 10MB</p>
                </label>
              </div>

              {/* Preview */}
              {logoPreview && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    {isOm ? 'Dur-agarsiisa' : 'Preview'}
                  </p>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                    <div className="w-20 h-20 border-2 border-emerald-200 rounded-xl flex items-center justify-center bg-emerald-50 flex-shrink-0 overflow-hidden">
                      <img src={logoPreview} alt="Preview" className="w-full h-full object-contain p-1" />
                    </div>
                    <button
                      onClick={uploadLogo}
                      disabled={uploadingLogo}
                      className={btnPrimary}
                    >
                      {uploadingLogo ? 'Uploading...' : isOm ? 'Loogoo Fe\'i' : 'Upload Logo'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            {isOm
              ? 'Loogoon kun appilikeeshinii moobaayilaa irratti battalumatti mul\'ata.'
              : 'This logo will be displayed in the mobile app header and sign-in screen.'}
          </p>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 4: SYSTEM SETTINGS (KEY-VALUE)
        ════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              {isOm ? 'Qindaa\'ina Dabalataa Sirnichaa' : 'Additional System Parameters'}
            </h2>
            <span className="text-xs text-gray-500">
              {settings.filter((s) => s.key !== 'mobile_app_logo').length} {isOm ? 'qindaa\'inoota' : 'settings'}
            </span>
          </div>

          {settings
            .filter((s) => s.key !== 'mobile_app_logo')
            .map((s) => (
              <div
                key={s.key}
                className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-6 hover:bg-gray-50/60 transition-colors"
              >
                <label className="md:w-1/3 text-xs sm:text-sm font-semibold text-gray-700 flex-shrink-0">
                  {s.label || s.key}
                </label>
                <input
                  className={`${inputClass} md:flex-1`}
                  value={s.value}
                  onChange={(e) => update(s.key, e.target.value)}
                />
              </div>
            ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          MODAL: RECALCULATE MEMBER OBLIGATIONS (EXPLICIT CONFIRMATION)
      ════════════════════════════════════════════════════════════════ */}
      <Modal
        open={showRecalcModal}
        onClose={() => setShowRecalcModal(false)}
        title={isOm ? 'Haaromsa Dirqama Kaffaltii Mirkaneessi' : 'Confirm Financial Obligation Recalculation'}
      >
        <div className="space-y-4 py-2">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
            <AlertTriangle size={24} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <p className="font-bold text-amber-950">
                {isOm ? 'Of-eeggannoo: Dirqama Miseensotaa Hunda Shallaguu' : 'Warning: Member-Specific Recalculation'}
              </p>
              <p className="text-amber-800 text-xs">
                {isOm
                  ? 'Adeemsi kun yeroolee kaffaltii waggaa hundeeffamaa eegalee jiran qorachuun miseensota mirkanaa\'aniif dirqama uuma. Dirqamni kan shallagamu guyyaa miseensummaa miseensa tokkoon tokkoo irratti hundaa\'eeti.'
                  : "This process examines all generated weekly periods since the organization starting year and ensures eligible approved members have obligations only for periods on or after their individual joining date. Existing payments, receipts, and penalties will NOT be deleted or altered."}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {isOm ? 'Sababa Haaromsaa (Audit Log keessatti galmaa\'a)' : 'Reason for Recalculation (Recorded in Audit Log)'}
            </label>
            <input
              type="text"
              value={recalcReason}
              onChange={(e) => setRecalcReason(e.target.value)}
              placeholder="e.g. Updated organization founding year to 2017 EC or aligned new member eligibility"
              className={inputClass}
            />
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={recalcConfirmed}
                onChange={(e) => setRecalcConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-gray-700 font-medium leading-relaxed">
                {isOm
                  ? 'Ani akka Bulchaatti (Admin) dirqamni kaffaltii miseensotaa akka haaromfamu fi galmeen nagahee duraanii akka eegamu mirkaneesseera.'
                  : 'I explicitly confirm and authorize recalculating weekly obligations across all approved members. I understand an immutable Audit Log entry will be recorded.'}
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowRecalcModal(false)}
              className={btnSecondary}
              disabled={recalculating}
            >
              {isOm ? 'Dhiisi' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleRecalculateObligations}
              disabled={!recalcConfirmed || recalculating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm disabled:opacity-50 transition-all"
            >
              {recalculating && <LoadingSpinner />}
              <span>{recalculating ? (isOm ? 'Adeemsifamaa jira...' : 'Processing...') : isOm ? 'Mirkaneessi & Haaromsi' : 'Confirm Recalculation'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          SUCCESS / ERROR MODAL
      ════════════════════════════════════════════════════════════════ */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalType === 'success' ? 'Success' : 'Notice'}>
        <div className="text-center py-4">
          {modalType === 'success' ? (
            <CheckCircle className="w-14 h-14 text-emerald-600 mx-auto mb-3" />
          ) : (
            <XCircle className="w-14 h-14 text-red-600 mx-auto mb-3" />
          )}
          <p className="text-slate-800 text-sm leading-relaxed max-w-sm mx-auto">{modalMessage}</p>
          <button
            onClick={() => setModalOpen(false)}
            className={`mt-6 ${btnPrimary}`}
          >
            OK
          </button>
        </div>
      </Modal>
    </>
  );
}
