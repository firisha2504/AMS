import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Mail, Phone, Lock, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';

type Step = 'identifier' | 'otp' | 'newPassword' | 'success';

const inputClass = "w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all";
const inputStyle = {
  background: 'rgba(255,255,255,0.10)',
  border: '1px solid rgba(255,255,255,0.18)',
  ['--tw-ring-color' as string]: 'rgba(96,165,250,0.5)',
};
const labelStyle = { color: '#93c5fd' };
const labelClass = "block text-xs font-semibold uppercase tracking-wider mb-1.5";
const btnStyle = (loading: boolean) => ({
  background: loading ? '#334155' : 'linear-gradient(135deg, #1e3a8a, #1d4ed8)',
});

export default function ForgotPasswordPage() {
  const { i18n } = useTranslation();
  const isOm = i18n.language === 'om';
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [channel, setChannel] = useState<'SMS' | 'EMAIL'>('SMS');
  const [userId, setUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/request-otp', { identifier, purpose: 'PASSWORD_RESET', channel });
      setUserId(data.data.userId);
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Phone/Email not found. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { userId, code: otp, purpose: 'PASSWORD_RESET' });
      setStep('newPassword');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('Password must be at least 8 characters long.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { userId, code: otp, newPassword });
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #060e33 0%, #091540 40%, #0d1e5e 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg"
              style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#1e1b4b' }}>
              A
            </div>
            <span className="text-white font-semibold text-lg">Afosha MS</span>
          </div>

          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              {isOm ? 'Jecha Iccitii' : 'Password Recovery'}<br />
              <span style={{ background: 'linear-gradient(90deg, #fbbf24, #d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {isOm ? 'Irra Deebi\'ii Ijaaruuf' : 'Made Simple'}
              </span>
            </h2>
            <p className="text-base leading-relaxed max-w-sm" style={{ color: '#bfdbfe' }}>
              {isOm
                ? 'Bilbila ykn email keessan fayyadamuun jecha iccitii haaraa uumuu dandeessu.'
                : 'Reset your password securely using your registered phone number or email address.'}
            </p>
          </div>

          <div className="flex gap-8">
            {[
              { value: isOm ? 'Nageenyaan' : 'Secure', label: isOm ? 'OTP' : 'OTP Verification' },
              { value: isOm ? 'Ariifachiisa' : 'Fast', label: isOm ? 'Adeemsaa' : 'Process' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-white font-semibold text-sm">{value}</p>
                <p className="text-xs" style={{ color: '#93c5fd' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8" style={{ background: '#091540' }}>
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
              style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#1e1b4b' }}>
              A
            </div>
            <span className="text-white font-semibold text-lg">Afosha MS</span>
          </div>

          {/* Back button */}
          <Link to="/login"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 transition-all border"
            style={{ color: '#93c5fd', borderColor: 'rgba(147,197,253,0.3)', background: 'rgba(147,197,253,0.08)' }}>
            <ArrowLeft size={13} />
            {isOm ? 'Seensaatti Deebi\'i' : 'Back to Login'}
          </Link>

          {/* Step 1: identifier */}
          {step === 'identifier' && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">{isOm ? 'Jecha Iccitii Dagatte?' : 'Forgot Password?'}</h1>
                <p className="mt-1 text-sm" style={{ color: '#cbd5e1' }}>
                  {isOm ? 'Bilbila ykn email galchaa' : 'Enter your phone number or email to receive a verification code'}
                </p>
              </div>
              <form onSubmit={handleRequestOtp} className="space-y-4">
                {/* Channel toggle */}
                <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  {(['SMS', 'EMAIL'] as const).map((ch) => (
                    <button key={ch} type="button" onClick={() => setChannel(ch)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: channel === ch ? 'rgba(255,255,255,0.15)' : 'transparent',
                        color: channel === ch ? '#ffffff' : '#93c5fd',
                      }}>
                      {ch === 'SMS' ? <Phone size={15} /> : <Mail size={15} />}
                      {ch === 'SMS' ? (isOm ? 'Bilbila' : 'Phone (SMS)') : 'Email'}
                    </button>
                  ))}
                </div>

                <div>
                  <label className={labelClass} style={labelStyle}>
                    {channel === 'SMS' ? (isOm ? 'Lakkoofsa Bilbilaa' : 'Phone Number') : 'Email Address'}
                  </label>
                  <input type={channel === 'SMS' ? 'tel' : 'email'} value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={channel === 'SMS' ? '+251...' : 'your@email.com'}
                    className={inputClass} style={inputStyle} required />
                </div>

                {error && <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm border" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.2)' }}><span>⚠</span> {error}</div>}

                <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all" style={btnStyle(loading)}>
                  {loading ? (isOm ? 'Ergaa jira...' : 'Sending...') : (isOm ? 'Koodii Ergi' : 'Send Verification Code')}
                </button>
              </form>
            </>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">{isOm ? 'Koodii Mirkaneessi' : 'Verify Code'}</h1>
                <p className="mt-1 text-sm" style={{ color: '#cbd5e1' }}>
                  {isOm ? `Koodii gara ${channel === 'SMS' ? 'bilbilaa' : 'email'} keessanii ergame galchaa` : `Enter the 6-digit code sent to your ${channel === 'SMS' ? 'phone' : 'email'}`}
                </p>
                <p className="text-xs mt-1 font-mono" style={{ color: '#93c5fd' }}>{identifier}</p>
              </div>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className={labelClass} style={labelStyle}>{isOm ? 'Koodii Mirkaneessaa' : 'Verification Code'}</label>
                  <input type="text" value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456" maxLength={6}
                    className={`${inputClass} text-center font-mono text-lg tracking-widest`} style={inputStyle} required />
                </div>

                {error && <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm border" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.2)' }}><span>⚠</span> {error}</div>}

                <button type="submit" disabled={loading || otp.length !== 6} className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all" style={btnStyle(loading)}>
                  {loading ? (isOm ? 'Mirkaneessaa jira...' : 'Verifying...') : (isOm ? 'Mirkaneessi' : 'Verify Code')}
                </button>

                <button type="button" onClick={() => setStep('identifier')}
                  className="w-full py-2 text-sm transition-all" style={{ color: '#93c5fd' }}>
                  {isOm ? 'Koodii hin arganne? Irra deebi\'ii barbaadi' : "Didn't receive code? Try again"}
                </button>
              </form>
            </>
          )}

          {/* Step 3: New password */}
          {step === 'newPassword' && (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">{isOm ? 'Jecha Iccitii Haaraa Kaa\'i' : 'Set New Password'}</h1>
                <p className="mt-1 text-sm" style={{ color: '#cbd5e1' }}>{isOm ? 'Jecha iccitii cimaa filadhu' : 'Choose a strong password for your account'}</p>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className={labelClass} style={labelStyle}>{isOm ? 'Jecha Iccitii Haaraa' : 'New Password'}</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••" className={inputClass} style={inputStyle} required />
                  <p className="text-xs mt-1" style={{ color: '#93c5fd' }}>{isOm ? 'Yoo xiqqaate qubee 8' : 'At least 8 characters'}</p>
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>{isOm ? 'Jecha Iccitii Mirkaneessi' : 'Confirm Password'}</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" className={inputClass} style={inputStyle} required />
                </div>

                {error && <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm border" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.2)' }}><span>⚠</span> {error}</div>}

                <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all" style={btnStyle(loading)}>
                  {loading ? (isOm ? 'Jijjiraa jira...' : 'Resetting...') : (isOm ? "Jecha Iccitii Irra Deebi'ii Kaa'i" : 'Reset Password')}
                </button>
              </form>
            </>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)' }}>
                <CheckCircle2 size={40} style={{ color: '#60a5fa' }} />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">{isOm ? 'Milkaa\'e!' : 'Password Reset Successfully!'}</h1>
              <p className="text-sm mb-8" style={{ color: '#cbd5e1' }}>
                {isOm ? 'Jecha iccitii keessan jijjiirameera. Amma seenuu dandeessu.' : 'Your password has been reset. You can now sign in with your new password.'}
              </p>
              <button onClick={() => navigate('/login')}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all"
                style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)' }}>
                <Lock size={16} className="inline mr-2" />
                {isOm ? 'Amma Seeni' : 'Sign In Now'}
              </button>
            </div>
          )}

          <p className="text-center text-xs mt-8" style={{ color: '#94a3b8' }}>
            Afosha Management System © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
