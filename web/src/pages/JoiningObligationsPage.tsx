import { useEffect, useState } from 'react';
import { DollarSign, Users, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, LoadingSpinner, inputClass, btnPrimary, Modal } from '../components/ui';
import { CheckCircle, XCircle } from 'lucide-react';

interface JoiningObligation {
  id: string;
  memberId: string;
  totalBackContributionAmount: number;
  backContributionWeeks: number;
  amountPaid: number;
  status: string;
  dueDate: string;
  member: {
    id: string;
    memberId: string;
    fullName: string;
    joinDate: string;
  };
}

export default function JoiningObligationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [obligations, setObligations] = useState<JoiningObligation[]>([]);
  const [groupStartDate, setGroupStartDate] = useState<string>('');
  const [newGroupStartDate, setNewGroupStartDate] = useState<string>('');
  const [selectedObligation, setSelectedObligation] = useState<JoiningObligation | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [waiverReason, setWaiverReason] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [showGroupStartModal, setShowGroupStartModal] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [obligationsRes, groupStartRes] = await Promise.all([
        api.get('/joining-obligations'),
        api.get('/joining-obligations/group-start-date'),
      ]);

      setObligations(obligationsRes.data.data || []);
      if (groupStartRes.data.data?.groupStartDate) {
        setGroupStartDate(new Date(groupStartRes.data.data.groupStartDate).toISOString().split('T')[0]);
        setNewGroupStartDate(new Date(groupStartRes.data.data.groupStartDate).toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const setGroupStart = async () => {
    if (!newGroupStartDate) {
      setModalType('error');
      setModalMessage('Please select a group start date');
      setModalOpen(true);
      return;
    }

    setSaving(true);
    try {
      await api.post('/joining-obligations/group-start-date', {
        groupStartDate: new Date(newGroupStartDate).toISOString(),
      });

      setGroupStartDate(newGroupStartDate);
      setShowGroupStartModal(false);
      setModalType('success');
      setModalMessage('Group start date updated successfully!');
      setModalOpen(true);
      loadData();
    } catch {
      setModalType('error');
      setModalMessage('Failed to update group start date');
      setModalOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const recordPayment = async () => {
    if (!selectedObligation || !paymentAmount || Number(paymentAmount) <= 0) {
      setModalType('error');
      setModalMessage('Please enter a valid payment amount');
      setModalOpen(true);
      return;
    }

    setSaving(true);
    try {
      await api.post(`/joining-obligations/${selectedObligation.memberId}/payment`, {
        amount: Number(paymentAmount),
      });

      setShowPaymentModal(false);
      setPaymentAmount('');
      setSelectedObligation(null);
      setModalType('success');
      setModalMessage('Payment recorded successfully!');
      setModalOpen(true);
      loadData();
    } catch {
      setModalType('error');
      setModalMessage('Failed to record payment');
      setModalOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const waiveObligation = async () => {
    if (!selectedObligation || !waiverReason.trim()) {
      setModalType('error');
      setModalMessage('Please enter a waiver reason');
      setModalOpen(true);
      return;
    }

    setSaving(true);
    try {
      await api.post(`/joining-obligations/${selectedObligation.memberId}/waive`, {
        reason: waiverReason,
      });

      setShowWaiverModal(false);
      setWaiverReason('');
      setSelectedObligation(null);
      setModalType('success');
      setModalMessage('Joining obligation waived successfully!');
      setModalOpen(true);
      loadData();
    } catch {
      setModalType('error');
      setModalMessage('Failed to waive obligation');
      setModalOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PARTIAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'PENDING':
        return 'bg-red-100 text-red-800';
      case 'WAIVED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRemaining = (obligation: JoiningObligation) => {
    return obligation.totalBackContributionAmount - obligation.amountPaid;
  };

  if (loading) return <LoadingSpinner />;

  const totalBackContributions = obligations.reduce(
    (sum, o) => sum + Number(o.totalBackContributionAmount),
    0
  );
  const totalCollected = obligations.reduce((sum, o) => sum + Number(o.amountPaid), 0);
  const totalRemaining = totalBackContributions - totalCollected;

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Joining Obligations Management"
          subtitle="Manage back contributions for new members"
        />

        {/* Group Start Date Setting */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Group Start Date</h3>
              <p className="text-sm text-gray-600 mb-4">
                Set the date when your savings group started. New members will owe contributions for weeks before this date.
              </p>
              {groupStartDate && (
                <p className="text-lg font-bold text-green-600">
                  {new Date(groupStartDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowGroupStartModal(true)}
              className={btnPrimary}
            >
              Set Date
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Back Contributions</p>
                <p className="text-3xl font-bold text-blue-600">
                  Br {totalBackContributions.toLocaleString()} ETB
                </p>
              </div>
              <DollarSign className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Collected</p>
                <p className="text-3xl font-bold text-green-600">
                  Br {totalCollected.toLocaleString()} ETB
                </p>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Remaining Due</p>
                <p className="text-3xl font-bold text-red-600">
                  Br {totalRemaining.toLocaleString()} ETB
                </p>
              </div>
              <AlertCircle className="text-red-600" size={32} />
            </div>
          </div>
        </div>

        {/* Obligations List */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={20} />
            New Members Joining Obligations
          </h3>

          {obligations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold text-gray-800">Member</th>
                    <th className="text-left p-3 font-semibold text-gray-800">Join Date</th>
                    <th className="text-center p-3 font-semibold text-gray-800">Weeks Owed</th>
                    <th className="text-right p-3 font-semibold text-gray-800">Total Due</th>
                    <th className="text-right p-3 font-semibold text-gray-800">Paid</th>
                    <th className="text-right p-3 font-semibold text-gray-800">Remaining</th>
                    <th className="text-center p-3 font-semibold text-gray-800">Status</th>
                    <th className="text-center p-3 font-semibold text-gray-800">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {obligations.map((o) => (
                    <tr key={o.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <p className="font-semibold text-gray-800">{o.member.fullName}</p>
                          <p className="text-xs text-gray-500">ID: {o.member.memberId}</p>
                        </div>
                      </td>
                      <td className="p-3 text-gray-600">
                        {new Date(o.member.joinDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-3 text-center text-gray-600">{o.backContributionWeeks}</td>
                      <td className="p-3 text-right font-semibold text-gray-800">
                        Br {o.totalBackContributionAmount.toLocaleString()} ETB
                      </td>
                      <td className="p-3 text-right text-green-600 font-semibold">
                        Br {o.amountPaid.toLocaleString()} ETB
                      </td>
                      <td className="p-3 text-right font-semibold" style={{ color: getRemaining(o) > 0 ? '#dc2626' : '#10b981' }}>
                        Br {getRemaining(o).toLocaleString()} ETB
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => {
                              setSelectedObligation(o);
                              setShowPaymentModal(true);
                            }}
                            className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-all"
                          >
                            + Payment
                          </button>
                          <button
                            onClick={() => {
                              setSelectedObligation(o);
                              setShowWaiverModal(true);
                            }}
                            className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-all"
                          >
                            Waive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Users size={40} className="mx-auto mb-3 opacity-50" />
              <p>No joining obligations found</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">ℹ️ How Joining Obligations Work</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>
              <strong>1. Set Group Start Date:</strong> When did your savings group begin collecting contributions?
            </li>
            <li>
              <strong>2. Auto-Calculate:</strong> When a new member joins, the system calculates weeks owed = (Join Date - Group Start Date)
            </li>
            <li>
              <strong>3. Back Contribution Amount:</strong> For new members: Weeks Owed × Weekly Contribution Amount
            </li>
            <li>
              <strong>3b. Existing Members:</strong> If member rejoins: Weekly Contributions + Special Contributions (Graduation, Bereavement, Emergency) collected before they joined
            </li>
            <li>
              <strong>4. Payment Recording:</strong> Use "+ Payment" button to record partial or full payments
            </li>
            <li>
              <strong>5. Waive if Needed:</strong> Admin can waive the obligation with a reason (e.g., special case, approved by group)
            </li>
            <li>
              <strong>Status Tracking:</strong> PENDING = Nothing paid | PARTIAL = Some paid | PAID = Fully paid | WAIVED = Cancelled
            </li>
          </ul>
        </div>
      </div>

      {/* Group Start Date Modal */}
      <Modal
        open={showGroupStartModal}
        onClose={() => setShowGroupStartModal(false)}
        title="Set Group Start Date"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter the date when your savings group started collecting contributions.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              className={inputClass}
              value={newGroupStartDate}
              onChange={(e) => setNewGroupStartDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={setGroupStart}
              disabled={saving}
              className={btnPrimary}
            >
              {saving ? 'Saving...' : 'Save Date'}
            </button>
            <button
              onClick={() => setShowGroupStartModal(false)}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        open={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedObligation(null);
          setPaymentAmount('');
        }}
        title="Record Payment"
      >
        <div className="space-y-4">
          {selectedObligation && (
            <>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">{selectedObligation.member.fullName}</p>
                <p className="text-lg font-bold text-gray-800">
                  Remaining: Br {getRemaining(selectedObligation).toLocaleString()} ETB
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount (Br ETB)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={recordPayment}
                  disabled={saving}
                  className={btnPrimary}
                >
                  {saving ? 'Recording...' : 'Record Payment'}
                </button>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedObligation(null);
                    setPaymentAmount('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-all"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Waiver Modal */}
      <Modal
        open={showWaiverModal}
        onClose={() => {
          setShowWaiverModal(false);
          setSelectedObligation(null);
          setWaiverReason('');
        }}
        title="Waive Joining Obligation"
      >
        <div className="space-y-4">
          {selectedObligation && (
            <>
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-sm text-red-900">
                  ⚠️ This will cancel the joining obligation for <strong>{selectedObligation.member.fullName}</strong>.
                  They will not need to pay the Br {selectedObligation.totalBackContributionAmount.toLocaleString()} ETB in back contributions.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Waiver</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                  placeholder="e.g., Special approval by group members, hardship case, etc."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={waiveObligation}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all disabled:opacity-50"
                >
                  {saving ? 'Processing...' : 'Confirm Waiver'}
                </button>
                <button
                  onClick={() => {
                    setShowWaiverModal(false);
                    setSelectedObligation(null);
                    setWaiverReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-all"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Success/Error Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalType === 'success' ? 'Success' : 'Error'}>
        <div className="text-center py-4">
          {modalType === 'success' ? (
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          )}
          <p className="text-slate-700 text-sm leading-relaxed">{modalMessage}</p>
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
