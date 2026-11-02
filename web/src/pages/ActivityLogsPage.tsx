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
    { id: 'history' as Tab, label: 'Transaction History', icon: History },
    { id: 'audit' as Tab, label: 'Audit Logs', icon: Shield },
  ];

  const tabStyles: Record<Tab, { active: string; icon: string }> = {
    history: { active: 'border-blue-500 text-blue-600 bg-blue-50/30', icon: 'text-blue-500' },
    audit: { active: 'border-purple-500 text-purple-600 bg-purple-50/30', icon: 'text-purple-500' },
  };

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
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'audit' && <AuditLogsPage />}
      </div>
    </div>
  );
}
