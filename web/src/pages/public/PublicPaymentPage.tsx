import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Receipt,
  ShieldCheck,
  DollarSign,
  Printer
} from 'lucide-react';
import PublicLayout from '../../components/PublicLayout';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { LoadingSpinner, Modal } from '../../components/ui';

interface PaymentInfoData {
  rates: {
    weeklyContribution: number;
    weeklyPenalty: number;
    monthlyPenalty: number;
    graduationContribution: number;
    bereavementContribution: number;
    meetingDay: string;
    meetingDayOm: string;
  };
  paymentMethods: Array<{
    id: string;
    name: string;
    nameOm: string;
    accountName: string;
    accountNumber: string;
    branch?: string;
    merchantCode?: string;
    swiftCode?: string;
    instructionsEn: string;
    instructionsOm: string;
    icon: string;
  }>;
  rules: {
    weeklyContribution: { titleEn: string; titleOm: string; descriptionEn: string; descriptionOm: string };
    penalties: { titleEn: string; titleOm: string; descriptionEn: string; descriptionOm: string };
    historicalJoining: { titleEn: string; titleOm: string; descriptionEn: string; descriptionOm: string };
    specialAndEmergency: { titleEn: string; titleOm: string; descriptionEn: string; descriptionOm: string };
  };
  member: {
    id: string;
    fullName: string;
    memberId: string;
    status: string;
    phone?: string;
    outstandingBalance: number;
    totalCredit: number;
    totalAmountPaid: number;
    totalPenalties: number;
    unpaidObligationsCount: number;
    dueThisSaturday: number;
    nextSaturdayDate: string;
    penalties?: Array<{
      id: string;
      amount: number;
      amountPaid?: number;
      title?: string | null;
      reason: string;
      status: string;
      isMonthly: boolean;
    }>;
    obligations?: Array<{
      id: string;
      weekNumber: number;
      year: number;
      originalAmount?: number;
      contributionAmount?: number;
      amountPaid?: number;
      status: string;
    }>;
    recentPayments: Array<{
      id: string;
      paymentId: string;
      date: string;
      amount: number;
      method: string;
      status: string;
      receiptNumber?: string;
      notes?: string;
    }>;
  } | null;
}

