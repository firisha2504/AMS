import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { PageHeader, LoadingSpinner, inputClass, btnPrimary, Modal } from '../components/ui';
import { Upload, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';

interface Setting { key: string; value: string; label?: string; labelOm?: string; }

export default function SettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      setSettings(data.data || []);
      // Check if logo exists
      const logoSetting = data.data?.find((s: Setting) => s.key === 'mobile_app_logo');
      if (logoSetting?.value) {
        setCurrentLogo(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${logoSetting.value}`);
      }
    }).finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', { settings: settings.map(({ key, value }) => ({ key, value })) });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return;
    
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      
      const { data } = await api.post('/settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      // Update current logo
      setCurrentLogo(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${data.data.logoPath}`);
      setLogoFile(null);
      setLogoPreview(null);
      
      // Show success modal
      setModalType('success');
      setModalMessage('Logo uploaded successfully! The new logo will appear in the mobile app immediately.');
      setModalOpen(true);
    } catch (error) {
      // Show error modal
      setModalType('error');
      setModalMessage('Failed to upload logo. Please try again.');
      setModalOpen(true);
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <div className="space-y-6">
        <PageHeader title={t('nav.settings')} action={<button className={btnPrimary} onClick={save} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</button>} />
      
      {/* Mobile App Logo Section */}
      <div className="bg-white rounded-xl border p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Mobile App Logo
        </h2>
        
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start">
          {/* Current Logo */}
          <div className="flex-shrink-0">
            <p className="text-sm font-medium text-gray-700 mb-2">Current Logo</p>
            <div className="w-24 sm:w-32 h-24 sm:h-32 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 flex-shrink-0">
              {currentLogo ? (
                <img src={currentLogo} alt="App Logo" className="w-full h-full object-contain rounded-lg" />
              ) : (
                <ImageIcon className="w-8 sm:w-12 h-8 sm:h-12 text-gray-400" />
              )}
            </div>
          </div>

          {/* Upload New Logo */}
          <div className="flex-1 w-full">
            <p className="text-sm font-medium text-gray-700 mb-2">Upload New Logo</p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
                id="logo-upload"
              />
              <label htmlFor="logo-upload" className="cursor-pointer">
                <Upload className="w-8 sm:w-10 h-8 sm:h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 10MB</p>
              </label>
            </div>

            {/* Preview */}
            {logoPreview && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <div className="w-20 h-20 border-2 border-blue-200 rounded-lg flex items-center justify-center bg-blue-50 flex-shrink-0">
                    <img src={logoPreview} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                  </div>
                  <button
                    onClick={uploadLogo}
                    disabled={uploadingLogo}
                    className={btnPrimary}
                  >
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mt-4">
          This logo will be displayed in the mobile app (login screen and header). Changes take effect immediately without rebuilding the app.
        </p>
      </div>

      {/* System Settings */}
      <div className="bg-white rounded-xl border divide-y">
        {settings.filter(s => s.key !== 'mobile_app_logo').map((s) => (
          <div key={s.key} className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
            <label className="md:w-1/3 text-sm font-medium text-gray-700 flex-shrink-0">{s.label || s.key}</label>
            <input className={`${inputClass} md:flex-1`} value={s.value} onChange={(e) => update(s.key, e.target.value)} />
          </div>
        ))}
      </div>
      </div>

      {/* Success/Error Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalType === 'success' ? 'Success' : 'Error'}>
        <div className="text-center py-4">
          {modalType === 'success' ? (
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          )}
          <p className="text-slate-700 text-sm leading-relaxed">{modalMessage}</p>
          <button
            onClick={() => setModalOpen(false)}
            className={`mt-6 ${btnPrimary}`}
          >
            OK
          </button>
        </div>
      </Modal>
    </>
  );
}
