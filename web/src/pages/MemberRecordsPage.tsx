import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/ui';
import { Wallet, Calendar, UserPlus, CalendarDays } from 'lucide-react';
import PaymentsPage from './PaymentsPage';
import ContributionsPage from './ContributionsPage';
import JoiningObligationsPage from './JoiningObligationsPage';
import WeeklyPeriodManagementPage from './admin/WeeklyPeriodManagementPage';

type Tab = 'periods' | 'contributions' | 'payments' | 'joining';

export default function MemberRecordsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('periods');

  const tabs = [
    { id: 'periods' as Tab, label: t('records.weeklyPeriodManagement', { defaultValue: 'Weekly Period Management' }), icon: CalendarDays },
    { id: 'contributions' as Tab, label: t('records.weeklyContributions', { defaultValue: 'Weekly Contributions' }), icon: Calendar },
    { id: 'payments' as Tab, label: t('records.payments', { defaultValue: 'Payments' }), icon: Wallet },
    { id: 'joining' as Tab, label: t('records.joiningObligations', { defaultValue: 'Joining Obligations' }), icon: UserPlus },
  ];

  const tabStyles: Record<Tab, { active: string; icon: string }> = {
    periods: { active: 'border-emerald-500 text-emerald-700 bg-emerald-50/40', icon: 'text-emerald-600' },
    contributions: { active: 'border-blue-500 text-blue-600 bg-blue-50/30', icon: 'text-blue-500' },
    payments: { active: 'border-emerald-500 text-emerald-600 bg-emerald-50/30', icon: 'text-emerald-500' },
    joining: { active: 'border-purple-500 text-purple-600 bg-purple-50/30', icon: 'text-purple-500' },
  };

  return (
    <div>
      <PageHeader title="Member Records" />
      
      {/* Tabs */}
      <div className="bg-white rounded-xl border mb-6">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? tabStyles[tab.id].active
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <Icon size={20} className={isActive ? tabStyles[tab.id].icon : 'text-gray-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'periods' && <WeeklyPeriodManagementPage />}
        {activeTab === 'contributions' && <ContributionsPage />}
        {activeTab === 'payments' && <PaymentsPage />}
        {activeTab === 'joining' && <JoiningObligationsPage />}
      </div>
    </div>
  );
}
