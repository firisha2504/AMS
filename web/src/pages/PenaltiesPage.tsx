import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Gift, XCircle, Search, PlusCircle, CreditCard } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, LoadingSpinner, Modal, inputClass, btnSecondary, Select } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { formatMeetingLabel } from '../lib/meetingUtils';

interface Penalty {
  id: string;
  memberId: string;
  amount: number;
  amountPaid?: number;
  reason: string;
  title?: string | null;
  weekNumber: number | null;
  year: number | null;
  isMonthly: boolean;
  status: 'OUTSTANDING' | 'PARTIAL' | 'SETTLED' | 'WAIVED';
  paidAt: string | null;
  dueDate?: string | null;
  createdAt: string;
}

interface PenaltyWithMember extends Penalty {
  member: {
    fullName: string;
    memberId: string;
  };
}

interface Member {
  id: string;
  fullName: string;
  memberId: string;
}

export default function PenaltiesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [penalties, setPenalties] = useState<PenaltyWithMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isMonthlyFilter, setIsMonthlyFilter] = useState<string>('');
  
  // Search and filter members
  const [search, setSearch] = useState<string>('');
  
  // Selected member to view penalties
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [memberPenalties, setMemberPenalties] = useState<Penalty[]>([]);
  
  // Waive penalty modal
  const [waivePenalty, setWaivePenalty] = useState<Penalty | null>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [waiveError, setWaiveError] = useState('');
  const [waiving, setWaiving] = useState(false);

  // Pay penalty modal
  const [payTargetPenalty, setPayTargetPenalty] = useState<Penalty | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY'>('CASH');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  // Create manual penalty modal (ADMIN)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMemberId, setCreateMemberId] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createReason, setCreateReason] = useState('');
  const [createAmount, setCreateAmount] = useState('50');
  const [createDueDate, setCreateDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadPenalties = async () => {
    setLoading(true);
    try {
      const [penaltiesRes, membersRes] = await Promise.all([
        api.get('/penalties'),
        api.get('/members', { params: { limit: 200 } })
      ]);
      const allPenalties = penaltiesRes.data.data || [];
      const allMembers = membersRes.data.data || [];
      
      setPenalties(allPenalties);
      setMembers(allMembers);
    } catch (error) {
      console.error('Failed to load penalties:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMemberPenalties = async (memberId: string) => {
    if (!memberId) {
      setMemberPenalties([]);
      return;
    }
    try {
      const { data } = await api.get(`/penalties/member/${memberId}`);
      setMemberPenalties(data.data || []);
    } catch (error) {
      console.error('Failed to load member penalties:', error);
      setMemberPenalties([]);
    }
  };

  useEffect(() => {
    loadPenalties();
  }, []);

  useEffect(() => {
    if (selectedMemberId) {
      loadMemberPenalties(selectedMemberId);
    }
  }, [selectedMemberId]);

  const filteredMembers = members.filter(m =>
    search === '' ||
    m.fullName.toLowerCase().includes(search.toLowerCase()) ||
    m.memberId.toLowerCase().includes(search.toLowerCase())
  );

  const openWaiveModal = (penalty: Penalty) => {
    setWaivePenalty(penalty);
    setWaiveReason('');
    setWaiveError('');
  };

  const handleWaivePenalty = async () => {
    if (!waivePenalty) return;
    setWaiveError('');
    if (!waiveReason.trim()) {
      setWaiveError('Please enter a reason for waiving this penalty');
      return;
    }

    setWaiving(true);
    try {
      await api.patch(`/penalties/${waivePenalty.id}/waive`, {
        reason: waiveReason
      });
      await loadPenalties();
      if (selectedMemberId) {
        await loadMemberPenalties(selectedMemberId);
      }
      setWaivePenalty(null);
    } catch (error: any) {
      setWaiveError(error.response?.data?.message || 'Failed to waive penalty');
    } finally {
      setWaiving(false);
    }
  };

  const openPayModal = (penalty: Penalty) => {
    const remaining = Number(penalty.amount) - Number(penalty.amountPaid || 0);
    setPayTargetPenalty(penalty);
    setPayAmount(String(remaining > 0 ? remaining : penalty.amount));
    setPayMethod('CASH');
    setPayReference('');
    setPayNotes('');
    setPayError('');
  };

  const handlePayPenalty = async () => {
    if (!payTargetPenalty) return;
    const amountNum = parseFloat(payAmount);
    if (!amountNum || amountNum <= 0) {
      setPayError('Please enter a valid amount');
      return;
    }

    const remaining = Number(payTargetPenalty.amount) - Number(payTargetPenalty.amountPaid || 0);
    if (amountNum > remaining) {
      setPayError(`Payment cannot exceed remaining penalty balance (${remaining} ETB)`);
      return;
    }

    setPaying(true);
    setPayError('');
    try {
      await api.post('/penalties/pay', {
        penaltyId: payTargetPenalty.id,
        amount: amountNum,
        paymentMethod: payMethod,
        transactionReference: payReference.trim() || undefined,
        notes: payNotes.trim() || undefined,
      });

      await loadPenalties();
      if (selectedMemberId) {
        await loadMemberPenalties(selectedMemberId);
      }
      setPayTargetPenalty(null);
    } catch (error: any) {
      setPayError(error.response?.data?.message || error.message || 'Failed to pay penalty');
    } finally {
      setPaying(false);
    }
  };

  const handleCreatePenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createMemberId) {
      setCreateError('Please select a member');
      return;
    }
    const amountNum = parseFloat(createAmount);
    if (!amountNum || amountNum <= 0) {
      setCreateError('Please enter a valid amount');
      return;
    }
    if (!createReason.trim()) {
      setCreateError('Please provide a reason');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      await api.post('/penalties', {
        memberId: createMemberId,
        amount: amountNum,
        reason: createReason.trim(),
        title: createTitle.trim() || undefined,
        dueDate: createDueDate || undefined,
      });

      await loadPenalties();
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateReason('');
      setCreateAmount('50');
      setCreateDueDate('');
    } catch (err: any) {
      setCreateError(err.response?.data?.message || err.message || 'Failed to create penalty');
    } finally {
      setCreating(false);
    }
  };

  const filtered = penalties.filter(p => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (isMonthlyFilter === 'true' && !p.isMonthly) return false;
    if (isMonthlyFilter === 'false' && p.isMonthly) return false;
    return true;
  });

  const filteredMemberPenalties = memberPenalties.filter(p => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (isMonthlyFilter === 'true' && !p.isMonthly) return false;
    if (isMonthlyFilter === 'false' && p.isMonthly) return false;
    return true;
  });

  const totalOutstanding = penalties
    .filter(p => p.status === 'OUTSTANDING' || p.status === 'PARTIAL')
    .reduce((sum, p) => sum + (Number(p.amount) - Number(p.amountPaid || 0)), 0);
  
  const totalSettled = penalties
    .filter(p => p.status === 'SETTLED')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalWaived = penalties
    .filter(p => p.status === 'WAIVED')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const renderPenaltyTable = (penaltiesToShow: (Penalty | PenaltyWithMember)[], showMemberColumn = true) => (
    <div className="table-responsive">
      <table>
        <thead className="bg-slate-50">
        <tr>
          {showMemberColumn && (
            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Member</th>
          )}
          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Week/Year</th>
          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Title & Reason</th>
          <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Original Amount</th>
          <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Paid</th>
          <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Remaining</th>
          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
          <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {penaltiesToShow.length === 0 ? (
          <tr>
            <td colSpan={showMemberColumn ? 10 : 9} className="px-5 py-10 text-center text-sm text-slate-400">
              No penalties found
            </td>
          </tr>
        ) : (
          penaltiesToShow.map(penalty => {
            const originalAmount = Number(penalty.amount);
            const amountPaid = Number(penalty.amountPaid || 0);
            const remaining = penalty.status === 'WAIVED' ? 0 : Math.max(0, originalAmount - amountPaid);
            const isUnpaid = penalty.status === 'OUTSTANDING' || penalty.status === 'PARTIAL';

            return (
              <tr key={penalty.id} className="hover:bg-slate-50">
                {showMemberColumn && 'member' in penalty && (
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-slate-800">{penalty.member.fullName}</p>
                    <p className="text-xs text-slate-400">#{penalty.member.memberId}</p>
                  </td>
                )}
                <td className="px-5 py-3">
                  {penalty.weekNumber && penalty.year ? (
                    <span className="text-sm text-slate-700">{formatMeetingLabel(penalty.weekNumber, penalty.year)}</span>
                  ) : (
                    <span className="text-xs text-slate-400">Manual</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {penalty.title && (
                    <p className="text-sm font-semibold text-slate-800">{penalty.title}</p>
                  )}
                  <p className="text-xs text-slate-600 max-w-xs truncate">{penalty.reason}</p>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-sm font-medium text-slate-700">
                    {originalAmount.toLocaleString()} ETB
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-sm font-semibold text-emerald-600">
                    {amountPaid.toLocaleString()} ETB
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={`text-sm font-bold ${remaining > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {remaining.toLocaleString()} ETB
                  </span>
                </td>
                <td className="px-5 py-3">
                  {penalty.isMonthly ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                      Monthly
                    </span>
                  ) : penalty.weekNumber ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                      Weekly
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 ring-1 ring-purple-200">
                      Manual
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {penalty.status === 'OUTSTANDING' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
                      Unpaid
                    </span>
                  )}
                  {penalty.status === 'PARTIAL' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                      Partially Paid
                    </span>
                  )}
                  {penalty.status === 'SETTLED' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                      Paid
                    </span>
                  )}
                  {penalty.status === 'WAIVED' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                      Waived
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <p className="text-xs text-slate-500">
                    {new Date(penalty.createdAt).toLocaleDateString()}
                  </p>
                  {penalty.paidAt && (
                    <p className="text-xs text-emerald-600">
                      Paid: {new Date(penalty.paidAt).toLocaleDateString()}
                    </p>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {isUnpaid && (
                      <button
                        onClick={() => openPayModal(penalty)}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition-colors"
                        title="Pay Penalty"
                      >
                        <CreditCard size={13} />
                        Pay
                      </button>
                    )}
                    {isUnpaid && isAdmin && (
                      <button
                        onClick={() => openWaiveModal(penalty)}
                        className="px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition-colors"
                        title="Waive Penalty"
                      >
                        <Gift size={13} />
                        Waive
                      </button>
                    )}
                    {penalty.status === 'SETTLED' && (
                      <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 size={13} /> Fully Settled
                      </span>
                    )}
                    {penalty.status === 'WAIVED' && (
                      <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                        <Gift size={13} /> Waived
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <PageHeader title={t('penalties.title')} />
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold text-sm inline-flex items-center gap-2 shadow-sm transition-colors"
          >
            <PlusCircle size={16} />
            Create Penalty
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Penalties</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{penalties.length}</p>
                </div>
                <AlertCircle className="text-slate-400" size={32} />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Outstanding Balance</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {totalOutstanding.toLocaleString()} ETB
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {penalties.filter(p => p.status === 'OUTSTANDING' || p.status === 'PARTIAL').length} unpaid
                  </p>
                </div>
                <XCircle className="text-red-400" size={32} />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Settled</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {totalSettled.toLocaleString()} ETB
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {penalties.filter(p => p.status === 'SETTLED').length} settled
                  </p>
                </div>
                <CheckCircle2 className="text-emerald-400" size={32} />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Waived</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {totalWaived.toLocaleString()} ETB
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {penalties.filter(p => p.status === 'WAIVED').length} waived
                  </p>
                </div>
                <Gift className="text-blue-400" size={32} />
              </div>
            </div>
          </div>

          {/* Member Selector */}
          <div className="bg-white rounded-xl border p-4 mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Filter Penalties by Specific Member:
            </label>
            
            <div className="mb-3 relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search member name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputClass} pl-10`}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            <Select 
              value={selectedMemberId} 
              onChange={setSelectedMemberId}
              options={[
                { value: '', label: filteredMembers.length > 0 ? '-- All Members --' : 'No members found' },
                ...filteredMembers.map(m => ({ value: m.id, label: `${m.fullName} (#${m.memberId})` }))
              ]}
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border shadow-sm mb-6">
            <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-800">
                {selectedMemberId
                  ? `${members.find(m => m.id === selectedMemberId)?.fullName}'s Penalties`
                  : 'All Penalty Obligations'}
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs border rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700"
                >
                  <option value="">All Statuses</option>
                  <option value="OUTSTANDING">Unpaid</option>
                  <option value="PARTIAL">Partially Paid</option>
                  <option value="SETTLED">Paid</option>
                  <option value="WAIVED">Waived</option>
                </select>
                <select
                  value={isMonthlyFilter}
                  onChange={(e) => setIsMonthlyFilter(e.target.value)}
                  className="text-xs border rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700"
                >
                  <option value="">All Types</option>
                  <option value="false">Weekly</option>
                  <option value="true">Monthly</option>
                </select>
              </div>
            </div>
            {renderPenaltyTable(selectedMemberId ? filteredMemberPenalties : filtered, !selectedMemberId)}
          </div>
        </>
      )}

      {/* Pay Penalty Modal */}
      <Modal
        open={!!payTargetPenalty}
        onClose={() => setPayTargetPenalty(null)}
        title="Pay Penalty Obligation"
      >
        {payTargetPenalty && (
          <div className="space-y-4">
            {payError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {payError}
              </div>
            )}

            <div className="bg-slate-50 rounded-lg p-3 space-y-1">
              <p className="text-sm font-semibold text-slate-800">
                {payTargetPenalty.title || payTargetPenalty.reason}
              </p>
              <div className="flex justify-between text-xs text-slate-600 pt-1">
                <span>Original Amount: <strong>{Number(payTargetPenalty.amount)} ETB</strong></span>
                <span>Already Paid: <strong>{Number(payTargetPenalty.amountPaid || 0)} ETB</strong></span>
                <span>Remaining: <strong className="text-red-600">{Number(payTargetPenalty.amount) - Number(payTargetPenalty.amountPaid || 0)} ETB</strong></span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Payment Amount (ETB)
              </label>
              <input
                type="number"
                min="1"
                max={Number(payTargetPenalty.amount) - Number(payTargetPenalty.amountPaid || 0)}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className={inputClass}
                placeholder="Enter amount..."
              />
              <p className="text-xs text-slate-500 mt-1">
                Supports partial payments up to the remaining penalty balance.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as any)}
                className={inputClass}
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer (CBE / Awash)</option>
                <option value="MOBILE_MONEY">Mobile Money (Telebirr / E-Birr)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Transaction Reference / Slip #
              </label>
              <input
                type="text"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                className={inputClass}
                placeholder="e.g. FT25010199..."
              />
            </div>

            <div className="flex gap-3 pt-3">
              <button
                onClick={handlePayPenalty}
                disabled={paying}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-semibold text-sm"
              >
                {paying ? 'Processing...' : 'Confirm Payment'}
              </button>
              <button
                onClick={() => setPayTargetPenalty(null)}
                disabled={paying}
                className={btnSecondary}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Waive Penalty Modal */}
      <Modal
        open={!!waivePenalty}
        onClose={() => setWaivePenalty(null)}
        title="Waive Penalty"
      >
        {waivePenalty && (
          <div className="space-y-4">
            {waiveError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {waiveError}
              </div>
            )}

            <div className="bg-slate-50 rounded-lg p-3 space-y-2">
              <p className="text-sm">
                <span className="text-slate-500">Reason:</span>{' '}
                <span className="font-semibold">{waivePenalty.reason}</span>
              </p>
              <p className="text-sm">
                <span className="text-slate-500">Amount:</span>{' '}
                <span className="font-bold text-lg text-slate-800">
                  {Number(waivePenalty.amount).toLocaleString()} ETB
                </span>
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <p className="font-semibold">⚠️ Official Waiver Requirement:</p>
              <p className="mt-1">
                Every penalty waiver requires a justified reason and will be permanently recorded in the official audit log.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for Waiving (required)
              </label>
              <textarea
                className={inputClass}
                rows={3}
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                placeholder="Enter justification for waiving this penalty..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleWaivePenalty}
                disabled={waiving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold text-sm"
              >
                {waiving ? 'Waiving...' : 'Confirm Waiver'}
              </button>
              <button
                onClick={() => setWaivePenalty(null)}
                disabled={waiving}
                className={btnSecondary}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Manual Penalty Modal (ADMIN) */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Penalty"
      >
        <form onSubmit={handleCreatePenalty} className="space-y-4">
          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Member *
            </label>
            <select
              value={createMemberId}
              onChange={(e) => setCreateMemberId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">-- Choose Member --</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.fullName} (#{m.memberId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Penalty Title
            </label>
            <input
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              className={inputClass}
              placeholder="e.g. Unexcused Meeting Absence, Bylaw Infraction..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Amount (ETB) *
            </label>
            <input
              type="number"
              min="1"
              value={createAmount}
              onChange={(e) => setCreateAmount(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reason / Justification *
            </label>
            <textarea
              rows={3}
              value={createReason}
              onChange={(e) => setCreateReason(e.target.value)}
              className={inputClass}
              placeholder="Detailed description of why this penalty is assessed..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={createDueDate}
              onChange={(e) => setCreateDueDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold text-sm"
            >
              {creating ? 'Creating...' : 'Create Penalty'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              disabled={creating}
              className={btnSecondary}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
