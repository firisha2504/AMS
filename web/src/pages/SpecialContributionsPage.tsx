import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Eye, XCircle, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, Badge, LoadingSpinner, Modal, inputClass, btnPrimary, btnSecondary, Select, DateInput } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

interface Member { id: string; fullName: string; memberId: string; status: string; }
interface Obligation { id: string; amount: number; amountPaid: number; status: string; isExempt: boolean; member: { fullName: string; memberId: string }; }
interface Campaign {
  id: string; campaignId: string; type: string; title: string; titleOm?: string;
  description?: string; amount: number; status: string; dueDate?: string;
  beneficiaryMember?: { fullName: string; memberId: string };
  familyRelationship?: string;
  _count?: { obligations: number };
}

const FAMILY = ['SELF', 'FATHER', 'MOTHER', 'BROTHER', 'SISTER', 'UNCLE', 'AUNT'] as const;
const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GRADUATION: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  BEREAVEMENT: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  EMERGENCY: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
};

export default function SpecialContributionsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [createModal, setCreateModal] = useState<'graduation' | 'bereavement' | 'emergency' | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // View obligations modal
  const [viewCampaign, setViewCampaign] = useState<Campaign | null>(null);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loadingObs, setLoadingObs] = useState(false);

  // Delete / close confirm
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'close' | 'reopen'; id: string; title: string } | null>(null);
  const [actionError, setActionError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [c, m] = await Promise.all([
        api.get('/special-contributions'),
        api.get('/members', { params: { limit: 500 } }),
      ]);
      setCampaigns(c.data.data || []);
      setMembers(m.data.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── View obligations for a campaign ──
  const openView = async (c: Campaign) => {
    setViewCampaign(c);
    setLoadingObs(true);
    try {
      const { data } = await api.get(`/special-contributions/${c.id}`);
      setObligations(data.data.obligations || []);
    } finally { setLoadingObs(false); }
  };

  // ── Create ──
  const submit = async () => {
    if (!createModal) return;
    setCreateError('');
    setCreating(true);
    try {
      const endpoints = {
        graduation: '/special-contributions/graduation',
        bereavement: '/special-contributions/bereavement',
        emergency: '/special-contributions/emergency',
      };
      const body = createModal === 'emergency'
        ? { title: form.title, amount: Number(form.amount), dueDate: form.dueDate, description: form.description }
        : { beneficiaryMemberId: form.beneficiaryMemberId, familyRelationship: form.familyRelationship, dueDate: form.dueDate || undefined };
      await api.post(endpoints[createModal], body);
      setCreateModal(null);
      setForm({});
      load();
    } catch { setCreateError('Failed to create. Please check the form.'); }
    finally { setCreating(false); }
  };

  // ── Edit ──
  const openEdit = (c: Campaign) => {
    setEditCampaign(c);
    setEditForm({
      title: c.title,
      titleOm: c.titleOm || '',
      description: c.description || '',
      amount: String(c.amount),
      dueDate: c.dueDate ? c.dueDate.slice(0, 10) : '',
    });
    setEditError('');
  };

  const saveEdit = async () => {
    if (!editCampaign) return;
    setEditSaving(true);
    setEditError('');
    try {
      await api.patch(`/special-contributions/${editCampaign.id}`, {
        title: editForm.title,
        titleOm: editForm.titleOm || undefined,
        description: editForm.description || undefined,
        amount: Number(editForm.amount),
        dueDate: editForm.dueDate || undefined,
      });
      setEditCampaign(null);
      load();
    } catch { setEditError('Failed to update. Try again.'); }
    finally { setEditSaving(false); }
  };

  // ── Delete / Close / Reopen ──
  const doAction = async () => {
    if (!confirmAction) return;
    setActionError('');
    try {
      if (confirmAction.type === 'delete') {
        await api.delete(`/special-contributions/${confirmAction.id}`);
      } else if (confirmAction.type === 'close') {
        await api.patch(`/special-contributions/${confirmAction.id}/close`);
      } else {
        await api.patch(`/special-contributions/${confirmAction.id}`, { status: 'ACTIVE' });
      }
      setConfirmAction(null);
      load();
    } catch {
      setActionError(confirmAction.type === 'delete'
        ? 'Cannot delete — payments have already been recorded for this campaign.'
        : 'Action failed. Please try again.');
    }
  };

  const paidCount = (obs: Obligation[]) => obs.filter((o) => o.status === 'PAID' || o.status === 'PARTIAL').length;
  const totalCollected = (obs: Obligation[]) => obs.reduce((s, o) => s + Number(o.amountPaid), 0);

  return (
    <div>
      <PageHeader
        title={t('nav.specialContributions')}
        action={isAdmin && (
          <div className="flex gap-2">
            <button className={btnPrimary} onClick={() => { setCreateModal('graduation'); setForm({}); setCreateError(''); }}>
              <Plus size={15} className="inline mr-1" />Graduation
            </button>
            <button className={btnPrimary} onClick={() => { setCreateModal('bereavement'); setForm({}); setCreateError(''); }}>
              <Plus size={15} className="inline mr-1" />Bereavement
            </button>
            <button className={btnSecondary} onClick={() => { setCreateModal('emergency'); setForm({}); setCreateError(''); }}>
              <Plus size={15} className="inline mr-1" />Emergency
            </button>
          </div>
        )}
      />

      {loading ? <LoadingSpinner /> : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {['ACTIVE', 'CLOSED', 'GRADUATION', 'BEREAVEMENT'].map((key) => {
              const count = key === 'GRADUATION' || key === 'BEREAVEMENT'
                ? campaigns.filter((c) => c.type === key).length
                : campaigns.filter((c) => c.status === key).length;
              return (
                <div key={key} className="bg-white rounded-xl border p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{count}</p>
                  <p className="text-xs text-slate-500 mt-1 capitalize">{key.toLowerCase()}</p>
                </div>
              );
            })}
          </div>

          {/* Campaign cards */}
          {campaigns.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-slate-400">
              <Plus size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No special contributions yet</p>
              <p className="text-sm mt-1">Create a graduation, bereavement, or emergency contribution</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => {
                const colors = TYPE_COLORS[c.type] || TYPE_COLORS.EMERGENCY;
                return (
                  <div key={c.id} className="bg-white border rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4">
                    {/* Type badge */}
                    <div className="shrink-0">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                        {c.type}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-800 text-sm">{c.title}</h3>
                        <span className="text-xs text-slate-400 font-mono">#{c.campaignId}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                        <span><strong className="text-slate-700">{Number(c.amount).toLocaleString()} ETB</strong> per member</span>
                        {c.beneficiaryMember && <span>Beneficiary: <strong>{c.beneficiaryMember.fullName}</strong></span>}
                        {c.familyRelationship && <span>({c.familyRelationship})</span>}
                        {c.dueDate && <span>Due: {new Date(c.dueDate).toLocaleDateString()}</span>}
                        {c._count && <span>{c._count.obligations} members</span>}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="shrink-0">
                      <Badge status={c.status} />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => openView(c)}
                        className="px-3 py-1.5 border rounded-lg text-xs flex items-center gap-1 hover:bg-slate-50">
                        <Eye size={12} /> Obligations
                      </button>
                      {isAdmin && (
                        <>
                          {c.status === 'ACTIVE' && (
                            <button onClick={() => openEdit(c)}
                              className="px-3 py-1.5 border rounded-lg text-xs flex items-center gap-1 hover:bg-slate-50">
                              <Pencil size={12} /> Edit
                            </button>
                          )}
                          {c.status === 'ACTIVE' && (
                            <button onClick={() => setConfirmAction({ type: 'close', id: c.id, title: c.title })}
                              className="px-3 py-1.5 border border-amber-200 text-amber-600 rounded-lg text-xs flex items-center gap-1 hover:bg-amber-50">
                              <XCircle size={12} /> Close
                            </button>
                          )}
                          {c.status === 'CLOSED' && (
                            <button onClick={() => setConfirmAction({ type: 'reopen', id: c.id, title: c.title })}
                              className="px-3 py-1.5 border border-emerald-200 text-emerald-600 rounded-lg text-xs flex items-center gap-1 hover:bg-emerald-50">
                              <CheckCircle size={12} /> Reopen
                            </button>
                          )}
                          <button onClick={() => setConfirmAction({ type: 'delete', id: c.id, title: c.title })}
                            className="px-3 py-1.5 border border-red-100 text-red-500 rounded-lg text-xs hover:bg-red-50">
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <Modal open={!!createModal} onClose={() => setCreateModal(null)}
        title={`New ${createModal ? createModal.charAt(0).toUpperCase() + createModal.slice(1) : ''} Contribution`} wide>
        <div className="space-y-3">
          {createModal === 'emergency' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Title *</label>
                <input className={inputClass} placeholder="e.g. Flood Relief Fund" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount per Member (ETB) *</label>
                <input className={inputClass} type="number" placeholder="e.g. 100" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Due Date *</label>
                <DateInput value={form.dueDate || ''} onChange={val => setForm({ ...form, dueDate: val })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description</label>
                <textarea className={inputClass} placeholder="Optional description" rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Beneficiary Member *</label>
                <Select 
                  value={form.beneficiaryMemberId || ''}
                  onChange={e => setForm({ ...form, beneficiaryMemberId: e })}
                  options={[
                    { value: '', label: '-- Select member --' },
                    ...members.map(m => {
                      const statusLabel = m.status === 'GRADUATED' ? ' (Graduated)' : m.status === 'DECEASED' ? ' (Deceased)' : m.status === 'INACTIVE' ? ' (Inactive)' : '';
                      return { value: m.id, label: `${m.fullName} (${m.memberId})${statusLabel}` };
                    })
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  {createModal === 'graduation' ? 'Their Relationship (Optional)' : 'Deceased Relationship *'}
                </label>
                <Select 
                  value={form.familyRelationship || ''}
                  onChange={e => setForm({ ...form, familyRelationship: e })}
                  options={[
                    { value: '', label: '-- Select relationship --' },
                    ...FAMILY.map(f => ({ value: f, label: f }))
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Due Date (Optional)</label>
                <DateInput value={form.dueDate || ''} onChange={val => setForm({ ...form, dueDate: val })} />
              </div>
            </>
          )}
          {createError && <p className="text-red-500 text-xs">{createError}</p>}
          <div className="flex gap-3 pt-1">
            <button className={btnPrimary} onClick={submit} disabled={creating}>{creating ? 'Creating...' : 'Create Contribution'}</button>
            <button className={btnSecondary} onClick={() => setCreateModal(null)}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editCampaign} onClose={() => setEditCampaign(null)} title="Edit Contribution">
        {editCampaign && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Title (English)</label>
              <input className={inputClass} value={editForm.title || ''} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Title (Oromiffa)</label>
              <input className={inputClass} placeholder="Optional" value={editForm.titleOm || ''} onChange={(e) => setEditForm({ ...editForm, titleOm: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount per Member (ETB)</label>
              <input className={inputClass} type="number" value={editForm.amount || ''} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Due Date</label>
              <DateInput value={editForm.dueDate || ''} onChange={val => setEditForm({ ...editForm, dueDate: val })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description</label>
              <textarea className={inputClass} rows={3} value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            {editError && <p className="text-red-500 text-xs">{editError}</p>}
            <div className="flex gap-3 pt-1">
              <button className={btnPrimary} onClick={saveEdit} disabled={editSaving}>{editSaving ? 'Saving...' : 'Save Changes'}</button>
              <button className={btnSecondary} onClick={() => setEditCampaign(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Obligations View Modal */}
      <Modal open={!!viewCampaign} onClose={() => setViewCampaign(null)} title={viewCampaign ? `Obligations — ${viewCampaign.title}` : ''} wide>
        {loadingObs ? <LoadingSpinner /> : (
          <div>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-emerald-700">{paidCount(obligations)}</p>
                <p className="text-xs text-emerald-600">Paid</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-red-600">{obligations.filter(o => o.status === 'PENDING').length}</p>
                <p className="text-xs text-red-500">Pending</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-blue-700">{totalCollected(obligations).toLocaleString()} ETB</p>
                <p className="text-xs text-blue-600">Collected</p>
              </div>
            </div>

            {/* Table */}
            <div className="max-h-96 overflow-y-auto border rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Member</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Due</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Paid</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {obligations.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No obligations found</td></tr>
                  ) : obligations.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium">{o.member.fullName} <span className="text-xs text-slate-400">#{o.member.memberId}</span></td>
                      <td className="px-4 py-2.5 text-slate-600">{Number(o.amount).toLocaleString()} ETB</td>
                      <td className="px-4 py-2.5 text-emerald-600 font-medium">{Number(o.amountPaid).toLocaleString()} ETB</td>
                      <td className="px-4 py-2.5"><Badge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Action Modal */}
      <Modal open={!!confirmAction} onClose={() => { setConfirmAction(null); setActionError(''); }} title={
        confirmAction?.type === 'delete' ? 'Delete Contribution' :
        confirmAction?.type === 'close' ? 'Close Contribution' : 'Reopen Contribution'
      }>
        {confirmAction && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {confirmAction.type === 'delete' && <>Are you sure you want to <strong>permanently delete</strong> "<strong>{confirmAction.title}</strong>"? <span className="text-red-500">This cannot be undone. Only campaigns with no payments can be deleted.</span></>}
              {confirmAction.type === 'close' && <>Are you sure you want to <strong>close</strong> "<strong>{confirmAction.title}</strong>"? Members will no longer be required to pay.</>}
              {confirmAction.type === 'reopen' && <>Are you sure you want to <strong>reopen</strong> "<strong>{confirmAction.title}</strong>"? This will make it active again.</>}
            </p>
            {actionError && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{actionError}</p>}
            <div className="flex gap-3">
              <button
                className={`px-4 py-2 text-sm rounded-xl text-white ${confirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : confirmAction.type === 'close' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                onClick={doAction}>
                {confirmAction.type === 'delete' ? 'Delete' : confirmAction.type === 'close' ? 'Close Campaign' : 'Reopen Campaign'}
              </button>
              <button className={btnSecondary} onClick={() => { setConfirmAction(null); setActionError(''); }}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
