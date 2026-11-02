import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const isOm = i18n.language === 'om';
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const needsPasswordChange = await login(identifier, password);
      navigate(needsPasswordChange ? '/change-password' : '/dashboard');
    } catch {
      setError(t('auth.loginFailed', 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #060e33 0%, #091540 40%, #0d1e5e 100%)' }}>
        
        {/* Community members network pattern - Same as home page */}
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2322c55e;stop-opacity:0.8' /%3E%3Cstop offset='100%25' style='stop-color:%23d97706;stop-opacity:0.8' /%3E%3C/linearGradient%3E%3C/defs%3E%3C!-- Savings/members circles --%3E%3Cg fill='url(%23grad)'%3E%3Ccircle cx='100' cy='100' r='20'/%3E%3Ccircle cx='300' cy='150' r='18'/%3E%3Ccircle cx='200' cy='250' r='22'/%3E%3Ccircle cx='350' cy='300' r='19'/%3E%3Ccircle cx='50' cy='300' r='16'/%3E%3Ccircle cx='150' cy='50' r='17'/%3E%3C/g%3E%3C!-- Connection lines between members --%3E%3Cg stroke='%2322c55e' stroke-width='2' stroke-opacity='0.4'%3E%3Cline x1='100' y1='100' x2='200' y2='250'/%3E%3Cline x1='100' y1='100' x2='300' y2='150'/%3E%3Cline x1='300' y1='150' x2='350' y2='300'/%3E%3Cline x1='200' y1='250' x2='50' y2='300'/%3E%3Cline x1='150' y1='50' x2='100' y2='100'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '400px 400px',
          backgroundRepeat: 'repeat',
        }} />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-15" style={{
          backgroundImage: 'linear-gradient(rgba(100,200,100,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(100,200,100,0.3) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Glow */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #22c55e, transparent)' }} />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #d97706, transparent)' }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg"
              style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#1e1b4b' }}>
              A
            </div>
            <span className="text-white font-semibold text-lg">Afosha MS</span>
          </div>

          {/* Center content */}
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              {isOm ? 'Tokkummaan' : 'Together'}<br />
              <span style={{
                background: 'linear-gradient(90deg, #fbbf24, #d97706)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {isOm ? 'Ciminaa fi Milkaayina' : 'Strength and Success'}
              </span>
            </h2>
            <p className="text-base leading-relaxed max-w-sm" style={{ color: '#bfdbfe' }}>
              {isOm
                ? 'Miseensota bulchuuf, kaffaltii hordoofuuf fi hawaasa cimsuuf sirna guutuu.'
                : 'A complete system for managing members, contributions, savings, and community.'}
            </p>
          </div>

          {/* Stats row */}
          <div className="flex gap-8">
            {[
              { label: isOm ? 'Miseensota' : 'Members', value: isOm ? 'Hojii Irra' : 'Active' },
              { label: isOm ? 'Kaffaltii' : 'Contributions', value: isOm ? 'Torbanii' : 'Weekly' },
              { label: isOm ? 'Gabaasa' : 'Reports', value: isOm ? 'Yeroo Hundaa' : 'Real-time' },
            ].map(({ label, value }) => (
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
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
              style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#1e1b4b' }}>
              A
            </div>
            <span className="text-white font-semibold text-lg">Afosha MS</span>
          </div>

          {/* Back button */}
          <Link to="/"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 transition-all border"
            style={{ color: '#93c5fd', borderColor: 'rgba(147,197,253,0.3)', background: 'rgba(147,197,253,0.08)' }}>
            <ArrowLeft size={13} />
            {isOm ? 'Fuula Duraatti Deebi\'i' : 'Back to Home'}
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">
              {t('auth.loginTitle', isOm ? 'Baga Nagaan Dhuftan' : 'Welcome back')}
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#cbd5e1' }}>
              {isOm ? 'Akkaawuntii keessan fayyadamaa seenaa' : 'Sign in to your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#93c5fd' }}>
                {t('auth.username')} / {t('auth.phone')}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={isOm ? 'admin ykn +251...' : 'admin or +251...'}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  '--tw-ring-color': 'rgba(96,165,250,0.5)',
                } as React.CSSProperties}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#93c5fd' }}>
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-12 py-3 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    '--tw-ring-color': 'rgba(96,165,250,0.5)',
                  } as React.CSSProperties}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#93c5fd' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="mt-2 text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium hover:underline"
                  style={{ color: '#93c5fd' }}
                >
                  {isOm ? 'Jecha iccitii dagatte?' : 'Forgot password?'}
                </Link>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-3 rounded-xl text-sm border border-red-500/20">
                <span>⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all duration-150"
              style={{ background: loading ? '#334155' : 'linear-gradient(135deg, #1e3a8a, #1d4ed8)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {isOm ? 'Seenaa jira...' : 'Signing in...'}
                </span>
              ) : t('auth.login')}
            </button>
          </form>

          <p className="text-center text-xs mt-8" style={{ color: '#cbd5e1' }}>
            Afosha Management System © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
