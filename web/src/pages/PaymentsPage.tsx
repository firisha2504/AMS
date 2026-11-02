import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Receipt, Users, CheckCircle2, AlertCircle, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, Badge, LoadingSpinner, Modal, inputClass, btnPrimary, btnSecondary, Select, DateInput } from '../components/ui';
import { formatMeetingLabel, formatMeetingShort } from '../lib/meetingUtils';

interface Payment {
  id: string; paymentId: string; amount: number; paymentDate: string;
  paymentMethod: string; status: string; receiptNumber?: string;
  notes?: string; transactionReference?: string;
  obligationId?: string;
  specialContributionObligationId?: string;
  obligation?: { weekNumber: number; year: number; dueDate: string };
  specialContributionObligation?: { specialContribution: { title: string; titleOm?: string; type: string } };
  member: { fullName: string; memberId: string };
}
interface Member { id: string; fullName: string; memberId: string; }
interface ReceiptData {
  receiptNumber?: string; memberName: string; memberId: string;
  amount: number; paymentMethod: string; paymentDate: string;
  auditorName?: string; status: string;
}
interface Obligation {
  id: string; type: 'WEEKLY' | 'SPECIAL'; amount: number; amountPaid: number;
  status: string; dueDate?: string; title?: string; campaignId?: string;
}

const METHODS = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY'];

