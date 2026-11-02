import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Eye, EyeOff } from 'lucide-react';

const inputClass = "w-full pl-4 pr-10 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all";
const inputStyle = {
  background: 'rgba(255,255,255,0.10)',
  border: '1px solid rgba(255,255,255,0.18)',
  ['--tw-ring-color' as string]: 'rgba(96,165,250,0.5)',
};

export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const { clearMustChangePassword } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError(t('auth.passwordMismatch', 'Passwords do not match')); return; }
    if (newPassword.length < 8) { setError(t('auth.passwordTooShort', 'Password must be at least 8 characters')); return; }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      clearMustChangePassword();
      navigate('/dashboard');
    } catch {
      setError(t('auth.changePasswordFailed', 'Failed to change password. Please check your current password.'));
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: t('auth.currentPassword', 'Current Password'), value: currentPassword, setter: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
    { label: t('auth.newPassword', 'New Password'), value: newPassword, setter: setNewPassword, show: showNew, toggle: () => setShowNew(!showNew) },
    { label: t('auth.confirmPassword', 'Confirm New Password'), value: confirmPassword, setter: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4" style={{ background: '#091540' }}>
      <div className="w-full max-w-md rounded-xl sm:rounded-2xl border p-6 sm:p-8" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(217,119,6,0.15)', border: '1px solid rgba(217,119,6,0.3)' }}>
            <span className="text-2xl">🔑</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {t('auth.changePasswordTitle', 'Change Your Password')}
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#cbd5e1' }}>
            {t('auth.changePasswordSubtitle', 'You must change your password before continuing.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(({ label, value, setter, show, toggle }) => (
            <div key={label}>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#93c5fd' }}>
                {label}
              </label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                  required
                />
                <button type="button" onClick={toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#93c5fd' }}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm border"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.2)' }}>
              ⚠ {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
            style={{ background: loading ? '#334155' : 'linear-gradient(135deg, #1e3a8a, #1d4ed8)' }}>
            {loading ? t('common.loading', 'Loading...') : t('auth.changePassword', 'Change Password')}
          </button>
        </form>
      </div>
    </div>
  );
}
