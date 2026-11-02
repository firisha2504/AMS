import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Lock, User, Phone, Mail, MapPin, Briefcase, Shield, Edit, Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, inputClass, btnPrimary, btnSecondary, Card, LoadingSpinner } from '../components/ui';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const BASE = API_URL.replace('/api', '');

interface MemberProfile {
  id: string;
  memberId: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  address?: string;
  occupation?: string;
  profilePicture?: string;
  status: string;
  registrationDate: string;
  user: { phone?: string; email?: string; preferredLanguage: string };
  emergencyContact?: { fullName: string; relationship: string; phone: string; address?: string };
}

interface AccountProfile {
  id: string;
  username?: string;
  phone?: string;
  email?: string;
  role: string;
  profilePicture?: string;
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMember = user?.role === 'MEMBER';

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'edit' | 'password' | 'picture'>('info');

  // Admin/Auditor edit form
  const [editForm, setEditForm] = useState({ username: '', phone: '', email: '' });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Password change
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [showPws, setShowPws] = useState<Record<string, boolean>>({});

  // Profile picture
  const fileRef = useRef<HTMLInputElement>(null);
  const [picSaving, setPicSaving] = useState(false);
  const [picMsg, setPicMsg] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      if (isMember) {
        const { data } = await api.get('/members/me');
        setProfile(data.data);
      } else {
        const { data } = await api.get('/members/me/account');
        setAccount(data.data);
        setEditForm({
          username: data.data.username || '',
          phone: data.data.phone || '',
          email: data.data.email || '',
        });
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleEditSave = async () => {
    setEditError(''); setEditSuccess(''); setEditSaving(true);
    try {
      const body: Record<string, string> = {};
      const orig = account;
      if (editForm.username && editForm.username !== orig?.username) body.username = editForm.username;
      if (editForm.phone && editForm.phone !== orig?.phone) body.phone = editForm.phone;
      if (editForm.email && editForm.email !== orig?.email) body.email = editForm.email;
      if (Object.keys(body).length === 0) { setEditSuccess('No changes to save'); setEditSaving(false); return; }
      await api.patch('/members/me/account', body);
      setEditSuccess('Profile updated successfully');
      fetchProfile();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditError(msg || 'Update failed. Username/phone/email may already be in use.');
    } finally { setEditSaving(false); }
  };

  const handlePasswordChange = async () => {
    setPwError(''); setPwSuccess('');
    if (pwForm.newPassword !== pwForm.confirm) { setPwError('New passwords do not match'); return; }
    if (pwForm.newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setPwSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwSuccess('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPwError(msg || 'Failed to change password. Check your current password.');
    } finally { setPwSaving(false); }
  };

  const handleUploadPicture = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setPicSaving(true); setPicMsg('');
    try {
      const formData = new FormData();
      formData.append('picture', file);
      const token = localStorage.getItem('accessToken');
      const lang = localStorage.getItem('language') || 'om';
      const res = await fetch(`${API_URL}/members/me/profile-picture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Accept-Language': lang },
        body: formData,
      });
      const json = await res.json();
      if (json.success) { 
        setPicMsg('Profile picture updated successfully'); 
        setPreview(null); 
        fetchProfile();
        
        // Update user in AuthContext and localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser && json.data?.profilePicture) {
          const userData = JSON.parse(storedUser);
          if (userData.role === 'MEMBER' && userData.member) {
            userData.member.profilePicture = json.data.profilePicture;
          } else {
            userData.profilePicture = json.data.profilePicture;
          }
          localStorage.setItem('user', JSON.stringify(userData));
          // Force page reload to update AuthContext
          window.location.reload();
        }
      }
      else setPicMsg(json.message || 'Upload failed');
    } catch { setPicMsg('Upload failed. Please try again.'); }
    finally { setPicSaving(false); }
  };

  // Determine picture URL
  const pictureUrl = preview
    || (isMember && profile?.profilePicture ? `${BASE}${profile.profilePicture}` : null)
    || (!isMember && account?.profilePicture ? `${BASE}${account.profilePicture}` : null);

  const displayName = isMember
    ? (profile?.fullName || user?.phone || 'User')
    : (account?.username || account?.phone || user?.username || 'User');

  const tabs = [
    { key: 'info', label: 'Profile Info', icon: User },
    { key: 'edit', label: 'Edit Profile', icon: Edit },
    { key: 'password', label: 'Change Password', icon: Lock },
    { key: 'picture', label: 'Profile Picture', icon: Camera },
  ] as const;

  return (
    <div>
      <PageHeader title={t('nav.profile')} subtitle="Manage your account settings" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Left — avatar card */}
        <div className="lg:col-span-1">
          <Card className="p-6 flex flex-col items-center text-center">
            <div className="relative mb-4">
              {pictureUrl ? (
                <img src={pictureUrl} alt="Profile"
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-green-100" />
              ) : (
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold ring-4 ring-green-100"
                  style={{ background: 'linear-gradient(135deg, #166534, #d97706)' }}>
                  {displayName[0].toUpperCase()}
                </div>
              )}
              <button onClick={() => setTab('picture')}
                className="absolute -bottom-1 -right-1 w-8 h-8 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                style={{ background: '#166534' }}>
                <Camera size={14} />
              </button>
            </div>

            <h3 className="font-semibold text-slate-900">{displayName}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{user?.role}</p>
            {profile && (
              <span className="mt-2 text-xs bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2.5 py-0.5 rounded-full font-medium">
                {profile.memberId}
              </span>
            )}

            {/* Tab nav */}
            <div className="w-full mt-6 space-y-1">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setTab(key as typeof tab)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                    tab === key ? 'text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  style={tab === key ? { background: 'linear-gradient(135deg, #166534, #15803d)' } : {}}>
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right — content */}
        <div className="lg:col-span-3">
          {loading ? <LoadingSpinner /> : (
            <>
              {/* ── Info Tab ── */}
              {tab === 'info' && (
                <Card className="p-6">
                  <h2 className="text-base font-semibold text-slate-900 mb-5">Account Information</h2>

                  {/* Admin/Auditor */}
                  {!isMember && account && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InfoRow icon={User} label="Username" value={account.username || '—'} />
                      <InfoRow icon={Phone} label="Phone" value={account.phone || '—'} />
                      <InfoRow icon={Mail} label="Email" value={account.email || '—'} />
                      <InfoRow icon={Shield} label="Role" value={account.role} />
                    </div>
                  )}

                  {/* Member */}
                  {isMember && profile && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InfoRow icon={User} label="Full Name" value={profile.fullName} />
                        <InfoRow icon={User} label="Member ID" value={profile.memberId} />
                        <InfoRow icon={Phone} label="Phone" value={profile.user.phone || '—'} />
                        <InfoRow icon={Mail} label="Email" value={profile.user.email || '—'} />
                        <InfoRow icon={User} label="Gender" value={profile.gender} />
                        <InfoRow icon={User} label="Date of Birth" value={new Date(profile.dateOfBirth).toLocaleDateString()} />
                        <InfoRow icon={MapPin} label="Address" value={profile.address || '—'} />
                        <InfoRow icon={Briefcase} label="Occupation" value={profile.occupation || '—'} />
                        <InfoRow icon={User} label="Status" value={profile.status} />
                        <InfoRow icon={User} label="Registration Date" value={new Date(profile.registrationDate).toLocaleDateString()} />
                      </div>
                      {profile.emergencyContact && (
                        <div className="border-t border-slate-100 mt-6 pt-6">
                          <h3 className="text-sm font-semibold text-slate-700 mb-4">Emergency Contact</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InfoRow icon={User} label="Name" value={profile.emergencyContact.fullName} />
                            <InfoRow icon={User} label="Relationship" value={profile.emergencyContact.relationship} />
                            <InfoRow icon={Phone} label="Phone" value={profile.emergencyContact.phone} />
                            <InfoRow icon={MapPin} label="Address" value={profile.emergencyContact.address || '—'} />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </Card>
              )}

              {/* ── Edit Tab ── */}
              {tab === 'edit' && (
                <Card className="p-6">
                  <h2 className="text-base font-semibold text-slate-900 mb-5">
                    {isMember ? 'Edit Profile' : 'Edit Account'}
                  </h2>

                  {/* Admin/Auditor edit */}
                  {!isMember && (
                    <div className="max-w-md space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Username</label>
                        <input className={inputClass} value={editForm.username}
                          onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
                        <input className={inputClass} value={editForm.phone}
                          onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                        <input className={inputClass} value={editForm.email} type="email"
                          onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                      </div>
                      {editError && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100">
                          ⚠ {editError}
                        </div>
                      )}
                      {editSuccess && (
                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl text-sm border border-emerald-100">
                          ✓ {editSuccess}
                        </div>
                      )}
                      <div className="flex gap-3 pt-2">
                        <button className={btnPrimary} onClick={handleEditSave} disabled={editSaving}>
                          {editSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button className={btnSecondary} onClick={() => fetchProfile()}>Reset</button>
                      </div>
                    </div>
                  )}

                  {/* Member: redirect to mobile app note */}
                  {isMember && (
                    <div className="text-center py-8 text-slate-500">
                      <Edit size={32} className="mx-auto mb-3 text-slate-300" />
                      <p className="text-sm">Members can edit their full profile from the <strong>mobile app</strong> → Profile → Edit tab.</p>
                    </div>
                  )}
                </Card>
              )}

              {/* ── Password Tab ── */}
              {tab === 'password' && (
                <Card className="p-6">
                  <h2 className="text-base font-semibold text-slate-900 mb-5">Change Password</h2>
                  <div className="max-w-md space-y-4">
                    {[
                      { label: 'Current Password', key: 'currentPassword' },
                      { label: 'New Password', key: 'newPassword' },
                      { label: 'Confirm New Password', key: 'confirm' },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
                        <div className="relative">
                          <input type={showPws[key] ? 'text' : 'password'} className={`${inputClass} pr-10`} placeholder="••••••••"
                            value={pwForm[key as keyof typeof pwForm]}
                            onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))} />
                          <button
                            type="button"
                            onClick={() => setShowPws(prev => ({ ...prev, [key]: !prev[key] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showPws[key] ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    ))}
                    {pwError && <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100">⚠ {pwError}</div>}
                    {pwSuccess && <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl text-sm border border-emerald-100">✓ {pwSuccess}</div>}
                    <div className="flex gap-3 pt-2">
                      <button className={btnPrimary} onClick={handlePasswordChange} disabled={pwSaving}>
                        {pwSaving ? 'Saving...' : 'Update Password'}
                      </button>
                      <button className={btnSecondary} onClick={() => setPwForm({ currentPassword: '', newPassword: '', confirm: '' })}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </Card>
              )}

              {/* ── Picture Tab ── */}
              {tab === 'picture' && (
                <Card className="p-6">
                  <h2 className="text-base font-semibold text-slate-900 mb-5">Profile Picture</h2>
                  <div className="max-w-sm space-y-5">
                    <div className="flex items-center gap-5">
                      {pictureUrl ? (
                        <img src={pictureUrl} alt="Preview" className="w-24 h-24 rounded-2xl object-cover ring-2 ring-slate-200" />
                      ) : (
                        <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-bold"
                          style={{ background: 'linear-gradient(135deg, #166534, #d97706)' }}>
                          {displayName[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-700">Upload new photo</p>
                        <p className="text-xs text-slate-400 mt-0.5">JPEG, PNG or GIF · Max 5 MB</p>
                      </div>
                    </div>

                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-green-400 transition-colors cursor-pointer"
                      onClick={() => fileRef.current?.click()}>
                      <Camera size={24} className="mx-auto text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500">Click to choose a file</p>
                      <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) setPreview(URL.createObjectURL(f)); }} />
                    </div>

                    {picMsg && (
                      <div className={`px-4 py-3 rounded-xl text-sm border ${
                        picMsg.includes('success')
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-red-50 text-red-700 border-red-100'
                      }`}>{picMsg}</div>
                    )}

                    <button className={btnPrimary} onClick={handleUploadPicture}
                      disabled={picSaving || !preview}>
                      {picSaving ? 'Uploading...' : 'Upload Photo'}
                    </button>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
        <Icon size={14} className="text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm text-slate-800 font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