export default function PaymentsPage() {
  const { t } = useTranslation();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentTypeTab, setPaymentTypeTab] = useState<'ALL' | 'WEEKLY' | 'SPECIAL'>('ALL');
  const [paidUnpaidFilter, setPaidUnpaidFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [weekFilter, setWeekFilter] = useState<string>('ALL');
  
  // For unpaid obligations view
  const [weeklyObligations, setWeeklyObligations] = useState<any[]>([]);
  const [specialObligations, setSpecialObligations] = useState<any[]>([]);
  const [loadingObligationsView, setLoadingObligationsView] = useState(false);

  // Record single
  const [showRecord, setShowRecord] = useState(false);
  const [form, setForm] = useState({ memberId: '', amount: '', paymentMethod: 'CASH', transactionReference: '', notes: '', obligationId: '' });
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loadingObligations, setLoadingObligations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Verify confirm
  const [verifyTarget, setVerifyTarget] = useState<Payment | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState<Payment | null>(null);

  // Edit (works for both PENDING and VERIFIED)
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', paymentMethod: 'CASH', transactionReference: '', notes: '', paymentDate: '', reason: '' });
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Rollback
  const [rollbackTarget, setRollbackTarget] = useState<Payment | null>(null);
  const [rollbackReason, setRollbackReason] = useState('');
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rollbackError, setRollbackError] = useState('');
  const [rollbackSuccess, setRollbackSuccess] = useState('');

  // Bulk
  const [showBulk, setShowBulk] = useState(false);
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkMethod, setBulkMethod] = useState('CASH');
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().slice(0, 10));
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkObligationId, setBulkObligationId] = useState('');
  const [bulkObligations, setBulkObligations] = useState<Obligation[]>([]);
  const [bulkLoadingObligations, setBulkLoadingObligations] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Record<string, boolean>>({});
  const [bulkIndividual, setBulkIndividual] = useState<Record<string, string>>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');

  // Receipt + delete
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Collapsible weeks
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<string, boolean>>({});

  const toggleWeek = (weekKey: string) => {
    setCollapsedWeeks(prev => ({ ...prev, [weekKey]: !prev[weekKey] }));
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/payments'),
      api.get('/members', { params: { limit: 200, status: 'APPROVED' } }),
    ]).then(([p, m]) => {
      setPayments(p.data.data || []);
      setMembers(m.data.data || []);
    }).finally(() => setLoading(false));
  };

  // Load all obligations (paid and unpaid) for complete member lists
  const loadAllObligations = async () => {
    setLoadingObligationsView(true);
    try {
      // For weekly: get the most recent week with data
      const weeklyResponse = await api.get('/finance/contributions/weekly');
      const weeklyData = weeklyResponse.data.data || {};
      
      // Get current week's members with their obligations
      
      // Get all special contributions with their member obligations
      const specialResponse = await api.get('/finance/obligations');
      const specialObligs = specialResponse.data.data || [];
      
      // Transform weekly response to match our state structure
      if (weeklyData.members && Array.isArray(weeklyData.members)) {
        const weeklyMembers = weeklyData.members.map((m: any) => ({
          id: m.memberId,
          type: 'WEEKLY',
          memberId: m.memberId,
          memberName: m.fullName,
          memberMemberId: m.memberNumber,
          amount: m.totalDue || 0,
          amountPaid: m.amountPaid || 0,
          status: m.status || 'PENDING',
          dueDate: m.dueDate,
          weekNumber: weeklyData.week,
          year: weeklyData.year,
          campaignType: 'WEEKLY'
        }));
        setWeeklyObligations(weeklyMembers);
      }
      
      // Filter special obligations
      const special = specialObligs.filter((o: any) => o.type === 'SPECIAL');
      setSpecialObligations(special);
    } catch (err) {
      console.error('Error loading obligations:', err);
      setWeeklyObligations([]);
      setSpecialObligations([]);
    } finally {
      setLoadingObligationsView(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Load all obligations when component mounts or when switching tabs
  useEffect(() => {
    loadAllObligations();
  }, []);

  // Fetch member obligations when member is selected
  const fetchMemberObligations = async (memberId: string) => {
    if (!memberId) {
      setObligations([]);
      return;
    }
    setLoadingObligations(true);
    try {
      const { data } = await api.get(`/finance/obligations/member/${memberId}`);
      const obligations = (data.data || []).map((o: any) => ({
        ...o,
        title: o.type === 'WEEKLY'
          ? formatMeetingLabel(o.weekNumber, o.year, o.dueDate)
          : o.title || 'Special Contribution',
      }));
      setObligations(obligations);
    } catch {
      setObligations([]);
    } finally {
      setLoadingObligations(false);
    }
  };

  // Fetch all obligations for bulk recording
  const fetchBulkObligations = async () => {
    setBulkLoadingObligations(true);
    try {
      const { data } = await api.get('/finance/obligations');
      const obligations = (data.data || []).map((o: any) => ({
        ...o,
        title: o.type === 'WEEKLY'
          ? formatMeetingLabel(o.weekNumber, o.year, o.dueDate)
          : o.title || 'Special Contribution',
      }));
      setBulkObligations(obligations);
    } catch {
      setBulkObligations([]);
    } finally {
      setBulkLoadingObligations(false);
    }
  };

  // ── Verify ──
  const doVerify = async () => {
    if (!verifyTarget) return;
    setVerifyLoading(true);
    try {
      const { data } = await api.patch(`/payments/${verifyTarget.id}/verify`);
      setVerifyTarget(null);
      setVerifySuccess(data.data);
      load();
    } finally { setVerifyLoading(false); }
  };

  // ── Single Record ──
  const recordPayment = async () => {
    setFormError(''); setFormSuccess('');
    if (!form.memberId) { setFormError('Please select a member.'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setFormError('Enter a valid amount greater than 0.'); return; }
    setSaving(true);
    try {
      const selectedObligation = obligations.find(o => o.id === form.obligationId);
      const payload: any = {
        memberId: form.memberId,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        transactionReference: form.transactionReference || undefined,
        notes: form.notes || undefined,
      };
      if (selectedObligation?.type === 'WEEKLY') {
        payload.obligationId = form.obligationId;
      } else if (selectedObligation?.type === 'SPECIAL') {
        payload.specialContributionObligationId = form.obligationId;
      }
      await api.post('/payments', payload);
      setFormSuccess(`Payment of ${Number(form.amount).toLocaleString()} ETB recorded successfully.`);
      setForm({ memberId: '', amount: '', paymentMethod: 'CASH', transactionReference: '', notes: '', obligationId: '' });
      setObligations([]);
      load();
    } catch { setFormError('Failed to record payment. Please try again.'); }
    finally { setSaving(false); }
  };

  // ── Edit (pending or verified) ──
  // const openEdit = (p: Payment) => {
  //   setEditPayment(p);
  //   setEditForm({ amount: String(Number(p.amount)), paymentMethod: p.paymentMethod, transactionReference: p.transactionReference || '', notes: p.notes || '', paymentDate: p.paymentDate.slice(0, 10), reason: '' });
  //   setEditError('');
  // };

  const saveEdit = async () => {
    if (!editPayment) return;
    if (!editForm.amount || Number(editForm.amount) <= 0) { setEditError('Enter a valid amount.'); return; }
    if (editPayment.status === 'VERIFIED' && !editForm.reason.trim()) {
      setEditError('A reason is required when editing a verified payment.'); return;
    }
    setEditSaving(true); setEditError('');
    try {
      await api.patch(`/payments/${editPayment.id}`, {
        amount: Number(editForm.amount), paymentMethod: editForm.paymentMethod,
        transactionReference: editForm.transactionReference || undefined,
        notes: editForm.notes || undefined, paymentDate: editForm.paymentDate,
        reason: editForm.reason || undefined,
      });
      setEditPayment(null);
      load();
    } catch { setEditError('Update failed. Please try again.'); }
    finally { setEditSaving(false); }
  };

  // ── Rollback ──
  const doRollback = async () => {
    if (!rollbackTarget) return;
    if (!rollbackReason.trim()) { setRollbackError('Please enter a reason for rollback.'); return; }
    setRollbackLoading(true); setRollbackError('');
    try {
      await api.patch(`/payments/${rollbackTarget.id}/rollback`, { reason: rollbackReason });
      setRollbackSuccess(`Payment of ${Number(rollbackTarget.amount).toLocaleString()} ETB has been rolled back to PENDING. Obligation and balance have been reversed.`);
      setRollbackTarget(null);
      setRollbackReason('');
      load();
    } catch { setRollbackError('Rollback failed. Please try again.'); }
    finally { setRollbackLoading(false); }
  };

  // ── Delete ──
  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteError('');
    try {
      await api.delete(`/payments/${deleteId}`);
      setDeleteId(null);
      load();
    } catch { setDeleteError('Cannot delete a verified payment.'); }
  };

  // ── Bulk ──
  const toggleBulkMember = (id: string) => setBulkSelected(prev => ({ ...prev, [id]: !prev[id] }));
  const selectAllBulk = (val: boolean) => {
    const next: Record<string, boolean> = {};
    members.forEach(m => { next[m.id] = val; });
    setBulkSelected(next);
  };
  const selectedCount = Object.values(bulkSelected).filter(Boolean).length;

  const saveBulk = async () => {
    setBulkError(''); setBulkSuccess('');
    if (selectedCount === 0) { setBulkError('Select at least one member.'); return; }
    if (!bulkAmount && members.filter(m => bulkSelected[m.id]).some(m => !bulkIndividual[m.id])) {
      setBulkError('Enter a default amount.'); return;
    }
    setBulkSaving(true);
    try {
      const selectedObligation = bulkObligations.find(o => o.id === bulkObligationId);
      const bulkPayments = members
        .filter(m => bulkSelected[m.id])
        .map(m => {
          const payload: any = {
            memberId: m.id,
            amount: Number(bulkIndividual[m.id] || bulkAmount),
            paymentMethod: bulkMethod,
            notes: bulkNotes || undefined,
          };
          if (selectedObligation?.type === 'WEEKLY') {
            payload.obligationId = bulkObligationId;
          } else if (selectedObligation?.type === 'SPECIAL') {
            payload.specialContributionObligationId = bulkObligationId;
          }
          return payload;
        })
        .filter(p => p.amount > 0);
      if (bulkPayments.length === 0) { setBulkError('All amounts are 0.'); setBulkSaving(false); return; }
      await api.post('/payments/bulk', { payments: bulkPayments });
      setBulkSuccess(`${bulkPayments.length} payment(s) recorded.`);
      setBulkSelected({}); setBulkIndividual({}); setBulkAmount(''); setBulkNotes(''); setBulkObligationId('');
      load();
    } catch { setBulkError('Bulk payment failed.'); }
    finally { setBulkSaving(false); }
  };

  const viewReceipt = async (id: string) => {
    const { data } = await api.get(`/payments/${id}/receipt`);
    setReceipt(data.data);
  };

  const filtered = payments.filter(p => {
    const statusMatch = !statusFilter || p.status === statusFilter;
    const typeMatch = paymentTypeTab === 'ALL' ||
      (paymentTypeTab === 'WEEKLY' && p.obligation) ||
      (paymentTypeTab === 'SPECIAL' && p.specialContributionObligation);
    
    // Paid/Unpaid filter based on payment status
    const paidUnpaidMatch = paidUnpaidFilter === 'ALL' ||
      (paidUnpaidFilter === 'PAID' && p.status === 'VERIFIED') ||
      (paidUnpaidFilter === 'UNPAID' && p.status === 'PENDING');
    
    // Week filter for weekly payments
    const weekMatch = weekFilter === 'ALL' || 
      (p.obligation && `${p.obligation.weekNumber}-${p.obligation.year}` === weekFilter);
    
    return statusMatch && typeMatch && paidUnpaidMatch && weekMatch;
  });

  // Group payments by week for collapsible sections (only non-weekly payments)
  const groupedPayments = useMemo(() => {
    const groups: Record<string, Payment[]> = {};
    
    filtered.forEach(payment => {
      if (!payment.obligation && !payment.specialContributionObligation) {
        // Non-weekly, non-special contribution payments (penalty, general)
        if (payment.notes?.toLowerCase().includes('penalty')) {
          // Penalty payment
          const key = 'penalty';
          if (!groups[key]) groups[key] = [];
          groups[key].push(payment);
        } else {
          // Other payments
          const key = 'other';
          if (!groups[key]) groups[key] = [];
          groups[key].push(payment);
        }
      }
      // Weekly and special contribution payments are handled separately below
    });
    
    return groups;
  }, [filtered]);

  // Group weekly obligations by week (show ALL members, paid or not)
  const groupedWeeklyObligations = useMemo(() => {
    const groups: Record<string, { weekNumber: number; year: number; dueDate: string; obligations: any[] }> = {};
    
    weeklyObligations.forEach(obligation => {
      const key = `${obligation.weekNumber}-${obligation.year}`;
      if (!groups[key]) {
        groups[key] = {
          weekNumber: obligation.weekNumber,
          year: obligation.year,
          dueDate: obligation.dueDate,
          obligations: []
        };
      }
      groups[key].obligations.push(obligation);
    });
    
    return groups;
  }, [weeklyObligations]);

  // Group special contribution obligations by campaign (show ALL members, paid or not)
  const groupedSpecialContributions = useMemo(() => {
    const groups: Record<string, { title: string; type: string; obligations: any[] }> = {};
    
    specialObligations.forEach(obligation => {
      const key = obligation.specialContributionId;
      if (!groups[key]) {
        groups[key] = {
          title: obligation.title,
          type: obligation.campaignType,
          obligations: []
        };
      }
      groups[key].obligations.push(obligation);
    });
    
    return groups;
  }, [specialObligations]);


  // Unpaid obligations not already represented by a payment record
  const paymentObligationIds = new Set(payments.map(p => p.obligationId).filter(Boolean));
  const paymentSpecialObligationIds = new Set(payments.map(p => p.specialContributionObligationId).filter(Boolean));
  const allUnpaidObligations = [...weeklyObligations, ...specialObligations].filter(o => {
    if (o.type === 'WEEKLY') return !paymentObligationIds.has(o.id);
    return !paymentSpecialObligationIds.has(o.id);
  });
  const filteredUnpaidObligations = allUnpaidObligations.filter(o => {
    const typeMatch = paymentTypeTab === 'ALL' ||
      (paymentTypeTab === 'WEEKLY' && o.type === 'WEEKLY') ||
      (paymentTypeTab === 'SPECIAL' && o.type === 'SPECIAL');
    const weekMatch = weekFilter === 'ALL' ||
      (o.type === 'WEEKLY' && `${o.weekNumber}-${o.year}` === weekFilter);
    return typeMatch && weekMatch;
  });
  
  const totalVerified = payments.filter(p => p.status === 'VERIFIED').reduce((s, p) => s + Number(p.amount), 0);
  const totalPending  = payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + Number(p.amount), 0);
  
  // Calculate totals including obligations
  const allPaidObligations = [...weeklyObligations, ...specialObligations].filter(o => o.status === 'PAID').reduce((s: number, o: any) => s + Number(o.amountPaid), 0);
  const allPendingObligations = [...weeklyObligations, ...specialObligations].filter(o => o.status === 'PENDING' || o.status === 'OVERDUE').reduce((s: number, o: any) => s + (Number(o.amount) - Number(o.amountPaid)), 0);

  return (
    <div>
      <PageHeader
        title={t('nav.payments')}
        action={
          <div className="flex gap-2">
            <button 
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors" 
              onClick={() => { setShowBulk(true); setBulkError(''); setBulkSuccess(''); fetchBulkObligations(); }}
            >
              <Users size={16} />
              Bulk Record
            </button>
            <button className={btnPrimary} onClick={() => { setShowRecord(true); setFormError(''); setFormSuccess(''); }}>
              <Plus size={16} className="inline mr-1" />Record Payment (Special/Late)
            </button>
          </div>
        }
      />

      {loading ? <LoadingSpinner /> : (
        <>
          {/* Info banner */}
          <div className="mb-5 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <Users size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm text-blue-800">
              <p className="font-semibold">How to Record Payments:</p>
              <ul className="text-xs mt-1 space-y-0.5 ml-4 list-disc text-blue-700">
                <li><strong>Weekly contributions</strong>: Go to <strong>Attendance</strong> page → Record Attendance & Collect Contributions (fixed amount: {(() => {
                  // Try to get weekly amount from any payment, or default
                  const weeklyPayment = payments.find(p => p.obligation);
                  return weeklyPayment ? `${Number(weeklyPayment.obligation?.weekNumber).toLocaleString()} ETB` : '100 ETB';
                })()})</li>
                <li><strong>Special contributions or late payments</strong>: Use "Record Payment" button above</li>
              </ul>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="bg-white rounded-xl border p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{payments.length + weeklyObligations.length + specialObligations.length}</p>
              <p className="text-xs text-slate-500 mt-1">Total Payments</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{payments.filter(p => p.status === 'VERIFIED').length + [...weeklyObligations, ...specialObligations].filter(o => o.status === 'PAID').length}</p>
              <p className="text-xs text-slate-500 mt-1">Verified</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{payments.filter(p => p.status === 'PENDING').length + [...weeklyObligations, ...specialObligations].filter(o => o.status === 'PENDING' || o.status === 'OVERDUE').length}</p>
              <p className="text-xs text-slate-500 mt-1">Pending</p>
            </div>
            <div className="bg-white rounded-xl border p-4 text-center">
              <p className="text-base font-bold text-emerald-600">{(totalVerified + allPaidObligations).toLocaleString()} ETB</p>
              <p className="text-xs text-slate-400">Verified</p>
              <p className="text-base font-bold text-amber-500 mt-0.5">{(totalPending + allPendingObligations).toLocaleString()} ETB</p>
              <p className="text-xs text-slate-400">Pending</p>
            </div>
          </div>

          {/* Payment type tabs */}
          <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
            {[
              { value: 'ALL' as const, label: `All (${payments.length + allUnpaidObligations.length})` },
              { value: 'WEEKLY' as const, label: `Weekly (${payments.filter(p => p.obligation).length + weeklyObligations.length})` },
              { value: 'SPECIAL' as const, label: `Special (${payments.filter(p => p.specialContributionObligation).length + specialObligations.length})` },
            ].map(f => (
              <button key={f.value} onClick={() => { setPaymentTypeTab(f.value); setPaidUnpaidFilter('ALL'); setWeekFilter('ALL'); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${paymentTypeTab === f.value ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Paid/Unpaid sub-tabs */}
          <div className="flex gap-1 mb-4 bg-blue-50 p-1 rounded-xl w-fit">
            {[
              { 
                value: 'ALL' as const, 
                label: 'All', 
                count: paymentTypeTab === 'ALL'
                  ? payments.length + allUnpaidObligations.length
                  : payments.filter(p => 
                      paymentTypeTab === 'WEEKLY' ? p.obligation : p.specialContributionObligation
                    ).length + (paymentTypeTab === 'WEEKLY' ? weeklyObligations.length : specialObligations.length)
              },
              { 
                value: 'PAID' as const, 
                label: 'Paid', 
                count: payments.filter(p => {
                  const typeOk = paymentTypeTab === 'ALL' ||
                    (paymentTypeTab === 'WEEKLY' ? p.obligation : p.specialContributionObligation);
                  return typeOk && p.status === 'VERIFIED';
                }).length 
              },
              { 
                value: 'UNPAID' as const, 
                label: 'Unpaid', 
                count: paymentTypeTab === 'ALL'
                  ? allUnpaidObligations.length
                  : paymentTypeTab === 'WEEKLY' 
                    ? weeklyObligations.length 
                    : specialObligations.length
              },
            ].map(f => (
              <button key={f.value} onClick={() => setPaidUnpaidFilter(f.value)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${paidUnpaidFilter === f.value ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                {f.label} ({f.count})
              </button>
            ))}
          </div>



          {/* Status filter tabs */}
          <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
            {[
              { value: '', label: `All Status` },
              { value: 'PENDING', label: `Pending (${(() => {
                // For Weekly tab with week filter: count obligations for that week
                if (paymentTypeTab === 'WEEKLY' && weekFilter !== 'ALL') {
                  return weeklyObligations.filter((o: any) => `${o.weekNumber}-${o.year}` === weekFilter).length;
                }
                // For All tab: count pending payments + unpaid obligations without payment records
                if (paymentTypeTab === 'ALL') {
                  return filtered.filter(p => p.status === 'PENDING').length + filteredUnpaidObligations.length;
                }
                // Otherwise: count PENDING payment records
                return filtered.filter(p => p.status === 'PENDING').length;
              })()})` },
              { value: 'VERIFIED', label: `Verified (${filtered.filter(p => p.status === 'VERIFIED').length})` },
            ].map(f => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === f.value ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {/* Show unpaid obligations table when UNPAID filter is selected OR when week filter + PENDING status is active */}
            {(paidUnpaidFilter === 'UNPAID' || (paymentTypeTab === 'WEEKLY' && weekFilter !== 'ALL' && statusFilter === 'PENDING')) && (paymentTypeTab === 'WEEKLY' || paymentTypeTab === 'SPECIAL' || paymentTypeTab === 'ALL') ? (
              loadingObligationsView ? (
                <div className="px-5 py-10 text-center"><LoadingSpinner /></div>
              ) : (
                <div className="table-responsive">
                  <table>
                    <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Member</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                        {paymentTypeTab === 'WEEKLY' ? 'Week/Year' : paymentTypeTab === 'SPECIAL' ? 'Campaign' : 'Type'}
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Due Date</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Amount Due</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Amount Paid</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Remaining</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(() => {
                      const obligations = paymentTypeTab === 'WEEKLY'
                        ? weeklyObligations
                        : paymentTypeTab === 'SPECIAL'
                          ? specialObligations
                          : filteredUnpaidObligations;
                      
                      // Filter by week if Weekly tab
                      const filteredObligations = paymentTypeTab === 'WEEKLY' && weekFilter !== 'ALL'
                        ? obligations.filter((o: any) => `${o.weekNumber}-${o.year}` === weekFilter)
                        : obligations;
                      
                      if (filteredObligations.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                              No unpaid {paymentTypeTab === 'ALL' ? '' : paymentTypeTab.toLowerCase() + ' '}obligations found{weekFilter !== 'ALL' ? ' for this week' : ''}. All members are up to date! 🎉
                            </td>
                          </tr>
                        );
                      }
                      
                      return filteredObligations.map((obligation: any) => {
                        const remaining = Number(obligation.amount) - Number(obligation.amountPaid);
                        return (
                          <tr key={obligation.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3">
                              <p className="text-sm font-medium text-slate-800">{obligation.memberName}</p>
                              <p className="text-xs text-slate-400">#{obligation.memberMemberId}</p>
                            </td>
                            <td className="px-5 py-3">
                              {obligation.type === 'WEEKLY' || paymentTypeTab === 'WEEKLY' ? (
                                <span className="text-sm text-slate-600">{formatMeetingLabel(obligation.weekNumber, obligation.year, obligation.dueDate)}</span>
                              ) : (
                                <div>
                                  <p className="text-sm font-medium text-slate-800">{obligation.title}</p>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 mt-1">
                                    {obligation.campaignType}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3 text-sm text-slate-500">
                              {new Date(obligation.dueDate).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-3 text-right text-sm font-semibold text-slate-800">
                              {Number(obligation.amount).toLocaleString()} ETB
                            </td>
                            <td className="px-5 py-3 text-right text-sm text-green-600">
                              {Number(obligation.amountPaid).toLocaleString()} ETB
                            </td>
                            <td className="px-5 py-3 text-right text-sm font-bold text-red-600">
                              {remaining.toLocaleString()} ETB
                            </td>
                            <td className="px-5 py-3">
                              <Badge status={obligation.status} />
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              )
            ) : (
              /* Original payments table */
              <div className="table-responsive">
                <table>
                <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Payment ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Member</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Method</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(() => {
                  const hasRows = Object.keys(groupedPayments).length > 0 || Object.keys(groupedWeeklyObligations).length > 0 || Object.keys(groupedSpecialContributions).length > 0;

                  if (!hasRows) {
                    return (
                      <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400">No payments found.</td></tr>
                    );
                  }

                  return (
                    <>
                      {/* Weekly Contributions (All Members) */}
                      {Object.entries(groupedWeeklyObligations)
                        .sort(([keyA], [keyB]) => {
                          const [weekA, yearA] = keyA.split('-').map(Number);
                          const [weekB, yearB] = keyB.split('-').map(Number);
                          if (yearB !== yearA) return yearB - yearA;
                          return weekB - weekA;
                        })
                        .map(([weekKey, group]: [string, any]) => {
                          const isCollapsed = collapsedWeeks[`week-${weekKey}`];
                          const totalAmount = group.obligations.reduce((sum: number, o: any) => sum + Number(o.amount), 0);
                          const totalPaid = group.obligations.reduce((sum: number, o: any) => sum + Number(o.amountPaid), 0);
                          const weekDisplay = formatMeetingLabel(group.weekNumber, group.year, group.dueDate);
                          
                          return (
                            <React.Fragment key={`week-${weekKey}`}>
                              {/* Weekly Header (Collapsible) */}
                              <tr key={`header-week-${weekKey}`} className="bg-blue-100 hover:bg-blue-200 cursor-pointer" onClick={() => toggleWeek(`week-${weekKey}`)}>
                                <td colSpan={8} className="px-5 py-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {isCollapsed ? (
                                        <ChevronRight size={16} className="text-blue-700" />
                                      ) : (
                                        <ChevronDown size={16} className="text-blue-700" />
                                      )}
                                      <span className="font-semibold text-blue-900">{weekDisplay}</span>
                                      <span className="text-xs text-blue-700">
                                        ({group.obligations.length} member{group.obligations.length === 1 ? '' : 's'} - {totalAmount.toLocaleString()} ETB due, {totalPaid.toLocaleString()} ETB paid)
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Weekly Obligations (All Members) */}
                              {!isCollapsed && group.obligations.map((obligation: any) => {
                                const remaining = Number(obligation.amount) - Number(obligation.amountPaid);
                                const statusColor = obligation.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : obligation.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : obligation.status === 'OVERDUE' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200';
                                return (
                                  <tr key={`week-obl-${obligation.id}`} className="hover:bg-slate-50 bg-blue-50/50">
                                    <td className="px-5 py-3 text-xs font-mono text-slate-400">—</td>
                                    <td className="px-5 py-3">
                                      <p className="text-sm font-medium text-slate-800">{obligation.memberName}</p>
                                      <p className="text-xs text-slate-400">#{obligation.memberMemberId}</p>
                                    </td>
                                    <td className="px-5 py-3">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                                        Weekly
                                      </span>
                                      <p className="text-xs text-slate-400 mt-1">{formatMeetingShort(obligation.weekNumber)}</p>
                                    </td>
                                    <td className="px-5 py-3 text-right text-sm font-bold text-slate-800">
                                      {Number(obligation.amount).toLocaleString()} ETB
                                    </td>
                                    <td className="px-5 py-3 text-xs text-emerald-600">{Number(obligation.amountPaid).toLocaleString()} ETB</td>
                                    <td className="px-5 py-3 text-sm text-slate-500">{new Date(obligation.dueDate || Date.now()).toLocaleDateString()}</td>
                                    <td className="px-5 py-3">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                                        {obligation.status}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3 text-xs text-slate-400">
                                      {remaining > 0 ? `${remaining.toLocaleString()} ETB outstanding` : 'Paid'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      
                      {/* Special Contributions (All Members) */}
                      {Object.entries(groupedSpecialContributions).map(([groupKey, group]: [string, any]) => {
                        const isCollapsed = collapsedWeeks[`special-${groupKey}`];
                        const totalAmount = group.obligations.reduce((sum: number, o: any) => sum + Number(o.amount), 0);
                        const totalPaid = group.obligations.reduce((sum: number, o: any) => sum + Number(o.amountPaid), 0);
                        
                        return (
                          <React.Fragment key={`special-${groupKey}`}>
                            {/* Special Contribution Header (Collapsible) */}
                            <tr key={`header-special-${groupKey}`} className="bg-purple-100 hover:bg-purple-200 cursor-pointer" onClick={() => toggleWeek(`special-${groupKey}`)}>
                              <td colSpan={8} className="px-5 py-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {isCollapsed ? (
                                      <ChevronRight size={16} className="text-purple-700" />
                                    ) : (
                                      <ChevronDown size={16} className="text-purple-700" />
                                    )}
                                    <span className="font-semibold text-purple-900">{group.title}</span>
                                    <span className="text-xs text-purple-700">
                                      ({group.obligations.length} member{group.obligations.length === 1 ? '' : 's'} - {totalAmount.toLocaleString()} ETB due, {totalPaid.toLocaleString()} ETB paid)
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                            
                            {/* Special Contribution Obligations (All Members) */}
                            {!isCollapsed && group.obligations.map((obligation: any) => {
                              const remaining = Number(obligation.amount) - Number(obligation.amountPaid);
                              const statusColor = obligation.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : obligation.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200';
                              return (
                                <tr key={`special-obl-${obligation.id}`} className="hover:bg-slate-50 bg-purple-50/50">
                                  <td className="px-5 py-3 text-xs font-mono text-slate-400">—</td>
                                  <td className="px-5 py-3">
                                    <p className="text-sm font-medium text-slate-800">{obligation.memberName}</p>
                                    <p className="text-xs text-slate-400">#{obligation.memberMemberId}</p>
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 ring-1 ring-purple-200">
                                      Special
                                    </span>
                                    <p className="text-xs text-slate-400 mt-1">{group.title}</p>
                                  </td>
                                  <td className="px-5 py-3 text-right text-sm font-bold text-slate-800">
                                    {Number(obligation.amount).toLocaleString()} ETB
                                  </td>
                                  <td className="px-5 py-3 text-xs text-emerald-600">{Number(obligation.amountPaid).toLocaleString()} ETB</td>
                                  <td className="px-5 py-3 text-sm text-slate-500">{new Date(obligation.dueDate || Date.now()).toLocaleDateString()}</td>
                                  <td className="px-5 py-3">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                                      {obligation.status}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 text-xs text-slate-400">
                                    {remaining > 0 ? `${remaining.toLocaleString()} ETB outstanding` : 'Paid'}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </>
                  );
                })()}
              </tbody>
            </table>
            </div>
            )}
          </div>
        </>
      )}

      {/* ── VERIFY CONFIRM ── */}
      <Modal open={!!verifyTarget} onClose={() => setVerifyTarget(null)} title="Confirm Payment Verification">
        {verifyTarget && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2.5">
              {[
                { label: 'Member', value: verifyTarget.member.fullName },
                { label: 'Member ID', value: `#${verifyTarget.member.memberId}` },
                { label: 'Method', value: verifyTarget.paymentMethod.replace(/_/g, ' ') },
                { label: 'Date', value: new Date(verifyTarget.paymentDate).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm border-b border-emerald-100 pb-1.5 last:border-0 last:pb-0">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500 font-semibold">Amount</span>
                <span className="text-2xl font-bold text-emerald-700">{Number(verifyTarget.amount).toLocaleString()} ETB</span>
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              ⚠ Verifying confirms this as official and notifies the member. Use Rollback if a mistake is made.
            </p>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={doVerify} disabled={verifyLoading}>
                <CheckCircle2 size={15} />
                {verifyLoading ? 'Verifying...' : `Verify ${Number(verifyTarget.amount).toLocaleString()} ETB`}
              </button>
              <button className={btnSecondary} onClick={() => setVerifyTarget(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── VERIFY SUCCESS ── */}
      <Modal open={!!verifySuccess} onClose={() => setVerifySuccess(null)} title="Payment Verified ✅">
        {verifySuccess && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
              <p className="text-2xl font-bold text-emerald-700">{Number(verifySuccess.amount).toLocaleString()} ETB</p>
              <p className="text-sm text-slate-600 mt-1">verified for <strong>{verifySuccess.member.fullName}</strong></p>
            </div>
            <p className="text-xs text-slate-500 text-center">Member notified. Use Rollback button if a mistake was made.</p>
            <div className="flex gap-3">
              <button className={btnPrimary} onClick={() => { const id = verifySuccess.id; setVerifySuccess(null); viewReceipt(id); }}>
                <Receipt size={14} className="inline mr-1" /> View Receipt
              </button>
              <button className={btnSecondary} onClick={() => setVerifySuccess(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── ROLLBACK MODAL ── */}
      <Modal open={!!rollbackTarget} onClose={() => setRollbackTarget(null)} title="Rollback Verified Payment">
        {rollbackTarget && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Member</span>
                <span className="font-semibold">{rollbackTarget.member.fullName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Amount</span>
                <span className="text-lg font-bold text-red-600">{Number(rollbackTarget.amount).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Payment ID</span>
                <span className="font-mono text-xs text-slate-400">{rollbackTarget.paymentId}</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 space-y-1">
              <p className="font-semibold">What rollback does:</p>
              <ul className="space-y-1 ml-3">
                <li>• Sets payment back to <strong>PENDING</strong></li>
                <li>• Reverses obligation status (PAID → PENDING/PARTIAL)</li>
                <li>• Restores member's outstanding balance</li>
                <li>• Restores unpaid penalty records</li>
                <li>• Adds a correction entry to the ledger</li>
                <li>• Creates an audit log entry</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reason for Rollback *</label>
              <textarea className={inputClass} rows={3}
                placeholder="e.g. Wrong amount entered, duplicate payment, member overpaid..."
                value={rollbackReason} onChange={e => setRollbackReason(e.target.value)} />
            </div>

            {rollbackError && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs border border-red-100">
                <AlertCircle size={13} /> {rollbackError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-50"
                onClick={doRollback} disabled={rollbackLoading || !rollbackReason.trim()}>
                <RotateCcw size={14} />
                {rollbackLoading ? 'Rolling back...' : 'Confirm Rollback'}
              </button>
              <button className={btnSecondary} onClick={() => setRollbackTarget(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── ROLLBACK SUCCESS ── */}
      <Modal open={!!rollbackSuccess} onClose={() => setRollbackSuccess('')} title="Payment Rolled Back">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
            <RotateCcw size={36} className="mx-auto text-amber-500 mb-2" />
            <p className="text-sm font-semibold text-amber-700">{rollbackSuccess}</p>
          </div>
          <button className={btnPrimary} onClick={() => setRollbackSuccess('')}>OK</button>
        </div>
      </Modal>

      {/* ── EDIT PAYMENT ── */}
      <Modal open={!!editPayment} onClose={() => setEditPayment(null)} title={editPayment?.status === 'VERIFIED' ? 'Edit Verified Payment' : 'Edit Payment'}>
        {editPayment && (
          <div className="space-y-3">
            {editPayment.status === 'VERIFIED' && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <span>This is a <strong>verified</strong> payment. Changing the amount will automatically adjust the obligation and member balance. A reason is required.</span>
              </div>
            )}
            <div className="px-4 py-2.5 bg-slate-50 rounded-xl border text-sm text-slate-600">
              Member: <strong>{editPayment.member.fullName}</strong>
              &nbsp;·&nbsp;Current: <strong className="text-emerald-700">{Number(editPayment.amount).toLocaleString()} ETB</strong>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount (ETB) *</label>
              <input className={inputClass} type="number" min="1" step="0.01" value={editForm.amount}
                onChange={e => setEditForm({ ...editForm, amount: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payment Method</label>
              <Select 
                value={editForm.paymentMethod} 
                onChange={e => setEditForm({ ...editForm, paymentMethod: e })}
                options={METHODS.map(m => ({ value: m, label: m.replace(/_/g, ' ') }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payment Date</label>
              <DateInput value={editForm.paymentDate} onChange={val => setEditForm({ ...editForm, paymentDate: val })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Transaction Reference</label>
              <input className={inputClass} placeholder="Optional" value={editForm.transactionReference} onChange={e => setEditForm({ ...editForm, transactionReference: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notes</label>
              <textarea className={inputClass} rows={2} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
            {editPayment.status === 'VERIFIED' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reason for Edit *</label>
                <input className={inputClass} placeholder="e.g. Wrong amount entered, partial correction..." value={editForm.reason}
                  onChange={e => setEditForm({ ...editForm, reason: e.target.value })} />
              </div>
            )}
            {editError && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs border border-red-100">
                <AlertCircle size={13} /> {editError}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button className={editPayment.status === 'VERIFIED' ? 'px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700' : btnPrimary}
                onClick={saveEdit} disabled={editSaving}>
                {editSaving ? 'Saving...' : editPayment.status === 'VERIFIED' ? 'Save & Adjust Balance' : 'Save Changes'}
              </button>
              <button className={btnSecondary} onClick={() => setEditPayment(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── RECORD SINGLE ── */}
      <Modal open={showRecord} onClose={() => { setShowRecord(false); setFormSuccess(''); }} title="Record Payment">
        <div className="space-y-3">
          {formSuccess ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-emerald-700">{formSuccess}</p>
                <p className="text-xs text-slate-500 mt-1">Pending admin verification.</p>
              </div>
              <div className="flex gap-3">
                <button className={btnPrimary} onClick={() => setFormSuccess('')}>Record Another</button>
                <button className={btnSecondary} onClick={() => { setShowRecord(false); setFormSuccess(''); }}>Done</button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Member *</label>
                <Select 
                  value={form.memberId} 
                  onChange={e => { setForm({ ...form, memberId: e, obligationId: '' }); fetchMemberObligations(e); }}
                  options={[{ value: '', label: '-- Select member --' }, ...members.map(m => ({ value: m.id, label: `${m.fullName} (${m.memberId})` }))]}
                />
              </div>
              {form.memberId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Obligation (Optional)</label>
                  {loadingObligations ? (
                    <div className="text-xs text-slate-400">Loading obligations...</div>
                  ) : (
                    <Select 
                      value={form.obligationId} 
                      onChange={e => {
                        const selected = obligations.find(o => o.id === e);
                        setForm({ ...form, obligationId: e, amount: selected ? String(selected.amount - selected.amountPaid) : form.amount });
                      }}
                      options={[
                        { value: '', label: '-- Select obligation (optional) --' },
                        ...obligations.map(o => ({
                          value: o.id,
                          label: `${o.type === 'WEEKLY' ? 'Weekly' : 'Special'} - ${o.title} - Due: ${o.dueDate ? new Date(o.dueDate).toLocaleDateString() : 'N/A'} - Remaining: ${Number(o.amount - o.amountPaid).toLocaleString()} ETB`
                        }))
                      ]}
                    />
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount (ETB) *</label>
                <input className={inputClass} type="number" min="1" step="0.01" placeholder="e.g. 50"
                  value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payment Method</label>
                <Select 
                  value={form.paymentMethod} 
                  onChange={e => setForm({ ...form, paymentMethod: e })}
                  options={METHODS.map(m => ({ value: m, label: m.replace(/_/g, ' ') }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Transaction Reference</label>
                <input className={inputClass} placeholder="Optional" value={form.transactionReference} onChange={e => setForm({ ...form, transactionReference: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notes</label>
                <textarea className={inputClass} rows={2} placeholder="Optional" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs border border-red-100">
                  <AlertCircle size={13} /> {formError}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button className={btnPrimary} onClick={recordPayment} disabled={saving}>{saving ? 'Recording...' : 'Record Payment'}</button>
                <button className={btnSecondary} onClick={() => setShowRecord(false)}>Cancel</button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ── BULK RECORD ── */}
      <Modal open={showBulk} onClose={() => { setShowBulk(false); setBulkSuccess(''); }} title="Bulk Record Payments" wide>
        <div className="space-y-4">
          {bulkSuccess ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-emerald-700">{bulkSuccess}</p>
                <p className="text-xs text-slate-500 mt-1">Pending admin verification.</p>
              </div>
              <div className="flex gap-3">
                <button className={btnPrimary} onClick={() => setBulkSuccess('')}>Record More</button>
                <button className={btnSecondary} onClick={() => { setShowBulk(false); setBulkSuccess(''); }}>Done</button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500">Record payment for multiple members. Override amount per member if needed.</p>
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Default Amount (ETB) *</label>
                  <input className={inputClass} type="number" min="1" step="0.01" placeholder="e.g. 50" value={bulkAmount} onChange={e => setBulkAmount(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payment Method</label>
                  <Select 
                    value={bulkMethod} 
                    onChange={e => setBulkMethod(e)}
                    options={METHODS.map(m => ({ value: m, label: m.replace(/_/g, ' ') }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date</label>
                  <DateInput value={bulkDate} onChange={setBulkDate} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Obligation (Optional)</label>
                  {bulkLoadingObligations ? (
                    <div className="text-xs text-slate-400">Loading obligations...</div>
                  ) : (
                    <Select 
                      value={bulkObligationId} 
                      onChange={e => {
                        const selected = bulkObligations.find(o => o.id === e);
                        setBulkObligationId(e);
                        if (selected) {
                          setBulkAmount(String(selected.amount - selected.amountPaid));
                        }
                      }}
                      options={[
                        { value: '', label: '-- Select obligation (optional) --' },
                        ...bulkObligations.map(o => ({
                          value: o.id,
                          label: `${o.type === 'WEEKLY' ? 'Weekly' : 'Special'} - ${o.title} - Remaining: ${Number(o.amount - o.amountPaid).toLocaleString()} ETB`
                        }))
                      ]}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notes</label>
                  <input className={inputClass} placeholder="Optional" value={bulkNotes} onChange={e => setBulkNotes(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Select Members ({selectedCount} / {members.length})</span>
                <div className="flex gap-2">
                  <button className="text-xs text-emerald-600 underline" onClick={() => selectAllBulk(true)}>Select All</button>
                  <button className="text-xs text-slate-400 underline" onClick={() => selectAllBulk(false)}>Clear</button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto border rounded-xl divide-y">
                {members.map((m, i) => (
                  <div key={m.id} className={`flex items-center gap-3 px-4 py-2.5 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <input type="checkbox" className="rounded" checked={!!bulkSelected[m.id]} onChange={() => toggleBulkMember(m.id)} />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-800">{m.fullName}</span>
                      <span className="text-xs text-slate-400 ml-2">#{m.memberId}</span>
                    </div>
                    {bulkSelected[m.id] && (
                      <input type="number" min="1" step="0.01"
                        className="border rounded-lg px-2 py-1 text-xs w-28"
                        placeholder={bulkAmount || 'Override'}
                        value={bulkIndividual[m.id] || ''}
                        onChange={e => setBulkIndividual(prev => ({ ...prev, [m.id]: e.target.value }))} />
                    )}
                  </div>
                ))}
              </div>
              {bulkError && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs border border-red-100">
                  <AlertCircle size={13} /> {bulkError}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button className={btnPrimary} onClick={saveBulk} disabled={bulkSaving || selectedCount === 0}>
                  {bulkSaving ? 'Recording...' : `Record ${selectedCount} Payment${selectedCount !== 1 ? 's' : ''}`}
                </button>
                <button className={btnSecondary} onClick={() => setShowBulk(false)}>Cancel</button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ── RECEIPT ── */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Payment Receipt">
        {receipt && (
          <div className="space-y-4">
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-emerald-600 px-5 py-4 text-center text-white">
                <p className="text-xs opacity-80">Receipt Number</p>
                <p className="text-xl font-bold font-mono">{receipt.receiptNumber || 'N/A'}</p>
              </div>
              <div className="p-5 space-y-3 text-sm">
                {[
                  { label: 'Member', value: receipt.memberName },
                  { label: 'Member ID', value: `#${receipt.memberId}` },
                  { label: 'Method', value: receipt.paymentMethod.replace(/_/g, ' ') },
                  { label: 'Date', value: new Date(receipt.paymentDate).toLocaleString() },
                  { label: 'Recorded by', value: receipt.auditorName || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between border-b last:border-0 pb-2 last:pb-0">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-800">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-bold text-emerald-700 text-lg">{Number(receipt.amount).toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <Badge status={receipt.status} />
                </div>
              </div>
            </div>
            <button className={btnSecondary} onClick={() => window.print()}>🖨 Print Receipt</button>
          </div>
        )}
      </Modal>

      {/* ── DELETE CONFIRM ── */}
      <Modal open={!!deleteId} onClose={() => { setDeleteId(null); setDeleteError(''); }} title="Delete Payment">
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">Delete this payment? <strong>Only pending payments can be deleted.</strong></p>
          </div>
          {deleteError && <p className="text-red-600 text-xs">{deleteError}</p>}
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700" onClick={confirmDelete}>Delete</button>
            <button className={btnSecondary} onClick={() => { setDeleteId(null); setDeleteError(''); }}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
