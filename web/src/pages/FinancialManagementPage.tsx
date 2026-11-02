import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/ui';
import { DollarSign, AlertCircle, Gift } from 'lucide-react';
import PenaltiesPage from './PenaltiesPage';
import FinesPage from './FinesPage';
import SpecialContributionsPage from './SpecialContributionsPage';

type Tab = 'penalties' | 'fines' | 'special';

export default function FinancialManagementPage() {
  const [_t] = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('penalties');

  const tabs = [
    { id: 'penalties' as Tab, label: 'Penalties', icon: AlertCircle, color: 'red' },
    { id: 'fines' as Tab, label: 'Fines', icon: DollarSign, color: 'orange' },
    { id: 'special' as Tab, label: 'Special Contributions', icon: Gift, color: 'green' },
  ];

  return (
    <div>
      <PageHeader title="Financial Management" />
      
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
                className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? `border-${tab.color}-500 text-${tab.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={20} />
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
