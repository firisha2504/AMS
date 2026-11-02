import type { ReactNode } from 'react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, CreditCard, CalendarCheck, FileText,
  Bell, Settings, Database, Globe,
  ChevronRight, UserCircle, History,
  AlertCircle, Menu, X, Search, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface LayoutProps { children: ReactNode; }

const adminNav = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/members', icon: Users, labelKey: 'nav.members' },
  { to: '/records', icon: CreditCard, labelKey: 'Member Records' },
  { to: '/financial', icon: AlertCircle, labelKey: 'Penalties & Fines' },
  { to: '/attendance', icon: CalendarCheck, labelKey: 'nav.attendance' },
  { to: '/reports', icon: FileText, labelKey: 'nav.reports' },
  { to: '/logs', icon: History, labelKey: 'Audit & History' },
  { to: '/notifications', icon: Bell, labelKey: 'nav.notifications' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
  { to: '/backup', icon: Database, labelKey: 'nav.backup' },
  { to: '/team-management', icon: UserCircle, labelKey: 'Team Management' },
  { to: '/public-content', icon: Globe, labelKey: 'Public Content' },
];

const auditorNav = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/members', icon: Users, labelKey: 'nav.members' },
  { to: '/records', icon: CreditCard, labelKey: 'Member Records' },
  { to: '/financial', icon: AlertCircle, labelKey: 'Penalties & Fines' },
  { to: '/attendance', icon: CalendarCheck, labelKey: 'nav.attendance' },
  { to: '/reports', icon: FileText, labelKey: 'nav.reports' },
  { to: '/logs', icon: History, labelKey: 'Audit & History' },
  { to: '/notifications', icon: Bell, labelKey: 'nav.notifications' },
];

export default function Layout({ children }: LayoutProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const navItems = user?.role === 'ADMIN' ? adminNav : auditorNav;

  // Fetch logo on mount
  React.useEffect(() => {
    const fetchLogo = async () => {
      try {
        const { data } = await api.get('/settings/logo/info');
        console.log('Logo response:', data);
        if (data?.data?.logoPath) {
          const API_URL = import.meta.env.VITE_API_URL || '/api';
          const BASE = API_URL.replace('/api', '');
          const url = `${BASE}${data.data.logoPath}`;
          console.log('Setting logo URL:', url);
          setLogoUrl(url);
        }
      } catch (error) {
        console.error('Failed to fetch logo:', error);
      }
    };
    fetchLogo();
  }, []);

  const toggleLanguage = () => {
    const next = i18n.language === 'om' ? 'en' : 'om';
    i18n.changeLanguage(next);
    localStorage.setItem('language', next);
  };

  // Get profile picture URL
  const API_URL = import.meta.env.VITE_API_URL || '/api';
  const BASE = API_URL.replace('/api', '');
  const profilePictureUrl = user?.role === 'MEMBER' 
    ? (user?.member?.profilePicture ? `${BASE}${user.member.profilePicture}` : null)
    : (user?.profilePicture ? `${BASE}${user.profilePicture}` : null);
  
  const userInitial = (user?.username || user?.phone || 'U')[0].toUpperCase();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 fixed lg:relative inset-y-0 left-0 z-50 w-64 flex flex-col shrink-0 transition-transform duration-300 ease-in-out bg-[#0a2540]`}>

        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="App Logo"
                className="w-10 h-10 rounded-lg object-contain bg-white/5 p-1.5"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-green-500 to-emerald-600">
                A
              </div>
            )}
            <div>
              <h1 className="text-white font-bold text-base tracking-tight">AFOSHA</h1>
              <p className="text-gray-400 text-xs font-medium">MANAGEMENT SYSTEM</p>
            </div>
          </div>
          
          {/* Close button for mobile */}
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-white border-l-4 border-green-500 pl-3'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white hover:pl-4'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={19} className={isActive ? 'text-green-400' : 'text-gray-400 group-hover:text-gray-300'} />
                  <span className="flex-1">{t(labelKey)}</span>
                  {isActive && <ChevronRight size={16} className="text-green-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer tagline */}
        <div className="px-4 pb-6 pt-3 border-t border-white/10 bg-gradient-to-br from-teal-900/40 to-emerald-900/40 rounded-lg mx-3 mb-3">
          <div className="flex items-start gap-2">
            <div className="mt-1">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-100 leading-tight">Together for a</p>
              <p className="text-sm font-bold text-emerald-100 leading-tight">Stronger Future</p>
              <p className="text-xs text-emerald-200/70 mt-2 font-medium">Afosha Management System</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between gap-4">
          
          {/* Left side - Hamburger + Search */}
          <div className="flex items-center gap-3 flex-1 max-w-2xl">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-all"
            >
              <Menu size={20} />
            </button>

            {/* Search bar */}
            <div className="relative flex-1 hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Search members, payments, or anything..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>
          </div>
          
          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button 
              onClick={() => navigate('/notifications')}
              className="relative z-20 p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
              title="Notifications"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Language Toggle */}
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 border border-gray-200 transition-all"
            >
              <Globe size={16} />
              <span className="hidden sm:inline">{i18n.language === 'om' ? 'English' : 'Oromoo'}</span>
              <ChevronDown size={14} className="hidden sm:inline" />
            </button>

            {/* User Profile Menu */}
            <div className="relative">
              <button 
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all border border-gray-200"
              >
                {profilePictureUrl ? (
                  <img 
                    src={profilePictureUrl} 
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = document.createElement('div');
                        fallback.className = 'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold bg-gradient-to-br from-green-500 to-emerald-600';
                        fallback.textContent = userInitial;
                        parent.insertBefore(fallback, target);
                      }
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold bg-gradient-to-br from-green-500 to-emerald-600">
                    {userInitial}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-900">{user?.role === 'ADMIN' ? 'Admin' : user?.role}</p>
                  <p className="text-xs text-gray-500">{user?.role === 'ADMIN' ? 'System Administrator' : 'Auditor'}</p>
                </div>
                <ChevronDown size={16} className="text-gray-400 hidden md:inline" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
