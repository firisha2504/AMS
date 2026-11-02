import { useEffect, useState } from 'react';
import { Plus, Eye, AlertTriangle, CheckCircle2, Users, Pencil, Trash2, CheckCheck } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, LoadingSpinner, Modal, inputClass, btnPrimary, btnSecondary, Select } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

interface Fine {
  id: string; fineType: string; amount: number; reason: string;
  fineDate: string; isPaid: boolean;
  member: { fullName: string; memberId: string };
}

type PenaltyStatus = 'OUTSTANDING' | 'SETTLED' | 'WAIVED';

interface Penalty {
  id: string; amount: number; reason: string;
  status: PenaltyStatus;
  isMonthly: boolean; weekNumber?: number; year?: number; createdAt: string;
}

interface MemberPenaltySummary {
  id: string; fullName: string; memberId: string;
  totalPenalties: number; unpaidPenalties: number; paidPenalties: number;
  penaltyCount: number; unpaidPenaltyCount: number;
  totalFines: number; unpaidFines: number;
  totalOutstanding: number;
  recentPenalties: Penalty[];
  recentFines: { id: string; amount: number; reason: string; fineType: string; isPaid: boolean; fineDate: string }[];
}

interface Member { id: string; fullName: string; memberId: string; }

type Tab = 'fines' | 'penalties';

