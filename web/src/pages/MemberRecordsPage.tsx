import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/ui';
import { Wallet, Calendar, UserPlus } from 'lucide-react';
import PaymentsPage from './PaymentsPage';
import ContributionsPage from './ContributionsPage';
import JoiningObligationsPage from './JoiningObligationsPage';

type Tab = 'payments' | 'contributions' | 'joining';

export default function MemberRecordsPage() {
  const [_t] = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('contributions');

  const tabs = [
    { id: 'contributions' as Tab, label: 'Weekly Contributions', icon: Calendar, color: 'blue' },
    { id: 'payments' as Tab, label: 'Payments', icon: Wallet, color: 'green' },
    { id: 'joining' as Tab, label: 'Joining Obligations', icon: UserPlus, color: 'purple' },
  ];

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
        {activeTab === 'contributions' && <ContributionsPage />}
        {activeTab === 'payments' && <PaymentsPage />}
        {activeTab === 'joining' && <JoiningObligationsPage />}
      </div>
    </div>
  );
}
