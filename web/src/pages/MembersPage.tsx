import { useEffect, useState } from 'react';
import { UserPlus, Plus, Pencil, Trash2, KeyRound, ShieldCheck, Users, UserCog, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, Badge, LoadingSpinner, Modal, inputClass, btnPrimary, btnSecondary, Select, DateInput } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Member {
  id: string; memberId: string; fullName: string; status: string;
  registrationDate: string;
  user: { phone?: string; email?: string; isActive?: boolean };
}

interface Auditor {
  id: string; username?: string; phone?: string; email?: string;
  role: string; isActive: boolean; createdAt: string; profilePicture?: string;
}

type Tab = 'members' | 'auditors';

const STATUS_FILTERS = ['', 'PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED', 'INACTIVE', 'GRADUATED', 'DECEASED'];

const emptyMemberForm = {
  fullName: '', gender: 'MALE', dateOfBirth: '', phone: '', email: '',
  address: '', occupation: '', password: '',
  emergencyContact: { fullName: '', relationship: '', phone: '', address: '' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [tab, setTab] = useState<Tab>('members');

  // ── Members state ──
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState(emptyMemberForm);
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [addedMember, setAddedMember] = useState<{ memberId: string; fullName: string; phone: string; password: string } | null>(null);

  // ── Auditors state ──
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [auditorsLoading, setAuditorsLoading] = useState(false);
  const [showCreateAuditor, setShowCreateAuditor] = useState(false);
  const [auditorForm, setAuditorForm] = useState({ username: '', fullName: '', phone: '', email: '', password: '', confirmPassword: '' });
  const [auditorSaving, setAuditorSaving] = useState(false);
  const [auditorError, setAuditorError] = useState('');
  const [editAuditor, setEditAuditor] = useState<Auditor | null>(null);
  const [editAuditorForm, setEditAuditorForm] = useState({ username: '', phone: '', email: '', isActive: true });
  const [editAuditorError, setEditAuditorError] = useState('');
  const [editAuditorSaving, setEditAuditorSaving] = useState(false);
  const [resetAuditor, setResetAuditor] = useState<Auditor | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [deleteAuditorId, setDeleteAuditorId] = useState<string | null>(null);
  const [deleteAuditorError, setDeleteAuditorError] = useState('');
  const [showMemberPw, setShowMemberPw] = useState(false);
  const [showAuditorPw, setShowAuditorPw] = useState(false);
  const [showAuditorConfirmPw, setShowAuditorConfirmPw] = useState(false);
  const [showResetPw, setShowResetPw] = useState(false);

  // ── Fetch members ──
  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      const { data } = await api.get('/members', {
        params: { search: search || undefined, status: statusFilter || undefined, limit: 200 },
      });
      setMembers(data.data || []);
    } finally { setMembersLoading(false); }
  };

  // ── Fetch auditors ──
  const fetchAuditors = async () => {
    setAuditorsLoading(true);
    try {
      const { data } = await api.get('/members/auditors');
      setAuditors(data.data || []);
    } catch { setAuditors([]); }
    finally { setAuditorsLoading(false); }
  };

  useEffect(() => { fetchMembers(); }, [statusFilter]);
  useEffect(() => { if (tab === 'auditors' && isAdmin) fetchAuditors(); }, [tab]);
  // Fetch auditors on initial mount to show correct count in tab badge
  useEffect(() => { if (isAdmin) fetchAuditors(); }, []);

  // ── Member actions ──
  const handleApprove = async (id: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'INACTIVE' | 'GRADUATED' | 'DECEASED') => {
    await api.patch(`/members/${id}/approve`, { status });
    fetchMembers();
  };

  const handleAddMember = async () => {
    setMemberSaving(true); setMemberError('');
    try {
      const payload = {
        ...memberForm,
        emergencyContact: memberForm.emergencyContact.fullName ? memberForm.emergencyContact : undefined,
      };
      const { data } = await api.post('/members/admin-register', payload);
      setAddedMember(data.data);
      setShowAddMember(false);
      setMemberForm(emptyMemberForm);
      fetchMembers();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMemberError(msg || 'Failed to register. Phone may already exist.');
    } finally { setMemberSaving(false); }
  };

  const setEC = (field: string, value: string) =>
    setMemberForm(f => ({ ...f, emergencyContact: { ...f.emergencyContact, [field]: value } }));

  // ── Auditor actions ──
  const createAuditor = async () => {
    setAuditorSaving(true); setAuditorError('');
    if (!auditorForm.username) { setAuditorError('Username is required.'); setAuditorSaving(false); return; }
    if (!auditorForm.fullName) { setAuditorError('Full name is required.'); setAuditorSaving(false); return; }
    if (!auditorForm.phone || auditorForm.phone.length < 10) { 
      setAuditorError('Phone number is required (min 10 characters).'); 
      setAuditorSaving(false); 
      return; 
    }
    if (!auditorForm.email || !auditorForm.email.includes('@')) { 
      setAuditorError('Valid email is required.'); 
      setAuditorSaving(false); 
      return; 
    }
    if (!auditorForm.password || auditorForm.password.length < 8) {
      setAuditorError('Password must be at least 8 characters.'); setAuditorSaving(false); return;
    }
    if (auditorForm.password !== auditorForm.confirmPassword) {
      setAuditorError('Passwords do not match.'); setAuditorSaving(false); return;
    }
    try {
      await api.post('/members/auditors', {
        username: auditorForm.username,
        fullName: auditorForm.fullName,
        phone: auditorForm.phone,
        email: auditorForm.email,
        password: auditorForm.password,
      });
      setShowCreateAuditor(false);
      setAuditorForm({ username: '', fullName: '', phone: '', email: '', password: '', confirmPassword: '' });
      fetchAuditors();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAuditorError(msg || 'Failed to create auditor. Username/phone/email may already exist.');
    } finally { setAuditorSaving(false); }
  };

  const openEditAuditor = (a: Auditor) => {
    setEditAuditor(a);
    setEditAuditorForm({ username: a.username || '', phone: a.phone || '', email: a.email || '', isActive: a.isActive });
    setEditAuditorError('');
  };

  const saveEditAuditor = async () => {
    if (!editAuditor) return;
    setEditAuditorSaving(true); setEditAuditorError('');
    try {
      await api.patch(`/members/auditors/${editAuditor.id}`, editAuditorForm);
      setEditAuditor(null);
      fetchAuditors();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditAuditorError(msg || 'Update failed. Username/phone/email may already exist.');
    } finally { setEditAuditorSaving(false); }
  };

  const doResetPassword = async () => {
    if (!resetAuditor) return;
    setResetError('');
    if (!newPassword || newPassword.length < 8) { setResetError('Password must be at least 8 characters.'); return; }
    try {
      await api.patch(`/members/auditors/${resetAuditor.id}/reset-password`, { newPassword });
      setResetAuditor(null);
      setNewPassword('');
    } catch { setResetError('Failed to reset password.'); }
  };

  const doDeleteAuditor = async () => {
    if (!deleteAuditorId) return;
    setDeleteAuditorError('');
    try {
      await api.delete(`/members/auditors/${deleteAuditorId}`);
      setDeleteAuditorId(null);
      fetchAuditors();
    } catch { setDeleteAuditorError('Failed to delete auditor.'); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Members & Staff"
        action={isAdmin && (
          <div className="flex gap-2">
            {tab === 'members' && (
              <button className={btnPrimary} onClick={() => { setShowAddMember(true); setMemberError(''); }}>
                <UserPlus size={15} className="inline mr-1" />Add Member
              </button>
            )}
            {tab === 'auditors' && (
              <button className={btnPrimary} onClick={() => { setShowCreateAuditor(true); setAuditorError(''); }}>
                <Plus size={15} className="inline mr-1" />Create Auditor
              </button>
            )}
          </div>
        )}
      />

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('members')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'members' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
          <Users size={15} />Members
          <span className="px-1.5 py-0.5 rounded-full text-xs bg-slate-200 text-slate-600">{members.length}</span>
        </button>
        {isAdmin && (
          <button onClick={() => setTab('auditors')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'auditors' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <UserCog size={15} />Auditors
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-slate-200 text-slate-600">{auditors.length}</span>
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MEMBERS TAB                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {tab === 'members' && (
        <>
          {/* Info banner explaining storage */}
          <div className="mb-4 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <Users size={16} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">
              <strong>Members</strong> are stored in the <code className="bg-blue-100 px-1 rounded">Member</code> table linked to a <code className="bg-blue-100 px-1 rounded">User</code> account.
              They use the <strong>mobile app</strong> to view their data and make contributions.
            </p>
          </div>

          {/* Filters */}
          <div className="mb-5 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
            <input type="text" placeholder="Search by name, ID, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchMembers()}
              className={`${inputClass} flex-1 min-w-0 sm:max-w-sm`} />
            <Select 
              value={statusFilter} 
              onChange={setStatusFilter}
              options={STATUS_FILTERS.map(s => ({ value: s, label: s || 'All Statuses' }))}
            />
            <button className={btnSecondary} onClick={fetchMembers}>Search</button>
          </div>

          {/* Summary counts */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            {[
              { label: 'Total', count: members.length, color: '#64748b' },
              { label: 'Approved', count: members.filter(m => m.status === 'APPROVED').length, color: '#16a34a' },
              { label: 'Pending', count: members.filter(m => m.status === 'PENDING').length, color: '#ca8a04' },
              { label: 'Rejected', count: members.filter(m => m.status === 'REJECTED').length, color: '#dc2626' },
              { label: 'Suspended', count: members.filter(m => m.status === 'SUSPENDED').length, color: '#7c3aed' },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-xl border p-3 text-center">
                <p className="text-xl font-bold" style={{ color: c.color }}>{c.count}</p>
                <p className="text-xs text-slate-500">{c.label}</p>
              </div>
            ))}
          </div>

          {membersLoading ? <LoadingSpinner /> : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="table-responsive">
                <table>
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Member ID</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Full Name</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Phone</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Registered</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                  {members.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">No members found.</td></tr>
                  ) : members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-xs font-mono text-slate-500">{m.memberId}</td>
                      <td className="px-5 py-3 text-sm font-medium text-slate-800">{m.fullName}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{m.user.phone || '—'}</td>
                      <td className="px-5 py-3 text-xs text-slate-400">{new Date(m.registrationDate).toLocaleDateString()}</td>
                      <td className="px-5 py-3"><Badge status={m.status} /></td>
                      <td className="px-5 py-3">
                        {isAdmin && (
                          <div className="flex gap-2">
                            {/* PENDING status actions */}
                            {m.status === 'PENDING' && (
                              <>
                                <button onClick={() => handleApprove(m.id, 'APPROVED')}
                                  className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 flex items-center gap-1">
                                  <CheckCircle2 size={11} /> Approve
                                </button>
                                <button onClick={() => handleApprove(m.id, 'REJECTED')}
                                  className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 flex items-center gap-1">
                                  <XCircle size={11} /> Reject
                                </button>
                              </>
                            )}
                            
                            {/* APPROVED status actions */}
                            {m.status === 'APPROVED' && (
                              <div className="flex gap-2">
                                <button onClick={() => handleApprove(m.id, 'SUSPENDED')}
                                  className="px-3 py-1 border border-slate-200 text-slate-500 text-xs rounded-lg hover:bg-slate-50">
                                  Suspend
                                </button>
                                <button onClick={() => handleApprove(m.id, 'GRADUATED')}
                                  className="px-3 py-1 border border-blue-200 text-blue-600 text-xs rounded-lg hover:bg-blue-50">
                                  Mark Graduated
                                </button>
                                <button onClick={() => handleApprove(m.id, 'DECEASED')}
                                  className="px-3 py-1 border border-purple-200 text-purple-600 text-xs rounded-lg hover:bg-purple-50">
                                  Mark Deceased
                                </button>
                              </div>
                            )}
                            
                            {/* SUSPENDED status actions */}
                            {m.status === 'SUSPENDED' && (
                              <>
                                <button onClick={() => handleApprove(m.id, 'APPROVED')}
                                  className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 flex items-center gap-1">
                                  <CheckCircle2 size={11} /> Approve
                                </button>
                                <button onClick={() => handleApprove(m.id, 'REJECTED')}
                                  className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 flex items-center gap-1">
                                  <XCircle size={11} /> Reject
                                </button>
                              </>
                            )}
                            
                            {/* REJECTED status actions */}
                            {m.status === 'REJECTED' && (
                              <button onClick={() => handleApprove(m.id, 'APPROVED')}
                                className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 flex items-center gap-1">
                                <CheckCircle2 size={11} /> Approve
                              </button>
                            )}

                            {/* GRADUATED status actions */}
                            {m.status === 'GRADUATED' && (
                              <button onClick={() => handleApprove(m.id, 'APPROVED')}
                                className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 flex items-center gap-1">
                                <CheckCircle2 size={11} /> Reactivate
                              </button>
                            )}

                            {/* DECEASED status actions */}
                            {m.status === 'DECEASED' && (
                              <button onClick={() => handleApprove(m.id, 'APPROVED')}
                                className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 flex items-center gap-1">
                                <CheckCircle2 size={11} /> Reactivate
                              </button>
                            )}
                          </div>
                        )}
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* AUDITORS TAB                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {tab === 'auditors' && isAdmin && (
        <>
          {/* Info banner explaining storage */}
          <div className="mb-4 flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
            <ShieldCheck size={16} className="text-purple-500 mt-0.5 shrink-0" />
            <p className="text-xs text-purple-700">
              <strong>Auditors</strong> are stored in the <code className="bg-purple-100 px-1 rounded">User</code> table only (role = AUDITOR) — <strong>no Member record</strong>.
              They use the <strong>web portal</strong> to record payments, attendance, and view reports. They cannot manage members or settings.
            </p>
          </div>

          {auditorsLoading ? <LoadingSpinner /> : (
            <>
              {auditors.length === 0 ? (
                <div className="bg-white rounded-xl border p-12 text-center">
                  <UserCog size={36} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500 font-medium">No auditors yet</p>
                  <p className="text-xs text-slate-400 mt-1">Click "Create Auditor" to add one</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="table-responsive">
                    <table>
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Username</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Phone</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Created</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                      {auditors.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                                {(a.username || a.phone || 'A')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{a.username || '—'}</p>
                                <p className="text-xs text-slate-400">AUDITOR</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-500">{a.phone || '—'}</td>
                          <td className="px-5 py-3 text-sm text-slate-500">{a.email || '—'}</td>
                          <td className="px-5 py-3 text-xs text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${a.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                              {a.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-1.5">
                              <button onClick={() => openEditAuditor(a)}
                                className="px-2.5 py-1 border rounded-lg text-xs flex items-center gap-1 hover:bg-slate-50">
                                <Pencil size={11} /> Edit
                              </button>
                              <button onClick={() => { setResetAuditor(a); setNewPassword(''); setResetError(''); }}
                                className="px-2.5 py-1 border border-amber-100 text-amber-600 rounded-lg text-xs flex items-center gap-1 hover:bg-amber-50">
                                <KeyRound size={11} /> Reset PW
                              </button>
                              <button onClick={() => { setDeleteAuditorId(a.id); setDeleteAuditorError(''); }}
                                className="px-2.5 py-1 border border-red-100 text-red-500 rounded-lg text-xs hover:bg-red-50">
                                <Trash2 size={11} />
                              </button>
                            </div>
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
        </>
      )}

      {/* ══════════════════════════════ MODALS ══════════════════════════════ */}

      {/* Add Member */}
      <Modal open={showAddMember} onClose={() => { setShowAddMember(false); setMemberError(''); }} title="Add New Member">
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
            Member will be <strong>approved immediately</strong> and can log in to the mobile app.
          </p>
          <div className="font-medium text-sm text-slate-700 pt-1">Personal Information</div>
          <input className={inputClass} placeholder="Full Name *" value={memberForm.fullName} onChange={(e) => setMemberForm(f => ({ ...f, fullName: e.target.value }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Select 
              value={memberForm.gender} 
              onChange={e => setMemberForm(f => ({ ...f, gender: e }))}
              options={[
                { value: 'MALE', label: 'Male' },
                { value: 'FEMALE', label: 'Female' },
                { value: 'OTHER', label: 'Other' }
              ]}
            />
            <DateInput value={memberForm.dateOfBirth} onChange={val => setMemberForm(f => ({ ...f, dateOfBirth: val }))} label="Date of Birth *" />
          </div>
          <input className={inputClass} placeholder="Phone * (e.g. +251911234567)" value={memberForm.phone} onChange={(e) => setMemberForm(f => ({ ...f, phone: e.target.value }))} />
          <input className={inputClass} placeholder="Email (optional)" value={memberForm.email} onChange={(e) => setMemberForm(f => ({ ...f, email: e.target.value }))} />
          <input className={inputClass} placeholder="Address" value={memberForm.address} onChange={(e) => setMemberForm(f => ({ ...f, address: e.target.value }))} />
          <input className={inputClass} placeholder="Occupation" value={memberForm.occupation} onChange={(e) => setMemberForm(f => ({ ...f, occupation: e.target.value }))} />
          <div className="font-medium text-sm text-slate-700 pt-1">Login Password</div>
          <div className="relative">
            <input className={`${inputClass} pr-10`} placeholder="Password * (min 8 characters)" type={showMemberPw ? 'text' : 'password'} value={memberForm.password} onChange={(e) => setMemberForm(f => ({ ...f, password: e.target.value }))} />
            <button type="button" onClick={() => setShowMemberPw(!showMemberPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              {showMemberPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="font-medium text-sm text-slate-700 pt-1">Emergency Contact (optional)</div>
          <input className={inputClass} placeholder="Emergency Contact Name" value={memberForm.emergencyContact.fullName} onChange={(e) => setEC('fullName', e.target.value)} />
          <input className={inputClass} placeholder="Relationship (e.g. Brother)" value={memberForm.emergencyContact.relationship} onChange={(e) => setEC('relationship', e.target.value)} />
          <input className={inputClass} placeholder="Emergency Phone" value={memberForm.emergencyContact.phone} onChange={(e) => setEC('phone', e.target.value)} />
          {memberError && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{memberError}</p>}
          <div className="flex gap-3 pt-1">
            <button className={btnPrimary} onClick={handleAddMember} disabled={memberSaving}>
              {memberSaving ? 'Saving...' : 'Add Member'}
            </button>
            <button className={btnSecondary} onClick={() => setShowAddMember(false)}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Added Member Success */}
      <Modal open={!!addedMember} onClose={() => setAddedMember(null)} title="✅ Member Added Successfully">
        {addedMember && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Share these credentials with the member so they can log in to the <strong>mobile app</strong>:</p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2.5">
              {[
                { label: 'Member ID', value: addedMember.memberId },
                { label: 'Phone', value: addedMember.phone },
                { label: 'Password', value: addedMember.password },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
                  <span className="text-sm font-mono font-bold text-slate-800 bg-white px-2.5 py-0.5 rounded-lg border">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              ⚠ Save this password now — it will not be shown again.
            </p>
            <button className={btnPrimary} onClick={() => setAddedMember(null)}>Done</button>
          </div>
        )}
      </Modal>

      {/* Create Auditor */}
      <Modal open={showCreateAuditor} onClose={() => setShowCreateAuditor(false)} title="Create Auditor Account">
        <div className="space-y-3">
          <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 text-xs text-purple-700">
            An <strong>Auditor</strong> can record payments, attendance, view reports — but <strong>cannot</strong> manage members, settings, or system config.
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Full Name *</label>
            <input className={inputClass} placeholder="e.g. John Doe" value={auditorForm.fullName} onChange={(e) => setAuditorForm({ ...auditorForm, fullName: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Username *</label>
            <input className={inputClass} placeholder="e.g. auditor1" value={auditorForm.username} onChange={(e) => setAuditorForm({ ...auditorForm, username: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone *</label>
            <input className={inputClass} placeholder="+251..." value={auditorForm.phone} onChange={(e) => setAuditorForm({ ...auditorForm, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email *</label>
            <input className={inputClass} type="email" placeholder="email@example.com" value={auditorForm.email} onChange={(e) => setAuditorForm({ ...auditorForm, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Password * (min 8 characters)</label>
            <div className="relative">
              <input className={`${inputClass} pr-10`} type={showAuditorPw ? 'text' : 'password'} placeholder="••••••••" value={auditorForm.password} onChange={(e) => setAuditorForm({ ...auditorForm, password: e.target.value })} />
              <button type="button" onClick={() => setShowAuditorPw(!showAuditorPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showAuditorPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Confirm Password *</label>
            <div className="relative">
              <input className={`${inputClass} pr-10`} type={showAuditorConfirmPw ? 'text' : 'password'} placeholder="••••••••" value={auditorForm.confirmPassword} onChange={(e) => setAuditorForm({ ...auditorForm, confirmPassword: e.target.value })} />
              <button type="button" onClick={() => setShowAuditorConfirmPw(!showAuditorConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showAuditorConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {auditorError && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{auditorError}</p>}
          <div className="flex gap-3 pt-1">
            <button className={btnPrimary} onClick={createAuditor} disabled={auditorSaving}>
              {auditorSaving ? 'Creating...' : 'Create Auditor'}
            </button>
            <button className={btnSecondary} onClick={() => setShowCreateAuditor(false)}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Edit Auditor */}
      <Modal open={!!editAuditor} onClose={() => setEditAuditor(null)} title="Edit Auditor">
        {editAuditor && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Username</label>
              <input className={inputClass} value={editAuditorForm.username} onChange={(e) => setEditAuditorForm({ ...editAuditorForm, username: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone</label>
              <input className={inputClass} value={editAuditorForm.phone} onChange={(e) => setEditAuditorForm({ ...editAuditorForm, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email</label>
              <input className={inputClass} value={editAuditorForm.email} onChange={(e) => setEditAuditorForm({ ...editAuditorForm, email: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">Account Active</label>
              <button
                onClick={() => setEditAuditorForm({ ...editAuditorForm, isActive: !editAuditorForm.isActive })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editAuditorForm.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${editAuditorForm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-xs text-slate-500">{editAuditorForm.isActive ? 'Active — can log in' : 'Inactive — blocked from login'}</span>
            </div>
            {editAuditorError && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{editAuditorError}</p>}
            <div className="flex gap-3 pt-1">
              <button className={btnPrimary} onClick={saveEditAuditor} disabled={editAuditorSaving}>
                {editAuditorSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button className={btnSecondary} onClick={() => setEditAuditor(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reset Password */}
      <Modal open={!!resetAuditor} onClose={() => setResetAuditor(null)} title="Reset Auditor Password">
        {resetAuditor && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Resetting password for <strong>{resetAuditor.username || resetAuditor.phone}</strong></p>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">New Password *</label>
              <div className="relative">
                <input className={`${inputClass} pr-10`} type={showResetPw ? 'text' : 'password'} placeholder="Min 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <button type="button" onClick={() => setShowResetPw(!showResetPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showResetPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {resetError && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{resetError}</p>}
            <div className="flex gap-3 pt-1">
              <button className={btnPrimary} onClick={doResetPassword}>Reset Password</button>
              <button className={btnSecondary} onClick={() => setResetAuditor(null)}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Auditor */}
      <Modal open={!!deleteAuditorId} onClose={() => setDeleteAuditorId(null)} title="Delete Auditor">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to <strong>permanently delete</strong> this auditor account?
            They will immediately lose all access to the system.
          </p>
          {deleteAuditorError && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{deleteAuditorError}</p>}
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700" onClick={doDeleteAuditor}>Delete</button>
            <button className={btnSecondary} onClick={() => setDeleteAuditorId(null)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
