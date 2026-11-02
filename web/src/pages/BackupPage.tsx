import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, RotateCcw, AlertCircle, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, LoadingSpinner, btnPrimary, btnSecondary } from '../components/ui';

interface Backup { id: string; filename: string; fileSize: number; type: string; createdAt: string; }

export default function BackupPage() {
  const { t } = useTranslation();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = () => {
    api.get('/settings/backups').then(({ data }) => {
      setBackups(data.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createBackup = async () => {
    setCreating(true);
    try {
      await api.post('/settings/backups');
      load();
    } finally {
      setCreating(false);
    }
  };

  const restore = async (id: string) => {
    if (!confirm('Restore settings, member balances, and payment records from this backup?')) return;
    try {
      const { data } = await api.post(`/settings/backups/${id}/restore`);
      const result = data.data;
      alert(`Restored: ${result.settingsRestored} settings, ${result.membersRestored} members, ${result.paymentsRestored} payments`);
      load();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to restore backup');
    }
  };

  const resetDatabase = async () => {
    if (!confirm('⚠️ WARNING: This will DELETE ALL member data!\n\nMembers, payments, penalties, and attendance will be permanently deleted.\n\nAn automatic backup will be created first.\n\nAre you sure?')) return;
    
    if (!confirm('🚨 FINAL CONFIRMATION REQUIRED\n\nThis action CANNOT be undone!\n\nClick OK to permanently reset the database.')) return;

    setResetting(true);
    try {
      const { data } = await api.post('/settings/reset-database', { confirm: true });
      alert(`✅ Database reset successful!\n\nBackup created: ${data.data.backupFile}\n\nAll member data has been cleared.`);
      load();
    } catch (error: any) {
      alert(`❌ Error: ${error.response?.data?.message || 'Failed to reset database'}`);
    } finally {
      setResetting(false);
    }
  };

  const formatSize = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

  return (
    <div>
      <PageHeader
        title={t('nav.backup')}
        action={<button className={btnPrimary} onClick={createBackup} disabled={creating}><Database size={16} className="inline mr-1" />{creating ? t('common.loading') : 'Create Backup'}</button>}
      />
      
      {/* Reset Database Section */}
      <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">Reset Database</h3>
            <p className="text-red-800 text-sm mb-3">
              Permanently delete all member data, payments, penalties, and attendance records. 
              An automatic backup will be created before reset. This action cannot be undone!
            </p>
            <button 
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2"
              onClick={resetDatabase}
              disabled={resetting}
            >
              <Trash2 size={16} />
              {resetting ? 'Resetting...' : 'Reset Database'}
            </button>
          </div>
        </div>
      </div>

      {/* Backups Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {backups.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 sm:px-6 py-4 text-sm font-mono">{b.filename}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm">{b.type}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm">{formatSize(b.fileSize)}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm">{new Date(b.createdAt).toLocaleString()}</td>
                  <td className="px-4 sm:px-6 py-4">
                    <button className={btnSecondary} onClick={() => restore(b.id)}><RotateCcw size={14} className="inline mr-1" />Restore</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
