import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Gift, XCircle, Search } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, LoadingSpinner, Modal, inputClass, btnSecondary, Select } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { formatMeetingLabel } from '../lib/meetingUtils';

interface Penalty {
  id: string;
  memberId: string;
  amount: number;
  reason: string;
  weekNumber: number | null;
  year: number | null;
  isMonthly: boolean;
  status: 'OUTSTANDING' | 'SETTLED' | 'WAIVED';
  paidAt: string | null;
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
  const [statusFilter, setStatusFilter] = useState<string>('OUTSTANDING'); // Default to showing only outstanding
  const [isMonthlyFilter, setIsMonthlyFilter] = useState<string>('');
  
  // Search and filter members
  const [search, setSearch] = useState<string>('');
  
  // Selected member to view penalties
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [memberPenalties, setMemberPenalties] = useState<Penalty[]>([]);
  
  // Waive penalty modal - using single state for better synchronization
  const [waivePenalty, setWaivePenalty] = useState<Penalty | null>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [waiveError, setWaiveError] = useState('');
  const [waiving, setWaiving] = useState(false);

  const loadPenalties = async () => {
    setLoading(true);
    try {
      const [penaltiesRes, membersRes] = await Promise.all([
        api.get('/penalties'),
        api.get('/members', { params: { limit: 200 } }) // Load ALL members, not just APPROVED
      ]);
      const allPenalties = penaltiesRes.data.data || [];
      const allMembers = membersRes.data.data || [];
      
      setPenalties(allPenalties);
      
      // Show ALL members who have ANY penalties (outstanding, settled, or waived)
      const memberIdsWithPenalties = new Set(
        allPenalties.map((p: any) => p.memberId)
      );
      const membersWithPenalties = allMembers.filter((m: Member) => memberIdsWithPenalties.has(m.memberId));
      
      setMembers(membersWithPenalties);
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

  // Filter members based on search term
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
      
      // Reload data
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

  const filtered = penalties.filter(p => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (isMonthlyFilter === 'true' && !p.isMonthly) return false;
    if (isMonthlyFilter === 'false' && p.isMonthly) return false;
    return true;
  });

  // Apply same filters to member penalties
  const filteredMemberPenalties = memberPenalties.filter(p => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (isMonthlyFilter === 'true' && !p.isMonthly) return false;
    if (isMonthlyFilter === 'false' && p.isMonthly) return false;
    return true;
  });

