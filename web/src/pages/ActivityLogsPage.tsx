import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/ui';
import { History, Shield } from 'lucide-react';
import HistoryPage from './HistoryPage';
import AuditLogsPage from './AuditLogsPage';

type Tab = 'history' | 'audit';

export default function ActivityLogsPage() {
  const [_t] = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('history');

  const tabs = [
    { id: 'history' as Tab, label: 'Transaction History', icon: History, color: 'blue' },
    { id: 'audit' as Tab, label: 'Audit Logs', icon: Shield, color: 'purple' },
  ];

  return (
    <div>
      <PageHeader title="Activity Logs" />
      
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
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'audit' && <AuditLogsPage />}
      </div>
    </div>
  );
}
