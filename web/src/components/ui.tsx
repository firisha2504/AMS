import type { ReactNode } from 'react';
import { useState, useRef, useEffect } from 'react';

// ── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  color?: string;
  trend?: string;
  trendUp?: boolean;
}

export function StatCard({ title, value, icon, color = 'from-primary-500 to-primary-600', trend, trendUp }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2">{title}</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 leading-none break-words">{value}</p>
          {trend && (
            <p className={`text-xs mt-1.5 sm:mt-2 font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        {icon && (
          <div className={`bg-gradient-to-br ${color} p-2.5 sm:p-3 rounded-lg sm:rounded-xl text-white shadow-sm shrink-0`}>
            <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page Header ───────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-slate-500 mt-1 text-sm">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
interface BadgeProps { status: string; }

const statusStyles: Record<string, string> = {
  PENDING:  'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  SUSPENDED:'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  INACTIVE: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  GRADUATED: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  DECEASED: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  VERIFIED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  OVERDUE:  'bg-red-50 text-red-700 ring-1 ring-red-200',
  PAID:     'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  PARTIAL:  'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
};

export function Badge({ status }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyles[status] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}>
      {status}
    </span>
  );
}

// ── Loading Spinner ───────────────────────────────────────────────────────────
export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-10 h-10 border-3 border-slate-200 border-t-green-600 rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div
        className={`bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} my-auto flex flex-col`}
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-sm sm:text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all text-base sm:text-lg font-light">
            ✕
          </button>
        </div>
        {/* Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
        <span className="text-2xl">📭</span>
      </div>
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
export function Table({ headers, children, empty }: {
  headers: string[];
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {headers.map((h) => (
                <th key={h} className="px-3 sm:px-6 py-3 sm:py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {empty
              ? <tr><td colSpan={headers.length} className="px-3 sm:px-6 py-12 sm:py-16 text-center text-slate-400 text-sm">No data found</td></tr>
              : children
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ── Date Input Helper ────────────────────────────────────────────────────────
export function DateInput({ 
  value, 
  onChange, 
  label, 
  required = false 
}: { 
  value: string; 
  onChange: (val: string) => void;
  label?: string;
  required?: boolean;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Format: YYYY-MM-DD
    if (val.length <= 10) {
      onChange(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    if (e.key === 'Backspace') return;
    
    if (target.value.length === 4 || target.value.length === 7) {
      if (e.key !== '-') {
        e.preventDefault();
        onChange(target.value + '-');
      }
    }
  };

  return (
    <div>
      {label && <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{label}{required ? ' *' : ''}</label>}
      <input 
        type="text"
        inputMode="numeric"
        placeholder="YYYY-MM-DD"
        className={inputClass}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        maxLength={10}
      />
    </div>
  );
}

// ── Time Input Helper ────────────────────────────────────────────────────────
export function TimeInput({ 
  value, 
  onChange, 
  label 
}: { 
  value: string; 
  onChange: (val: string) => void;
  label?: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length <= 5) {
      onChange(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    if (e.key === 'Backspace') return;
    
    if (target.value.length === 2) {
      if (e.key !== ':') {
        e.preventDefault();
        onChange(target.value + ':');
      }
    }
  };

  return (
    <div>
      {label && <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{label}</label>}
      <input 
        type="text"
        inputMode="numeric"
        placeholder="HH:MM"
        className={inputClass}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        maxLength={5}
      />
    </div>
  );
}

// ── Mobile-Safe Select Component ────────────────────────────────────────────────
interface SelectProps {
  value: string;
  onChange: (val: string) => void;
  options: Array<{ value: string; label: string }>;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function Select({ value, onChange, options, label, placeholder, className = '' }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const selectedLabel = options.find(o => o.value === value)?.label || placeholder || 'Select...';

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${inputClass} w-full text-left flex items-center justify-between ${className}`}
        style={{ minHeight: '44px' }}
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>{selectedLabel}</span>
        <span className="text-slate-400">▼</span>
      </button>
      
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 hover:bg-slate-100 flex items-center ${
                value === option.value ? 'bg-slate-50 text-primary-600 font-semibold' : 'text-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const btnPrimary = [
  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white',
  'bg-gradient-to-r from-green-700 to-green-600 shadow-sm',
  'hover:from-green-800 hover:to-green-700 hover:shadow-md',
  'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150',
].join(' ');

export const btnSecondary = [
  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700',
  'bg-white border border-slate-200 shadow-sm',
  'hover:bg-slate-50 hover:border-slate-300',
  'disabled:opacity-50 transition-all duration-150',
].join(' ');

export const btnDanger = [
  'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white',
  'bg-red-600 hover:bg-red-700 shadow-sm disabled:opacity-50 transition-all duration-150',
].join(' ');

export const inputClass = [
  'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900',
  'placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500',
  'transition-all duration-150',
].join(' ');
