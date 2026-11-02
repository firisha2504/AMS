import { useTranslation } from 'react-i18next';
import { 
  Calendar, AlertTriangle, Clock, ShieldAlert, 
  Gift, HeartPulse, History, CheckCircle2, AlertCircle, Ban
} from 'lucide-react';

export interface CategoryMetric {
  key: string;
  nameEn: string;
  nameOm: string;
  totalOwed: number;
  totalPaid: number;
  remainingBalance: number;
  progressPercentage: number;
  paidCount: number;
  unpaidCount: number;
  partiallyPaidCount: number;
  overdueCount?: number;
  waivedCount?: number;
}

interface Props {
  metrics?: Record<string, CategoryMetric>;
  title?: string;
  subtitle?: string;
}

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  WEEKLY: {
    icon: Calendar,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  WEEKLY_PENALTY: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  MONTHLY_PENALTY: {
    icon: Clock,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
  OTHER_PENALTY: {
    icon: ShieldAlert,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  SPECIAL: {
    icon: Gift,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  EMERGENCY: {
    icon: HeartPulse,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  HISTORICAL: {
    icon: History,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
};

export default function CategoryMetricsOverview({ metrics, title, subtitle }: Props) {
  const { i18n } = useTranslation();
  const isOm = i18n.language === 'om';

  if (!metrics) return null;

  const categories = Object.values(metrics);
  if (categories.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {title || (isOm ? 'Gabaasa Kaffaltiiwwan Hunda (Gosoota 7)' : 'All 7 Payment Categories Overview')}
          </h2>
          <p className="text-xs text-gray-500">
            {subtitle || (isOm ? 'Kaffaltii tokkoon tokkoo addaan baasee hordofaa' : 'Independent tracking for each payment obligation category')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 font-semibold w-fit">
          <CheckCircle2 size={14} />
          <span>{isOm ? 'Kaffaltiiwwan Adda Bahanii Galmaa\'an' : 'ACID Isolated Allocations'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat.key] || {
            icon: Calendar,
            color: 'text-gray-600',
            bg: 'bg-gray-50',
            border: 'border-gray-200',
          };
          const Icon = cfg.icon;
          const progress = cat.progressPercentage ?? 0;
          const name = isOm ? cat.nameOm || cat.nameEn : cat.nameEn || cat.nameOm;

          return (
            <div
              key={cat.key}
              className={`rounded-xl border ${cfg.border} p-4 bg-white hover:shadow-md transition-all flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${cfg.bg} ${cfg.color}`}>
                      <Icon size={18} />
                    </div>
                    <span className="text-xs font-bold text-gray-900 line-clamp-1">{name}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    cat.remainingBalance <= 0 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {progress}%
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{isOm ? 'Waliigala Oowamaa:' : 'Total Owed:'}</span>
                    <span className="font-semibold text-gray-900">{cat.totalOwed.toLocaleString()} ETB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{isOm ? 'Kaffalame:' : 'Amount Paid:'}</span>
                    <span className="font-semibold text-emerald-600">+{cat.totalPaid.toLocaleString()} ETB</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-1">
                    <span className="text-gray-500 font-medium">{isOm ? 'Haftee:' : 'Remaining:'}</span>
                    <span className={`font-bold ${cat.remainingBalance > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                      {cat.remainingBalance.toLocaleString()} ETB
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      progress >= 100 ? 'bg-emerald-500' : progress > 50 ? 'bg-blue-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Obligation Count Badges */}
              <div className="flex flex-wrap gap-1.5 text-[11px] pt-2 border-t border-gray-100">
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 size={11} /> {cat.paidCount} {isOm ? 'Kaffalame' : 'Paid'}
                </span>
                {cat.partiallyPaidCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium flex items-center gap-1">
                    <AlertCircle size={11} /> {cat.partiallyPaidCount} {isOm ? 'Gariin' : 'Partial'}
                  </span>
                )}
                {cat.unpaidCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-medium flex items-center gap-1">
                    <AlertTriangle size={11} /> {cat.unpaidCount} {isOm ? 'Hin Kaffalamne' : 'Unpaid'}
                  </span>
                )}
                {(cat.waivedCount || 0) > 0 && (
                  <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium flex items-center gap-1">
                    <Ban size={11} /> {cat.waivedCount} {isOm ? 'Dhiifame' : 'Waived'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