export default function PublicPaymentPage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOm = i18n.language === 'om';

  const [data, setData] = useState<PaymentInfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Authenticated Member Payment Form State
  const [selectedCategory, setSelectedCategory] = useState<'WEEKLY' | 'PENALTY' | 'SPECIAL' | 'JOINING' | 'GENERAL'>('WEEKLY');
  const [selectedPenaltyId, setSelectedPenaltyId] = useState<string>('');
  const [selectedObligationId, setSelectedObligationId] = useState<string>('');
  const [selectedSpecialId] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<'CBE' | 'TELEBIRR' | 'EBIRR' | 'BANK_TRANSFER'>('CBE');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{ referenceNumber: string; amount: number; provider: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const fetchPaymentInfo = async () => {
    try {
      const res = await api.get('/public/payment-info');
      if (res.data?.data) {
        setData(res.data.data);
        if (res.data.data.rates && !paymentAmount) {
          setPaymentAmount(String(res.data.data.rates.weeklyContribution || 50));
        }
      }
    } catch (err) {
      console.error('Failed to load payment info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentInfo();
  }, [user]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleMemberSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login?redirect=/payment');
      return;
    }

    const amountNum = parseFloat(paymentAmount);
    if (!amountNum || amountNum <= 0) {
      setErrorMessage(isOm ? 'Hanga maallaqaa sirrii galchaa' : 'Please enter a valid amount');
      return;
    }

    if (!transactionRef.trim()) {
      setErrorMessage(isOm ? 'Lakkoofsa ragaa kaffaltii (Transaction Reference) galchaa' : 'Please provide the transaction reference / receipt number');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Create Payment Request with exact target and category
      const createPayload: any = {
        amount: amountNum,
        paymentProvider: selectedProvider,
        category: selectedCategory === 'JOINING' ? 'HISTORICAL' : selectedCategory === 'GENERAL' ? 'ALL' : selectedCategory,
      };

      if (selectedCategory === 'PENALTY' && selectedPenaltyId) {
        createPayload.penaltyId = selectedPenaltyId;
      } else if (selectedCategory === 'WEEKLY' && selectedObligationId) {
        createPayload.obligationId = selectedObligationId;
      } else if ((selectedCategory === 'SPECIAL' || selectedCategory === 'JOINING') && selectedSpecialId) {
        createPayload.specialContributionObligationId = selectedSpecialId;
      }

      const createRes = await api.post('/payment-requests', createPayload);

      const paymentRequest = createRes.data?.data;
      if (paymentRequest?.id) {
        // 2. Submit reference
        await api.post(`/payment-requests/${paymentRequest.id}/submit`, {
          transactionReference: transactionRef.trim(),
        });

        setSubmitSuccess({
          referenceNumber: paymentRequest.referenceNumber || transactionRef,
          amount: amountNum,
          provider: selectedProvider,
        });

        setTransactionRef('');
        // Refresh data
        await fetchPaymentInfo();
      }
    } catch (err: any) {
      console.error('Payment submission failed:', err);
      setErrorMessage(err.response?.data?.message || err.message || (isOm ? 'Kaffaltiin hin milkoofne' : 'Payment submission failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      {/* ── Hero Section ── */}
      <section
        className="relative py-12 sm:py-16 text-white text-center px-4"
        style={{ background: 'linear-gradient(135deg, #060e33 0%, #091540 60%, #0d1e5e 100%)' }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck size={14} />
            <span>{isOm ? 'Kaffaltii Qulqulluu fi Nageenya Qabu' : 'Secure & Transparent Contributions'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black mb-3 tracking-tight">
            {isOm ? 'Giddugala Kaffaltii fi Gumaata Gamtaa' : 'Afosha Payment & Contribution Center'}
          </h1>
          <p className="text-base sm:text-lg text-blue-200 max-w-2xl mx-auto italic mb-6">
            "{isOm ? 'Tokkummaan Ciminaa fi Milkaayina' : 'Unity is Strength and Success'}" — Gamtaan dargaggoota Melka Jabdu Qaxaa Araati
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {!user ? (
              <Link
                to="/login?redirect=/payment"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-900/40 transition-all text-sm"
              >
                <span>{isOm ? 'Kaffaluuf Seeni' : 'Login to Pay'}</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <a
                href="#member-payment-section"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-900/40 transition-all text-sm"
              >
                <span>{isOm ? 'Kaffaltii Raawwadhu' : 'Make Payment Now'}</span>
                <DollarSign size={16} />
              </a>
            )}
            <a
              href="#payment-methods"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-blue-100 bg-white/10 hover:bg-white/15 border border-white/10 transition-all text-sm"
            >
              <span>{isOm ? 'Mala Kaffaltii Ilaali' : 'Supported Methods'}</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Main Content Container ── */}
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
        {loading ? (
          <div className="py-20 text-center">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* ── 1. Live Database Rates Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Weekly Contribution */}
              <div
                className="p-5 rounded-2xl border transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, rgba(22, 101, 52, 0.3) 0%, rgba(9, 21, 64, 0.8) 100%)',
                  borderColor: 'rgba(34, 197, 94, 0.3)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <Calendar size={20} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {isOm ? 'Torbanitti' : 'Weekly Rate'}
                  </span>
                </div>
                <p className="text-xs text-blue-200 font-medium">{isOm ? 'Kaffaltii Torbanii' : 'Weekly Contribution'}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-white">{data?.rates.weeklyContribution || 50}</span>
                  <span className="text-sm font-semibold text-emerald-400">ETB</span>
                </div>
                <p className="text-xs text-blue-300/80 mt-2 flex items-center gap-1">
                  <Clock size={12} />
                  <span>{isOm ? 'Guyyaa: Sanbata Hunda' : 'Schedule: Every Saturday'}</span>
                </p>
              </div>

              {/* Card 2: Weekly Penalty */}
              <div
                className="p-5 rounded-2xl border transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.25) 0%, rgba(9, 21, 64, 0.8) 100%)',
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <AlertTriangle size={20} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    {isOm ? 'Adabbii Torbanii' : 'Late Fee'}
                  </span>
                </div>
                <p className="text-xs text-blue-200 font-medium">{isOm ? 'Adabbii Torbanii' : 'Weekly Late Penalty'}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-white">{data?.rates.weeklyPenalty || 50}</span>
                  <span className="text-sm font-semibold text-amber-400">ETB</span>
                </div>
                <p className="text-xs text-blue-300/80 mt-2">
                  {isOm ? 'Sanbata dabarsuu irratti' : 'Applied for missing deadline'}
                </p>
              </div>

              {/* Card 3: Monthly Penalty */}
              <div
                className="p-5 rounded-2xl border transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(9, 21, 64, 0.8) 100%)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
                    <AlertTriangle size={20} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                    {isOm ? 'Ji\'aan' : 'Monthly Default'}
                  </span>
                </div>
                <p className="text-xs text-blue-200 font-medium">{isOm ? 'Adabbii Ji\'aa' : 'Monthly Overdue Penalty'}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-white">{data?.rates.monthlyPenalty || 100}</span>
                  <span className="text-sm font-semibold text-red-400">ETB</span>
                </div>
                <p className="text-xs text-blue-300/80 mt-2">
                  {isOm ? 'Torban 8 walitti aanee' : '8+ weeks overdue escalation'}
                </p>
              </div>

              {/* Card 4: Special Solidarity Fund */}
              <div
                className="p-5 rounded-2xl border transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(9, 21, 64, 0.8) 100%)',
                  borderColor: 'rgba(59, 130, 246, 0.3)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    <ShieldCheck size={20} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                    {isOm ? 'Gumaacha' : 'Solidarity'}
                  </span>
                </div>
                <p className="text-xs text-blue-200 font-medium">{isOm ? 'Gumaacha Addaa' : 'Special Contributions'}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-white">{data?.rates.graduationContribution || 100}</span>
                  <span className="text-sm font-semibold text-blue-400">ETB</span>
                </div>
                <p className="text-xs text-blue-300/80 mt-2">
                  {isOm ? 'Gadda (100) fi Eebba (100)' : 'Bereavement & Graduation'}
                </p>
              </div>
            </div>

            {/* ── 2. Authenticated Member Dashboard & Payment Action (if logged in) ── */}
            {user && data?.member ? (
              <div
                id="member-payment-section"
                className="p-6 sm:p-8 rounded-3xl border shadow-2xl scroll-mt-24"
                style={{
                  background: 'linear-gradient(135deg, rgba(13, 30, 94, 0.9) 0%, rgba(9, 21, 64, 0.95) 100%)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl sm:text-2xl font-bold text-white">{data.member.fullName}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {data.member.memberId}
                      </span>
                    </div>
                    <p className="text-sm text-blue-200 mt-1">
                      {isOm ? 'Istatistiksii kaffaltii qabatamaa herrega keessanii' : 'Your authenticated real-time financial balance'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-white/10 text-blue-100">
                      {isOm ? 'Haala: ' : 'Status: '}{data.member.status}
                    </span>
                  </div>
                </div>

                {/* Member KPI 3-col */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-blue-300">{isOm ? 'Haftee Kaffaltii (Balance)' : 'Outstanding Balance'}</p>
                    <p className={`text-2xl font-black mt-1 ${data.member.outstandingBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {data.member.outstandingBalance} <span className="text-xs font-normal">ETB</span>
                    </p>
                    <p className="text-[11px] text-blue-200/70 mt-1">
                      {data.member.unpaidObligationsCount} {isOm ? 'torban kaffaltii hin qabamne' : 'pending weekly dues'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-blue-300">{isOm ? 'Waliigala Kaffalame' : 'Total Amount Paid'}</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1">
                      {data.member.totalAmountPaid} <span className="text-xs font-normal">ETB</span>
                    </p>
                    <p className="text-[11px] text-blue-200/70 mt-1">{isOm ? 'Nagahee mirkanaa\'e' : 'Verified receipts on ledger'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-blue-300">{isOm ? 'Adabbii Hin Kaffalamne' : 'Unpaid Penalties'}</p>
                    <p className={`text-2xl font-black mt-1 ${data.member.totalPenalties > 0 ? 'text-red-400' : 'text-blue-300'}`}>
                      {data.member.totalPenalties} <span className="text-xs font-normal">ETB</span>
                    </p>
                    <p className="text-[11px] text-blue-200/70 mt-1">{isOm ? 'Adabbii dhiyaate' : 'Outstanding late charges'}</p>
                  </div>
                </div>

                {/* Member Interactive Payment Submission Form */}
                <div className="p-6 rounded-2xl bg-black/30 border border-white/10 mb-8">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <CreditCard size={18} className="text-emerald-400" />
                    <span>{isOm ? 'Kaffaltii Haaraa Ergaa (Submit Payment Request)' : 'Submit Online Payment Request'}</span>
                  </h3>
                  <p className="text-xs text-blue-200 mb-5">
                    {isOm
                      ? 'Kaffaltii baankii ykn moobaayilaan raawwattanii ragaa (reference number) asitti galchaa. Qorataan (Auditor) battalumatti mirkaneessa.'
                      : 'Transfer through your provider, then enter the transaction reference below. It will be officially audited and receipted.'}
                  </p>

                  {submitSuccess && (
                    <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 mb-5 flex items-start gap-3">
                      <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-white text-sm">
                          {isOm ? 'Kaffaltiin Keessan Galmaa\'eera!' : 'Payment Request Submitted Successfully!'}
                        </p>
                        <p className="text-xs mt-1">
                          {isOm
                            ? `Lakk. Ragaa: ${submitSuccess.referenceNumber} | Hanga: ${submitSuccess.amount} ETB (${submitSuccess.provider}). Haala: Qorannoo irratti jira.`
                            : `Reference: ${submitSuccess.referenceNumber} | Amount: ${submitSuccess.amount} ETB via ${submitSuccess.provider}. Status: Pending Audit Verification.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 mb-5 flex items-start gap-3">
                      <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs">{errorMessage}</p>
                    </div>
                  )}

                  <form onSubmit={handleMemberSubmitPayment} className="space-y-4">
                    {/* Category Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-blue-200 mb-1.5">
                        {isOm ? 'Gosa Kaffaltii (Payment Category)' : 'Payment Category'}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'WEEKLY', labelEn: 'Weekly Dues', labelOm: 'Kaffaltii Torbanii' },
                          { id: 'PENALTY', labelEn: 'Late Penalty', labelOm: 'Adabbii' },
                          { id: 'SPECIAL', labelEn: 'Special Aid', labelOm: 'Gumaacha Addaa' },
                          { id: 'GENERAL', labelEn: 'Custom Balance', labelOm: 'Haftee Kaffaltii' },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat.id as any);
                              if (cat.id === 'WEEKLY') {
                                setPaymentAmount(String(data?.rates?.weeklyContribution || 50));
                              } else if (cat.id === 'PENALTY') {
                                const unpaid = data?.member?.penalties?.find((p: any) => p.status !== 'SETTLED' && p.status !== 'WAIVED');
                                if (unpaid) {
                                  setSelectedPenaltyId(unpaid.id);
                                  const rem = Number(unpaid.amount) - Number(unpaid.amountPaid || 0);
                                  setPaymentAmount(String(rem > 0 ? rem : unpaid.amount));
                                } else {
                                  setPaymentAmount('50');
                                }
                              } else if (cat.id === 'SPECIAL') {
                                setPaymentAmount('100');
                              } else if (cat.id === 'GENERAL') {
                                setPaymentAmount(String(data?.member?.outstandingBalance || 100));
                              }
                            }}
                            className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all ${
                              selectedCategory === cat.id
                                ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                                : 'bg-white/5 text-blue-200 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {isOm ? cat.labelOm : cat.labelEn}
                          </button>
                        ))}
                      </div>

                      {/* Penalty Target Selector */}
                      {selectedCategory === 'PENALTY' && data?.member?.penalties && data.member.penalties.length > 0 && (
                        <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
                          <label className="block text-xs font-semibold text-blue-200 mb-1.5">
                            {isOm ? 'Adabbii Kaffalamu Filadhaa' : 'Select Penalty Obligation to Pay'}
                          </label>
                          <select
                            value={selectedPenaltyId}
                            onChange={(e) => {
                              setSelectedPenaltyId(e.target.value);
                              const p = data?.member?.penalties?.find((pen: any) => pen.id === e.target.value);
                              if (p) {
                                const rem = Number(p.amount) - Number(p.amountPaid || 0);
                                setPaymentAmount(String(rem > 0 ? rem : p.amount));
                              }
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-medium focus:outline-none focus:border-emerald-400"
                          >
                            <option value="">{isOm ? '-- Adabbii Filadhaa --' : '-- Choose Penalty --'}</option>
                            {data.member.penalties.filter((p: any) => p.status !== 'SETTLED' && p.status !== 'WAIVED').map((p: any) => {
                              const rem = Number(p.amount) - Number(p.amountPaid || 0);
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.isMonthly ? '[Monthly] ' : '[Weekly] '}{p.title || p.reason} — Remaining: {rem} ETB
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      {/* Weekly Obligation Target Selector */}
                      {selectedCategory === 'WEEKLY' && data?.member?.obligations && data.member.obligations.length > 0 && (
                        <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
                          <label className="block text-xs font-semibold text-blue-200 mb-1.5">
                            {isOm ? 'Torban Kaffalamu Filadhaa' : 'Select Missed / Upcoming Week'}
                          </label>
                          <select
                            value={selectedObligationId}
                            onChange={(e) => {
                              setSelectedObligationId(e.target.value);
                              const o = data?.member?.obligations?.find((obl: any) => obl.id === e.target.value);
                              if (o) {
                                const rem = Math.max(0, Number(o.originalAmount || o.contributionAmount) - Number(o.amountPaid || 0));
                                setPaymentAmount(String(rem > 0 ? rem : 50));
                              }
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/20 text-white text-xs font-medium focus:outline-none focus:border-emerald-400"
                          >
                            <option value="">{isOm ? '-- Torban Filadhaa (ykn duraa) --' : '-- Choose Week (or Oldest Unpaid) --'}</option>
                            {data.member.obligations.filter((o: any) => o.status !== 'PAID').map((o: any) => {
                              const rem = Math.max(0, Number(o.originalAmount || o.contributionAmount) - Number(o.amountPaid || 0));
                              return (
                                <option key={o.id} value={o.id}>
                                  Week {o.weekNumber}, {o.year} — Remaining: {rem} ETB ({o.status})
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Provider Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-blue-200 mb-1.5">
                        {isOm ? 'Mala Kaffaltii (Payment Method)' : 'Payment Method'}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'CBE', name: 'CBE Birr', icon: '🏦' },
                          { id: 'TELEBIRR', name: 'Telebirr', icon: '📲' },
                          { id: 'EBIRR', name: 'eBirr', icon: '💳' },
                          { id: 'BANK_TRANSFER', name: 'Bank Transfer', icon: '🏛️' },
                        ].map((prov) => (
                          <button
                            key={prov.id}
                            type="button"
                            onClick={() => setSelectedProvider(prov.id as any)}
                            className={`p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                              selectedProvider === prov.id
                                ? 'bg-blue-600 text-white border-blue-400 shadow'
                                : 'bg-white/5 text-blue-200 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <span>{prov.icon}</span>
                            <span>{prov.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Amount & Transaction Reference Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-blue-200 mb-1">
                          {isOm ? 'Hanga Maallaqaa (Amount in ETB)' : 'Payment Amount (ETB)'}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-bold placeholder-white/40 focus:outline-none focus:border-emerald-400"
                            placeholder="50"
                            required
                          />
                          <span className="absolute right-3 top-2.5 text-xs font-bold text-emerald-400">ETB</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-blue-200 mb-1">
                          {isOm ? 'Lakk. Ragaa Kaffaltii (Transaction Reference)' : 'Transaction Reference / SMS Code'}
                        </label>
                        <input
                          type="text"
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-sm placeholder-white/40 focus:outline-none focus:border-emerald-400"
                          placeholder="e.g. CBE12345678 / TEL98765432"
                          required
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/40 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {submitting ? <LoadingSpinner /> : <CheckCircle2 size={16} />}
                        <span>{isOm ? 'Mirkaneessi fi Galchi' : 'Confirm & Submit Payment Request'}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Member Recent Verified Receipts Table */}
                {data.member.recentPayments && data.member.recentPayments.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                      <Receipt size={16} className="text-amber-400" />
                      <span>{isOm ? 'Nagaheewwan Kaffaltii Dhiheenyaa' : 'Recent Payment Receipts'}</span>
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="w-full text-left text-xs text-blue-100">
                        <thead className="bg-white/10 text-white font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-4 py-3">Receipt #</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Method</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {data.member.recentPayments.map((p) => (
                            <tr key={p.id} className="hover:bg-white/5 transition-all">
                              <td className="px-4 py-3 font-mono font-bold text-emerald-300">
                                {p.receiptNumber || p.paymentId}
                              </td>
                              <td className="px-4 py-3 text-blue-200">{p.date}</td>
                              <td className="px-4 py-3">{p.method}</td>
                              <td className="px-4 py-3 font-bold text-white">{p.amount} ETB</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  p.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => setSelectedReceipt(p)}
                                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-all inline-flex items-center gap-1"
                                >
                                  <Printer size={12} />
                                  <span>{isOm ? 'Nagahee' : 'Receipt'}</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* If unauthenticated: Big Call-to-Action to Login and view personal balance */
              <div
                className="p-8 rounded-3xl border text-center shadow-xl relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(22, 101, 52, 0.25) 0%, rgba(9, 21, 64, 0.95) 100%)',
                  borderColor: 'rgba(34, 197, 94, 0.3)',
                }}
              >
                <div className="max-w-2xl mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center font-bold mb-4 shadow">
                    <CreditCard size={28} />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {isOm ? 'Miseensa Taatanii Kaffaltii Raawwachuu Barbaadduu?' : 'Are You a Member Making a Payment?'}
                  </h2>
                  <p className="text-sm text-blue-200 mb-6 leading-relaxed">
                    {isOm
                      ? 'Herrega keessan keessa seenuun haftee kaffaltii, adabbii, fi nagahee kaffaltii keessanii kallattiin hordofaa. Kaffaltii raawwattaniis ragaa nagahee dijitaalaa argadhaa.'
                      : 'Log in to your member account to view your live outstanding balance, check pending weekly obligations, submit payments with receipt confirmation, and track audit approvals.'}
                  </p>
                  <Link
                    to="/login?redirect=/payment"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-black text-white bg-[#159957] hover:bg-emerald-600 shadow-xl shadow-emerald-900/50 transition-all text-base"
                  >
                    <span>{isOm ? 'Gara Portaalichaatti Seeni' : 'Login to Member Account'}</span>
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            )}

            {/* ── 3. Supported Payment Methods (CBE, E-Birr, Telebirr, Bank Transfer) ── */}
            <div id="payment-methods" className="space-y-6">
              <div className="text-center max-w-2xl mx-auto">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  {isOm ? 'Mala Kaffaltii Dhaabbataa' : 'Official Payment Channels'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-3 mb-2">
                  {isOm ? 'Malawwan Kaffaltii Eeyyamaman' : 'Supported Payment Methods'}
                </h2>
                <p className="text-sm text-blue-200">
                  {isOm
                    ? 'Kaffaltii keessan gama herrega baankii fi maallaqa moobaayilaa gamtichaa armaan gadiitiin kaffaluu dandeessu.'
                    : 'Contributions must be paid into the official Gamtaa accounts below. Always include your Member ID.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data?.paymentMethods.map((method) => {
                  const copyKey = `method_${method.id}`;
                  const isCopied = copiedKey === copyKey;

                  return (
                    <div
                      key={method.id}
                      className="p-6 rounded-2xl border transition-all hover:border-emerald-500/50 flex flex-col justify-between"
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div>
                        {/* Provider Header */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-bold text-xl text-white shadow">
                              {method.id === 'CBE' && '🏦'}
                              {method.id === 'TELEBIRR' && '📲'}
                              {method.id === 'EBIRR' && '💳'}
                              {method.id === 'BANK_TRANSFER' && '🏛️'}
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-white">
                                {isOm && method.nameOm ? method.nameOm : method.name}
                              </h3>
                              <p className="text-xs text-emerald-400 font-semibold">{method.id}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300">
                            {isOm ? 'Mirkanaa\'aa' : 'Official'}
                          </span>
                        </div>

                        {/* Account Box */}
                        <div className="p-4 rounded-xl bg-black/40 border border-white/10 mb-4 space-y-2">
                          <div>
                            <p className="text-[10px] uppercase font-semibold text-blue-300">
                              {isOm ? 'Maqaa Herregaa' : 'Account Name'}
                            </p>
                            <p className="text-xs font-bold text-white mt-0.5">{method.accountName}</p>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-white/5">
                            <div>
                              <p className="text-[10px] uppercase font-semibold text-blue-300">
                                {method.merchantCode
                                  ? (isOm ? 'Koodii Daldalaa / Lakk.' : 'Merchant / Account #')
                                  : (isOm ? 'Lakkoofsa Herregaa' : 'Account Number')}
                              </p>
                              <p className="text-sm font-mono font-black text-amber-300 tracking-wider">
                                {method.merchantCode ? `${method.merchantCode} (${method.accountNumber})` : method.accountNumber}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(method.merchantCode || method.accountNumber, copyKey)}
                              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-all"
                            >
                              {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                              <span>{isCopied ? (isOm ? 'Koppii!' : 'Copied!') : (isOm ? 'Koppii' : 'Copy')}</span>
                            </button>
                          </div>

                          {method.branch && (
                            <div className="pt-1 text-[11px] text-blue-300">
                              <span className="text-blue-400 font-medium">{isOm ? 'Damma: ' : 'Branch: '}</span>
                              {method.branch}
                            </div>
                          )}
                        </div>

                        {/* Step-by-step instructions */}
                        <p className="text-xs text-blue-200 leading-relaxed">
                          {isOm && method.instructionsOm ? method.instructionsOm : method.instructionsEn}
                        </p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-300/80">
                        <span>{isOm ? 'Qorannoo: Ragaa nagahee' : 'Verification: Receipt upload'}</span>
                        <span className="text-emerald-400 font-semibold">{isOm ? 'Yeroo: Battalumatti' : 'Fast processing'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── 4. Detailed Organization Contribution & Penalty Rules ── */}
            <div className="space-y-6 pt-6">
              <div className="text-center max-w-2xl mx-auto">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  {isOm ? 'Dambii fi Qajeelfama' : 'Organizational Policy'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-3 mb-2">
                  {isOm ? 'Dambii Kaffaltii fi Adabbii Gamtaa' : 'Contribution & Penalty Bylaws'}
                </h2>
                <p className="text-sm text-blue-200">
                  {isOm
                    ? 'Iftoomina maallaqaa fi cimina tokkummaa gamtaatiif qajeelfamoota hordofamuu qaban.'
                    : 'Clear guidelines governing weekly contributions, late fines, joining obligations, and mutual aid funds.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Rule 1: Weekly */}
                <div
                  className="p-6 rounded-2xl border"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <h3 className="text-base font-bold text-white">
                      {isOm ? data?.rules.weeklyContribution.titleOm : data?.rules.weeklyContribution.titleEn}
                    </h3>
                  </div>
                  <p className="text-xs text-blue-200 leading-relaxed">
                    {isOm ? data?.rules.weeklyContribution.descriptionOm : data?.rules.weeklyContribution.descriptionEn}
                  </p>
                </div>

                {/* Rule 2: Penalties */}
                <div
                  className="p-6 rounded-2xl border"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <h3 className="text-base font-bold text-white">
                      {isOm ? data?.rules.penalties.titleOm : data?.rules.penalties.titleEn}
                    </h3>
                  </div>
                  <p className="text-xs text-blue-200 leading-relaxed">
                    {isOm ? data?.rules.penalties.descriptionOm : data?.rules.penalties.descriptionEn}
                  </p>
                </div>

                {/* Rule 3: Historical Joining */}
                <div
                  className="p-6 rounded-2xl border"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <h3 className="text-base font-bold text-white">
                      {isOm ? data?.rules.historicalJoining.titleOm : data?.rules.historicalJoining.titleEn}
                    </h3>
                  </div>
                  <p className="text-xs text-blue-200 leading-relaxed">
                    {isOm ? data?.rules.historicalJoining.descriptionOm : data?.rules.historicalJoining.descriptionEn}
                  </p>
                </div>

                {/* Rule 4: Special and Emergency */}
                <div
                  className="p-6 rounded-2xl border"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.08)' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                      4
                    </div>
                    <h3 className="text-base font-bold text-white">
                      {isOm ? data?.rules.specialAndEmergency.titleOm : data?.rules.specialAndEmergency.titleEn}
                    </h3>
                  </div>
                  <p className="text-xs text-blue-200 leading-relaxed">
                    {isOm ? data?.rules.specialAndEmergency.descriptionOm : data?.rules.specialAndEmergency.descriptionEn}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Printable Digital Receipt Modal ── */}
      {selectedReceipt && (
        <Modal
          open={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          title={isOm ? 'Nagahee Kaffaltii Dijitaalaa' : 'Official Digital Payment Receipt'}
        >
          <div className="p-4 space-y-4 bg-white text-gray-900 rounded-xl printable-receipt">
            <div className="text-center pb-4 border-b border-gray-200">
              <p className="font-black text-lg text-emerald-800">AFOSHA MANAGEMENT SYSTEM</p>
              <p className="text-xs font-semibold text-gray-600">Gamtaan dargaggoota Melka Jabdu Qaxaa Araati</p>
              <p className="text-[11px] italic text-amber-600">"Tokkummaan Ciminaa fi Milkaayina"</p>
              <div className="mt-2 inline-block px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
                {selectedReceipt.receiptNumber || selectedReceipt.paymentId}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">{isOm ? 'Maqaa Miseensaa:' : 'Member Name:'}</span>
                <span className="font-bold">{data?.member?.fullName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">{isOm ? 'Eenyummeessaa:' : 'Member ID:'}</span>
                <span className="font-bold font-mono">{data?.member?.memberId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">{isOm ? 'Guyyaa Kaffaltii:' : 'Payment Date:'}</span>
                <span className="font-medium">{selectedReceipt.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">{isOm ? 'Mala Kaffaltii:' : 'Payment Method:'}</span>
                <span className="font-bold">{selectedReceipt.method}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">{isOm ? 'Haala:' : 'Status:'}</span>
                <span className="font-bold text-emerald-700">{selectedReceipt.status}</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-gray-300 text-base">
                <span className="font-bold">{isOm ? 'Hanga Kaffalame:' : 'Amount Paid:'}</span>
                <span className="font-black text-emerald-700">{selectedReceipt.amount} ETB</span>
              </div>
            </div>

            <div className="pt-4 text-center border-t border-gray-200">
              <p className="text-[10px] text-gray-500">
                {isOm
                  ? 'Nagaheen kun sirna kompiitaraatiin qophaa\'e, mallattoo hin barbaadu.'
                  : 'This official receipt was digitally verified by the Afosha Auditing System.'}
              </p>
              <div className="mt-4 flex gap-2 justify-center">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer size={14} />
                  <span>{isOm ? 'Maxxansi (Print)' : 'Print Receipt'}</span>
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs"
                >
                  {isOm ? 'Cufi' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </PublicLayout>
  );
}
