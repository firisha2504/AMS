import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { PageHeader, LoadingSpinner } from '../components/ui';

interface AuditLog {
  id: string; action: string; module: string; createdAt: string; ipAddress?: string;
  user?: { username?: string; role?: string };
}

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings/audit-logs', { params: { limit: 100 } }).then(({ data }) => {
      setLogs(data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title={t('nav.auditLogs')} />
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-4 text-sm">{log.user?.username || 'System'} ({log.user?.role || '—'})</td>
                  <td className="px-4 sm:px-6 py-4 text-sm font-mono text-xs">{log.action}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm">{log.module}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-400">{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