export default function FinesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [tab, setTab] = useState<Tab>('penalties');
  const [fines, setFines] = useState<Fine[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [penaltySummary, setPenaltySummary] = useState<MemberPenaltySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Create fine modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ memberId: '', fineType: 'DISCIPLINARY', amount: '', reason: '' });
  const [creating, setCreating] = useState(false);

  // Edit fine modal
  const [editFine, setEditFine] = useState<Fine | null>(null);
  const [editForm, setEditForm] = useState({ fineType: '', amount: '', reason: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete confirm
  const [deleteFineId, setDeleteFineId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Member detail modal
  const [detailMember, setDetailMember] = useState<MemberPenaltySummary | null>(null);

  // Search/filter
  const [search, setSearch] = useState('');

  const loadFines = () => {
    Promise.all([
      api.get('/finance/fines'),
      isAdmin ? api.get('/members', { params: { limit: 200, status: 'APPROVED' } }) : Promise.resolve({ data: { data: [] } }),
    ]).then(([f, m]) => {
      setFines(f.data.data || []);
      setMembers(m.data.data || []);
    });
  };

  const loadPenaltySummary = async () => {
    setSummaryLoading(true);
    try {
      const { data } = await api.get('/special-contributions/penalties/summary');
      setPenaltySummary(data.data || []);
    } finally { setSummaryLoading(false); }
  };

  const load = async () => {
    setLoading(true);
    try {
      await Promise.all([loadFines(), loadPenaltySummary()]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user?.role]);

  const createFine = async () => {
    setCreating(true);
    try {
      await api.post('/finance/fines', {
        memberId: form.memberId,
        fineType: form.fineType,
        amount: Number(form.amount),
        reason: form.reason,
      });
      setShowCreate(false);
      setForm({ memberId: '', fineType: 'DISCIPLINARY', amount: '', reason: '' });
      loadFines();
    } finally { setCreating(false); }
  };

  const openEditFine = (f: Fine) => {
    setEditFine(f);
    setEditForm({ fineType: f.fineType, amount: String(f.amount), reason: f.reason });
    setEditError('');
  };

  const saveEditFine = async () => {
    if (!editFine) return;
    setEditSaving(true); setEditError('');
    try {
      await api.patch(`/finance/fines/${editFine.id}`, {
        fineType: editForm.fineType,
        amount: Number(editForm.amount),
        reason: editForm.reason,
      });
      setEditFine(null);
      loadFines();
    } catch { setEditError('Failed to update fine. Please try again.'); }
    finally { setEditSaving(false); }
  };

  const markFinePaid = async (id: string) => {
    await api.patch(`/finance/fines/${id}`, { isPaid: true });
    loadFines();
    loadPenaltySummary();
  };

  const confirmDeleteFine = async () => {
    if (!deleteFineId) return;
    setDeleteError('');
    try {
      await api.delete(`/finance/fines/${deleteFineId}`);
      setDeleteFineId(null);
      loadFines();
      loadPenaltySummary();
    } catch { setDeleteError('Cannot delete a paid fine.'); }
  };

  // Totals for summary
  const totalUnpaid = penaltySummary.reduce((s, m) => s + m.totalOutstanding, 0);
  const membersWithDebt = penaltySummary.filter((m) => m.totalOutstanding > 0).length;
  const totalPenalties = penaltySummary.reduce((s, m) => s + m.totalPenalties, 0);

  const filteredSummary = penaltySummary.filter((m) =>
    search === '' ||
    m.fullName.toLowerCase().includes(search.toLowerCase()) ||
    m.memberId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Penalties & Fines"
        action={isAdmin && (
          <button className={btnPrimary} onClick={() => setShowCreate(true)}>
            <Plus size={15} className="inline mr-1" />Add Fine
          </button>
        )}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('penalties')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'penalties' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
          <Users size={14} className="inline mr-1.5" />Member Penalties
        </button>
        <button
          onClick={() => setTab('fines')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'fines' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
          <AlertTriangle size={14} className="inline mr-1.5" />Fines Log
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {/* ── Penalties Tab ── */}
          {tab === 'penalties' && (
            <>
              {/* Overview cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{penaltySummary.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Total Members</p>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                  <p className="text-2xl font-bold text-red-500">{membersWithDebt}</p>
                  <p className="text-xs text-slate-500 mt-1">Members with Debt</p>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                  <p className="text-2xl font-bold text-amber-500">{totalUnpaid.toLocaleString()} ETB</p>
                  <p className="text-xs text-slate-500 mt-1">Total Unpaid</p>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                  <p className="text-2xl font-bold text-slate-700">{totalPenalties.toLocaleString()} ETB</p>
                  <p className="text-xs text-slate-500 mt-1">Total Penalties Issued</p>
                </div>
              </div>

              {/* Search */}
              <div className="mb-4">
                <input
                  className={inputClass}
                  placeholder="Search member by name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ maxWidth: 320 }}
                />
              </div>

              {summaryLoading ? <LoadingSpinner /> : (
                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="table-responsive">
                    <table>
                      <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Member</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Penalties Issued</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Unpaid Penalties</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Unpaid Fines</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Total Outstanding</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredSummary.length === 0 ? (
                        <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">No members found.</td></tr>
                      ) : filteredSummary.map((m) => (
                        <tr key={m.id} className={`hover:bg-slate-50 ${m.totalOutstanding > 0 ? '' : ''}`}>
                          <td className="px-5 py-3">
                            <p className="text-sm font-medium text-slate-800">{m.fullName}</p>
                            <p className="text-xs text-slate-400">#{m.memberId}</p>
                          </td>
                          <td className="px-5 py-3 text-right text-sm text-slate-600">{m.totalPenalties.toLocaleString()} ETB</td>
                          <td className="px-5 py-3 text-right text-sm">
                            <span className={m.unpaidPenalties > 0 ? 'text-red-500 font-semibold' : 'text-slate-400'}>
                              {m.unpaidPenalties.toLocaleString()} ETB
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-sm">
                            <span className={m.unpaidFines > 0 ? 'text-orange-500 font-semibold' : 'text-slate-400'}>
                              {m.unpaidFines.toLocaleString()} ETB
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {m.totalOutstanding > 0 ? (
                              <span className="font-bold text-red-600">{m.totalOutstanding.toLocaleString()} ETB</span>
                            ) : (
                              <span className="text-emerald-500 text-sm flex items-center justify-end gap-1">
                                <CheckCircle2 size={14} /> Clear
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {m.totalOutstanding > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">
                                {m.unpaidPenaltyCount} unpaid
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
                                All clear
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <button onClick={() => setDetailMember(m)}
                              className="px-2.5 py-1 border rounded-lg text-xs flex items-center gap-1 hover:bg-slate-100 text-slate-600">
                              <Eye size={11} /> Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Fines Log Tab ── */}
          {tab === 'fines' && (
            <>
              {/* Search */}
              <div className="mb-4">
                <input
                  className={inputClass}
                  placeholder="Search member by name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ maxWidth: 320 }}
                />
              </div>

              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="table-responsive">
                  <table>
                    <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Member</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      {isAdmin && <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {fines.filter((f) =>
                      search === '' ||
                      f.member.fullName.toLowerCase().includes(search.toLowerCase()) ||
                      f.member.memberId.toLowerCase().includes(search.toLowerCase())
                    ).length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">No fines found.</td></tr>
                    ) : fines.filter((f) =>
                      search === '' ||
                      f.member.fullName.toLowerCase().includes(search.toLowerCase()) ||
                      f.member.memberId.toLowerCase().includes(search.toLowerCase())
                    ).map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-medium">
                        {f.member.fullName}
                        <span className="text-xs text-slate-400 ml-1">({f.member.memberId})</span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">{f.fineType}</td>
                      <td className="px-6 py-3 text-sm font-semibold">{Number(f.amount).toLocaleString()} ETB</td>
                      <td className="px-6 py-3 text-sm text-slate-500">{f.reason}</td>
                      <td className="px-6 py-3 text-sm text-slate-400">{new Date(f.fineDate).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          f.isPaid
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                          {f.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-3">
                          <div className="flex gap-1.5">
                            {/* Mark as paid — only if unpaid */}
                            {!f.isPaid && (
                              <button
                                onClick={() => markFinePaid(f.id)}
                                title="Mark as Paid"
                                className="px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-600 text-xs flex items-center gap-1 hover:bg-emerald-50"
                              >
                                <CheckCheck size={11} /> Paid
                              </button>
                            )}
                            {/* Edit */}
                            <button
                              onClick={() => openEditFine(f)}
                              title="Edit Fine"
                              className="px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1 hover:bg-slate-50 text-slate-600"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                            {/* Delete — only if unpaid */}
                            {!f.isPaid && (
                              <button
                                onClick={() => { setDeleteFineId(f.id); setDeleteError(''); }}
                                title="Delete Fine"
                                className="px-2.5 py-1 rounded-lg border border-red-100 text-red-500 text-xs hover:bg-red-50"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  </tbody>
                </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Add Fine Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Fine">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Member *</label>
            <Select 
              value={form.memberId} 
              onChange={e => setForm({ ...form, memberId: e })}
              options={[{ value: '', label: '-- Select member --' }, ...members.map(m => ({ value: m.id, label: `${m.fullName} (${m.memberId})` }))]}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fine Type</label>
            <Select 
              value={form.fineType} 
              onChange={e => setForm({ ...form, fineType: e })}
              options={[
                { value: 'DISCIPLINARY', label: 'Disciplinary' },
                { value: 'ATTENDANCE', label: 'Attendance' },
                { value: 'OTHER', label: 'Other' }
              ]}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount (ETB) *</label>
            <input className={inputClass} type="number" placeholder="e.g. 50" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reason *</label>
            <textarea className={inputClass} placeholder="Reason for the fine" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-1">
            <button className={btnPrimary} onClick={createFine} disabled={creating || !form.memberId || !form.amount || !form.reason}>
              {creating ? 'Saving...' : 'Add Fine'}
            </button>
            <button className={btnSecondary} onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Edit Fine Modal */}
      <Modal open={!!editFine} onClose={() => setEditFine(null)} title="Edit Fine">
        {editFine && (
          <div className="space-y-3">
            <div className="px-4 py-3 bg-slate-50 rounded-xl border text-sm text-slate-600">
              Member: <strong>{editFine.member.fullName}</strong>
              {editFine.isPaid && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-600 border border-emerald-100">Paid — amount/type cannot be changed</span>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fine Type</label>
              <Select 
                value={editForm.fineType} 
                onChange={e => setEditForm({ ...editForm, fineType: e })}
                options={[
                  { value: 'DISCIPLINARY', label: 'Disciplinary' },
                  { value: 'ATTENDANCE', label: 'Attendance' },
                  { value: 'OTHER', label: 'Other' }
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount (ETB)</label>
              <input
                className={inputClass}
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                disabled={editFine.isPaid}
              />
              {editFine.isPaid && <p className="text-xs text-slate-400 mt-1">Amount cannot be changed once the fine is paid.</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reason</label>
              <textarea
                className={inputClass}
                rows={3}
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
              />
            </div>
            {editError && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{editError}</p>}
            <div className="flex gap-3 pt-1">
              <button className={btnPrimary} onClick={saveEditFine} disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button className={btnSecondary} onClick={() => setEditFine(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Fine Confirm Modal */}
      <Modal open={!!deleteFineId} onClose={() => { setDeleteFineId(null); setDeleteError(''); }} title="Delete Fine">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this fine? <span className="text-red-500">Only unpaid fines can be deleted.</span>
          </p>
          {deleteError && (
            <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{deleteError}</p>
          )}
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700" onClick={confirmDeleteFine}>
              Delete
            </button>
            <button className={btnSecondary} onClick={() => { setDeleteFineId(null); setDeleteError(''); }}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Member Penalty Detail Modal */}
      <Modal open={!!detailMember} onClose={() => setDetailMember(null)} title={detailMember ? `${detailMember.fullName} — Penalty Details` : ''} wide>
        {detailMember && (
          <div className="space-y-4">
            {/* Member summary row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-slate-700">{detailMember.totalPenalties.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Total ETB Issued</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-emerald-700">{detailMember.paidPenalties.toLocaleString()}</p>
                <p className="text-xs text-emerald-600">Paid (ETB)</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-red-600">{detailMember.unpaidPenalties.toLocaleString()}</p>
                <p className="text-xs text-red-500">Unpaid Penalties (ETB)</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-orange-600">{detailMember.unpaidFines.toLocaleString()}</p>
                <p className="text-xs text-orange-500">Unpaid Fines (ETB)</p>
              </div>
            </div>

            {/* Outstanding total */}
            {detailMember.totalOutstanding > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertTriangle size={16} className="text-red-500" />
                <span className="text-sm font-semibold text-red-700">
                  Total Outstanding: {detailMember.totalOutstanding.toLocaleString()} ETB
                </span>
              </div>
            )}

            {/* Recent Penalties */}
            {detailMember.recentPenalties.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Recent Penalties</h4>
                <div className="space-y-2">
                  {detailMember.recentPenalties.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-lg border">
                      <div>
                        <p className="text-sm text-slate-700">{p.reason}</p>
                        <p className="text-xs text-slate-400">{p.isMonthly ? 'Monthly penalty' : `Week ${p.weekNumber ?? '—'}, ${p.year ?? ''}`} · {new Date(p.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">{Number(p.amount).toLocaleString()} ETB</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          p.status === 'SETTLED' ? 'bg-emerald-50 text-emerald-600' :
                          p.status === 'WAIVED' ? 'bg-slate-100 text-slate-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {p.status === 'SETTLED' ? 'Settled' :
                           p.status === 'WAIVED' ? 'Waived' :
                           'Outstanding'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Fines */}
            {detailMember.recentFines.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Recent Fines</h4>
                <div className="space-y-2">
                  {detailMember.recentFines.map((f) => (
                    <div key={f.id} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-lg border">
                      <div>
                        <p className="text-sm text-slate-700">{f.reason}</p>
                        <p className="text-xs text-slate-400">{f.fineType} · {new Date(f.fineDate).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">{Number(f.amount).toLocaleString()} ETB</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${f.isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                          {f.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailMember.penaltyCount === 0 && detailMember.recentFines.length === 0 && (
              <div className="text-center py-6 text-slate-400">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400" />
                <p className="text-sm">No penalties or fines for this member.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
