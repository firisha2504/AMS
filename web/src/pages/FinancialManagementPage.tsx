import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/ui';
import { DollarSign, AlertCircle, Gift } from 'lucide-react';
import PenaltiesPage from './PenaltiesPage';
import FinesPage from './FinesPage';
import SpecialContributionsPage from './SpecialContributionsPage';

type Tab = 'penalties' | 'fines' | 'special';

export default function FinancialManagementPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('penalties');

  const tabs = [
    { id: 'penalties' as Tab, label: t('Penalties', { defaultValue: 'Penalties' }), icon: AlertCircle },
    { id: 'fines' as Tab, label: t('Fines', { defaultValue: 'Fines' }), icon: DollarSign },
    { id: 'special' as Tab, label: t('Special Contributions', { defaultValue: 'Special Contributions' }), icon: Gift },
  ];

  const tabStyles: Record<Tab, { active: string; icon: string }> = {
    penalties: { active: 'border-red-500 text-red-600 bg-red-50/30', icon: 'text-red-500' },
    fines: { active: 'border-amber-500 text-amber-600 bg-amber-50/30', icon: 'text-amber-500' },
    special: { active: 'border-emerald-500 text-emerald-600 bg-emerald-50/30', icon: 'text-emerald-500' },
  };

  return (
    <div>
      <PageHeader title={t('Financial Management', { defaultValue: 'Financial Management' })} />
      
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
        {activeTab === 'penalties' && <PenaltiesPage />}
        {activeTab === 'fines' && <FinesPage />}
        {activeTab === 'special' && <SpecialContributionsPage />}
      </div>
    </div>
  );
}
