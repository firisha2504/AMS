import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, RotateCcw, AlertCircle, Trash2, CheckCircle2, XCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, LoadingSpinner, btnPrimary, btnSecondary, Modal } from '../components/ui';

interface Backup {
  id: string;
  filename: string;
  fileSize: number;
  type: string;
  createdAt: string;
}

export default function BackupPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'om';

  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Restore Modal State
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);

  // Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState('');

  // Status/Alert Modal State (replacing browser alert)
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    open: false,
    type: 'info',
    title: '',
    message: '',
  });

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
      setAlertModal({
        open: true,
        type: 'success',
        title: lang === 'en' ? 'Backup Created' : 'Kuusaan Uumameera',
        message: lang === 'en' 
          ? 'System backup created successfully and stored securely.' 
          : 'Kuusaan sirnaa milkaa\'inaan uumamee olkaa\'ameera.',
      });
      load();
    } catch (error: any) {
      setAlertModal({
        open: true,
        type: 'error',
        title: lang === 'en' ? 'Backup Failed' : 'Kuusaan Hin Milkoofne',
        message: error.response?.data?.message || (lang === 'en' ? 'Failed to create backup.' : 'Kuusaa uumuun hin danda\'amne.'),
      });
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      const { data } = await api.post(`/settings/backups/${restoreTarget.id}/restore`);
      const result = data.data;
      setRestoreTarget(null);
      setAlertModal({
        open: true,
        type: 'success',
        title: lang === 'en' ? 'Restore Completed' : 'Deebisuun Milkaa\'eera',
        message: lang === 'en'
          ? `Restored: ${result.settingsRestored} settings, ${result.membersRestored} members, ${result.paymentsRestored} payments.`
          : `Deebi\'aniiru: Qindaa\'ina ${result.settingsRestored}, Miseensota ${result.membersRestored}, Kaffaltiiwwan ${result.paymentsRestored}.`,
      });
      load();
    } catch (error: any) {
      setAlertModal({
        open: true,
        type: 'error',
        title: lang === 'en' ? 'Restore Failed' : 'Deebisuun Hin Milkoofne',
        message: error.response?.data?.message || (lang === 'en' ? 'Failed to restore backup.' : 'Kuusaa deebisuun hin danda\'amne.'),
      });
    } finally {
      setRestoring(false);
    }
  };

  const handleConfirmReset = async () => {
    setResetting(true);
    try {
      const { data } = await api.post('/settings/reset-database', { confirm: true });
      setShowResetModal(false);
      setResetConfirmationText('');
      setAlertModal({
        open: true,
        type: 'success',
        title: lang === 'en' ? 'Database Reset Successful' : 'Kuusaan Deetaa Haara\'eera',
        message: lang === 'en'
          ? `Database reset successful! Automatic backup created: ${data.data.backupFile}. All member data has been cleared.`
          : `Kuusaan deetaa haaromfameera! Kuusaan ofumaa uumameera: ${data.data.backupFile}. Deetaan miseensotaa hundi qulqulleeffameera.`,
      });
      load();
    } catch (error: any) {
      setAlertModal({
        open: true,
        type: 'error',
        title: lang === 'en' ? 'Reset Failed' : 'Haaromsuun Hin Milkoofne',
        message: error.response?.data?.message || (lang === 'en' ? 'Failed to reset database.' : 'Kuusaa deetaa haaromsuun hin danda\'amne.'),
      });
    } finally {
      setResetting(false);
    }
  };

  const formatSize = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

  return (
    <div>
      <PageHeader
        title={t('nav.backup', { defaultValue: 'Backup & Restore' })}
        action={
          <button className={btnPrimary} onClick={createBackup} disabled={creating}>
            <Database size={16} className="inline mr-1" />
            {creating ? t('common.loading', { defaultValue: 'Loading...' }) : (lang === 'en' ? 'Create Backup' : 'Kuusaa Uumi')}
          </button>
        }
      />
      
      {/* Reset Database Section */}
      <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-red-100 text-red-600 rounded-xl shrink-0 mt-0.5">
            <AlertCircle size={22} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-red-900 text-base mb-1">
              {lang === 'en' ? 'Reset Database' : 'Kuusaa Deetaa Haaromsi'}
            </h3>
            <p className="text-red-800 text-sm mb-4 leading-relaxed">
              {lang === 'en'
                ? 'Permanently delete all member data, payments, penalties, and attendance records. An automatic backup will be created before reset. This action cannot be undone!'
                : 'Deetaa miseensotaa, kaffaltiiwwan, adabbiiwwan, fi galmee argamaa hunda guutummaatti haqa. Haaromsuun dura kuusaan ofumaan ni uumama. Tarkaanfiin kun hin deebi\'u!'}
            </p>
            <button 
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              onClick={() => {
                setResetConfirmationText('');
                setShowResetModal(true);
              }}
              disabled={resetting}
            >
              <Trash2 size={16} />
              <span>{resetting ? (lang === 'en' ? 'Resetting...' : 'Haaromsaa jira...') : (lang === 'en' ? 'Reset Database' : 'Kuusaa Deetaa Haaromsi')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backups Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-gray-900">
              {lang === 'en' ? 'System Backup Snapshots' : 'Kuusaawwan Sirnaa'}
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              {backups.length} {lang === 'en' ? 'backups available' : 'kuusaawwan jiran'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-4 sm:px-6 py-3">{lang === 'en' ? 'Filename' : 'Maqaa Faayilii'}</th>
                  <th className="px-4 sm:px-6 py-3">{lang === 'en' ? 'Type' : 'Gosa'}</th>
                  <th className="px-4 sm:px-6 py-3">{lang === 'en' ? 'Size' : 'Hamma'}</th>
                  <th className="px-4 sm:px-6 py-3">{lang === 'en' ? 'Date' : 'Guyyaa'}</th>
                  <th className="px-4 sm:px-6 py-3 text-right">{lang === 'en' ? 'Actions' : 'Tarkaanfii'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                      {lang === 'en' ? 'No backups created yet.' : 'Kuusaan hin uumamne.'}
                    </td>
                  </tr>
                ) : (
                  backups.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-3.5 font-mono font-medium text-gray-900 text-xs">{b.filename}</td>
                      <td className="px-4 sm:px-6 py-3.5 text-gray-600">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-xs font-semibold uppercase">
                          {b.type}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-gray-600 font-mono text-xs">{formatSize(b.fileSize)}</td>
                      <td className="px-4 sm:px-6 py-3.5 text-gray-500">{new Date(b.createdAt).toLocaleString()}</td>
                      <td className="px-4 sm:px-6 py-3.5 text-right">
                        <button 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                          onClick={() => setRestoreTarget(b)}
                        >
                          <RotateCcw size={13} />
                          <span>{lang === 'en' ? 'Restore' : 'Deebisi'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL 1: PROPER RESTORE CONFIRMATION MODAL ── */}
      <Modal
        open={!!restoreTarget}
        onClose={() => !restoring && setRestoreTarget(null)}
        title={lang === 'en' ? 'Restore System from Backup' : 'Kuusaa irraa Sirna Deebisi'}
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
            <AlertTriangle size={24} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {lang === 'en' ? 'Restore Confirmation' : 'Mirkaneessa Deebisuu'}
              </p>
              <p className="mt-1 leading-relaxed">
                {lang === 'en'
                  ? 'Restoring will overwrite current settings, member balances, and payment records with data from this snapshot:'
                  : 'Deebisuun qindaa\'ina ammaa, baalaansii miseensotaa fi kaffaltiiwwan kuusaa kanaan ni bakka buusa:'}
              </p>
              <div className="mt-2.5 p-2.5 bg-white/70 rounded-lg font-mono text-xs font-semibold text-gray-800 border border-amber-200/60">
                {restoreTarget?.filename}
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            {lang === 'en' 
              ? 'Are you sure you want to proceed with this restore operation?' 
              : 'Tarkaanfii deebisuu kanaan itti fufuu akka barbaaddu mirkanaa\'aadhaa?'}
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setRestoreTarget(null)}
              disabled={restoring}
            >
              {lang === 'en' ? 'Cancel' : 'Dhiisi'}
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              onClick={handleConfirmRestore}
              disabled={restoring}
            >
              {restoring && <RotateCcw size={14} className="animate-spin" />}
              <span>{restoring ? (lang === 'en' ? 'Restoring...' : 'Deebisaa jira...') : (lang === 'en' ? 'Confirm Restore' : 'Mirkaneessi & Deebisi')}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 2: PROPER DANGER RESET DATABASE MODAL ── */}
      <Modal
        open={showResetModal}
        onClose={() => !resetting && setShowResetModal(false)}
        title={lang === 'en' ? '🚨 Warning: Reset Database' : '🚨 Akeekkachiisa: Kuusaa Deetaa Haaromsi'}
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-xl border border-red-200 flex items-start gap-3 text-red-900 text-xs sm:text-sm">
            <ShieldAlert size={28} className="text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-extrabold text-red-950 text-sm sm:text-base">
                {lang === 'en' ? 'CRITICAL ACTION: Permanent Data Deletion' : 'TARKAANFII CIMAAN: Haqummaa Deetaa Guutuu'}
              </p>
              <p className="leading-relaxed">
                {lang === 'en'
                  ? 'This operation will permanently delete ALL members, weekly obligations, payments, penalties, attendance, and audit logs. An automated backup will be saved first.'
                  : 'Tarkaanfiin kun miseensota hunda, dirqamoota torbee, kaffaltiiwwan, adabbiiwwan, argamaa fi seenaa hojii guutummaatti ni haqa. Kuusaan ofumaa duraan ni olkaa\'ama.'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              {lang === 'en' ? 'Type "RESET" below to confirm:' : 'Mirkaneessuuf "RESET" jedhii barreessi:'}
            </label>
            <input
              type="text"
              value={resetConfirmationText}
              onChange={(e) => setResetConfirmationText(e.target.value)}
              placeholder="RESET"
              className="w-full px-3.5 py-2.5 text-sm font-mono font-bold border border-red-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setShowResetModal(false)}
              disabled={resetting}
            >
              {lang === 'en' ? 'Cancel' : 'Dhiisi'}
            </button>
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={handleConfirmReset}
              disabled={resetting || resetConfirmationText.trim().toUpperCase() !== 'RESET'}
            >
              {resetting && <Trash2 size={14} className="animate-spin" />}
              <span>{resetting ? (lang === 'en' ? 'Resetting...' : 'Haaromsaa jira...') : (lang === 'en' ? 'Permanently Reset' : 'Guutummaatti Haaromsi')}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 3: PROPER FEEDBACK / ALERT MODAL (Replaces browser alert) ── */}
      <Modal
        open={alertModal.open}
        onClose={() => setAlertModal((prev) => ({ ...prev, open: false }))}
        title={alertModal.title}
      >
        <div className="space-y-4 text-center py-2">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center">
            {alertModal.type === 'success' ? (
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
            ) : alertModal.type === 'error' ? (
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <XCircle size={32} />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <AlertCircle size={32} />
              </div>
            )}
          </div>

          <p className="text-sm text-gray-700 leading-relaxed font-medium">
            {alertModal.message}
          </p>

          <div className="pt-2">
            <button
              type="button"
              className="px-6 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
              onClick={() => setAlertModal((prev) => ({ ...prev, open: false }))}
            >
              {lang === 'en' ? 'OK' : 'TOLE'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