  const totalOutstanding = penalties
    .filter(p => p.status === 'OUTSTANDING')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  
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
          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Reason</th>
          <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Amount</th>
          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
          <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {penaltiesToShow.length === 0 ? (
          <tr>
            <td colSpan={showMemberColumn ? 8 : 7} className="px-5 py-10 text-center text-sm text-slate-400">
              No penalties found
            </td>
          </tr>
        ) : (
          penaltiesToShow.map(penalty => (
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
                  <span className="text-xs text-slate-400">N/A</span>
                )}
              </td>
              <td className="px-5 py-3">
                <p className="text-sm text-slate-600 max-w-xs truncate">{penalty.reason}</p>
              </td>
              <td className="px-5 py-3 text-right">
                <span className="text-sm font-semibold text-slate-800">
                  {Number(penalty.amount).toLocaleString()} Birr
                </span>
              </td>
              <td className="px-5 py-3">
                {penalty.isMonthly ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                    Monthly
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                    Weekly
                  </span>
                )}
              </td>
              <td className="px-5 py-3">
                {penalty.status === 'OUTSTANDING' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
                    Outstanding
                  </span>
                )}
                {penalty.status === 'SETTLED' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                    Settled
                  </span>
                )}
                {penalty.status === 'WAIVED' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                    Waived
                  </span>
                )}
                {!penalty.status && penalty.paidAt && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                    Settled
                  </span>
                )}
                {!penalty.status && !penalty.paidAt && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
                    Outstanding
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
                <div className="flex items-center justify-center gap-2" style={{ position: 'relative', zIndex: 10 }}>
                  {(penalty.status === 'OUTSTANDING' || (!penalty.status && !penalty.paidAt)) && (
                    <>
                      {/* Removed Pay button - penalties are paid on Weekly Contributions page */}
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openWaiveModal(penalty);
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Waive Penalty"
                          type="button"
                          style={{ pointerEvents: 'all', cursor: 'pointer' }}
                        >
                          <Gift size={14} />
                          Waive
                        </button>
                      )}
                      {!isAdmin && (
                        <span className="text-xs text-amber-600 font-medium">⏳ Pending</span>
                      )}
                    </>
                  )}
                  {(penalty.status === 'SETTLED' || (!penalty.status && penalty.paidAt)) && (
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> Paid
                    </span>
                  )}
                  {penalty.status === 'WAIVED' && (
                    <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                      <Gift size={12} /> Waived
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <PageHeader title={t('penalties.title')} />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Info Banner - How to Pay Penalties */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-600 mt-0.5 shrink-0" size={20} />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">💡 How to Pay Penalties</h3>
                <p className="text-sm text-blue-800">
                  Penalties are automatically added to your weekly contribution obligations. 
                  Pay them together on the <strong>Weekly Contributions</strong> page.
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  Example: If you have a 50 ETB contribution + 50 ETB penalty = Pay 100 ETB total on Weekly Contributions page.
                </p>
              </div>
            </div>
          </div>

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
                  <p className="text-sm text-slate-500">Outstanding</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {penalties.filter(p => p.status === 'OUTSTANDING').length}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {totalOutstanding.toLocaleString()} Birr
                  </p>
                </div>
                <XCircle className="text-red-400" size={32} />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Settled</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {penalties.filter(p => p.status === 'SETTLED').length}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {totalSettled.toLocaleString()} Birr
                  </p>
                </div>
                <CheckCircle2 className="text-emerald-400" size={32} />
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Waived</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {penalties.filter(p => p.status === 'WAIVED').length}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {totalWaived.toLocaleString()} Birr
                  </p>
                </div>
                <Gift className="text-blue-400" size={32} />
              </div>
            </div>
          </div>

          {/* Member Selector */}
          <div className="bg-white rounded-xl border p-4 mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              View Penalties for Specific Member:
            </label>
            
            {/* Search Input */}
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

            {/* Member Dropdown - show filtered results */}
            <Select 
              value={selectedMemberId} 
              onChange={setSelectedMemberId}
              options={[
                { value: '', label: filteredMembers.length > 0 ? '-- Select Member --' : 'No members found' },
                ...filteredMembers.map(m => ({ value: m.id, label: `${m.fullName} (#{m.memberId})` }))
              ]}
            />
          </div>

          {/* Member Penalties View */}
          {selectedMemberId && (
            <div className="bg-white rounded-xl border shadow-sm mb-6">
              <div className="px-5 py-4 border-b">
                <h3 className="text-lg font-semibold text-slate-800">
                  {members.find(m => m.id === selectedMemberId)?.fullName}'s Penalties
                </h3>
              </div>
              {renderPenaltyTable(filteredMemberPenalties, false)}
            </div>
          )}

          {/* All Penalties View */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="px-4 sm:px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <h3 className="text-lg font-semibold text-slate-800">All Penalties</h3>
              
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <Select 
                  value={statusFilter} 
                  onChange={setStatusFilter}
                  options={[
                    { value: '', label: 'All Status' },
                    { value: 'OUTSTANDING', label: 'Outstanding' },
                    { value: 'SETTLED', label: 'Settled' },
                    { value: 'WAIVED', label: 'Waived' }
                  ]}
                />
                
                <Select 
                  value={isMonthlyFilter} 
                  onChange={setIsMonthlyFilter}
                  options={[
                    { value: '', label: 'All Types' },
                    { value: 'false', label: 'Weekly' },
                    { value: 'true', label: 'Monthly' }
                  ]}
                />
              </div>
            </div>
            {renderPenaltyTable(filtered, true)}
          </div>
        </>
      )}

      {/* Waive Penalty Modal */}
      <Modal
        open={!!waivePenalty}
        onClose={() => setWaivePenalty(null)}
        title="Waive Penalty"
      >
        {waivePenalty && (
          <div className="space-y-4">
            {waiveError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                {waiveError}
              </div>
            )}
            
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-sm">
                <span className="text-slate-500">Meeting:</span>{' '}
                <span className="font-semibold">{formatMeetingLabel(waivePenalty.weekNumber, waivePenalty.year)}</span>
              </p>
              <p className="text-sm">
                <span className="text-slate-500">Amount:</span>{' '}
                <span className="font-bold text-lg text-slate-800">
                  {Number(waivePenalty.amount).toLocaleString()} Birr
                </span>
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <p className="font-semibold">⚠️ Important:</p>
              <p className="mt-1">Waiving this penalty will:</p>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li>Mark it as WAIVED (cannot be undone)</li>
                <li>Reduce member's outstanding balance</li>
                <li>Notify the member</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for Waiving (required)
              </label>
              <textarea
                className={inputClass}
                rows={4}
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                placeholder="Enter reason for waiving this penalty..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleWaivePenalty}
                disabled={waiving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {waiving ? 'Waiving...' : 'Waive Penalty'}
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
    </div>
  );
}
