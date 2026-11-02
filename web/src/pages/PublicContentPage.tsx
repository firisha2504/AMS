import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, FileText, Image } from 'lucide-react';
import { api } from '../lib/api';
import { PageHeader, LoadingSpinner, inputClass, btnPrimary, btnSecondary } from '../components/ui';

interface ContentTab {
  slug: string;
  title: string;
  titleOm?: string;
  content: string;
  contentOm?: string;
}

const CONTENT_TABS = [
  { slug: 'about-afosha', label: 'About Afosha', labelOm: 'Waa\'ee Afosha' },
  { slug: 'mission-vision', label: 'Mission & Vision', labelOm: 'Ergaa fi Mul\'ata' },
  { slug: 'heera-danbii', label: 'Rules & Regulations', labelOm: 'Heera fi Danbii' },
  { slug: 'contact', label: 'Contact Information', labelOm: 'Odeeffannoo Quunnamtii' },
];

export default function PublicContentPage() {
  const { i18n } = useTranslation();
  const [tabs, setTabs] = useState<ContentTab[]>([]);
  const [activeSlug, setActiveSlug] = useState('about-afosha');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const isOm = i18n.language === 'om';

  useEffect(() => {
    loadContent();
    loadLogo();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/public/about');
      setTabs(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  const loadLogo = async () => {
    try {
      const { data } = await api.get('/settings/logo/info');
      if (data?.data?.logoPath) {
        setCurrentLogo(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${data.data.logoPath}`);
      }
    } catch {
      // Logo not found or error, that's okay
    }
  };

  const current = tabs.find((tab) => tab.slug === activeSlug);

  const updateField = (field: keyof ContentTab, value: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.slug === activeSlug ? { ...tab, [field]: value } : tab
      )
    );
  };

  const saveCurrent = async () => {
    if (!current) return;
    setSaving(true);
    try {
      await api.put(`/public/content/${current.slug}`, {
        title: current.title,
        titleOm: current.titleOm,
        content: current.content,
        contentOm: current.contentOm,
      });
      
      alert('Content saved successfully!');
    } catch (error) {
      alert('Failed to save content. Please try again.');
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
      
      // Update current logo display
      setCurrentLogo(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${data.data.logoPath}`);
      setLogoFile(null);
      setLogoPreview('');
      
      alert('Logo uploaded successfully! The new logo will appear on the public landing page immediately.');
    } catch {
      alert('Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Public Content Management"
        subtitle="Edit About page content, contact information, and upload organization logo"
      />

      <div className="space-y-6">
        {/* Logo Upload Section */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Image size={20} className="text-green-600" />
            <h2 className="text-lg font-semibold text-gray-800">Organization Logo</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Current Logo */}
            <div className="flex-shrink-0">
              <p className="text-sm font-medium text-gray-700 mb-2">Current Logo</p>
              <div className="w-32 h-32 border-2 border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
                {currentLogo ? (
                  <img src={currentLogo} alt="Organization Logo" className="w-full h-full object-contain rounded-lg" />
                ) : (
                  <Image className="w-12 h-12 text-gray-400" />
                )}
              </div>
            </div>

            {/* Upload New Logo */}
            <div className="flex-1 w-full">
              <p className="text-sm font-medium text-gray-700 mb-2">Upload New Logo</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo File (SVG, PNG, or JPG)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                </div>

                {logoPreview && (
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-lg border-2 border-blue-200 flex items-center justify-center bg-blue-50 flex-shrink-0">
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain rounded-lg" />
                    </div>
                    <button
                      onClick={uploadLogo}
                      disabled={uploadingLogo}
                      className={btnPrimary}
                    >
                      <Save size={16} className="inline mr-2" />
                      {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </button>
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  Recommended size: 512x512px (square format works best). The logo will appear on the public landing page and in the header.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs Section */}
        <div className="bg-white rounded-xl border">
          <div className="border-b px-6 py-4">
            <div className="flex items-center gap-3 mb-4">
              <FileText size={20} className="text-green-600" />
              <h2 className="text-lg font-semibold text-gray-800">About Page Content</h2>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2">
              {CONTENT_TABS.map(({ slug, label, labelOm }) => (
                <button
                  key={slug}
                  onClick={() => setActiveSlug(slug)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeSlug === slug
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isOm ? labelOm : label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Editor */}
          {current && (
            <div className="p-6 space-y-6">
              {/* English Fields */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase border-b pb-2">
                  English Content
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title (English)
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    value={current.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="Enter title in English"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content (English)
                  </label>
                  <textarea
                    className={inputClass}
                    rows={12}
                    value={current.content}
                    onChange={(e) => updateField('content', e.target.value)}
                    placeholder="Enter content in English"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Tip: Use line breaks to format content. For contact info, use format: "Email: info@example.com"
                  </p>
                </div>
              </div>

              {/* Oromiffa Fields */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase border-b pb-2">
                  Afaan Oromoo Content
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title (Oromiffa)
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    value={current.titleOm || ''}
                    onChange={(e) => updateField('titleOm', e.target.value)}
                    placeholder="Enter title in Afaan Oromoo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content (Oromiffa)
                  </label>
                  <textarea
                    className={inputClass}
                    rows={12}
                    value={current.contentOm || ''}
                    onChange={(e) => updateField('contentOm', e.target.value)}
                    placeholder="Enter content in Afaan Oromoo"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={saveCurrent}
                  className={btnPrimary}
                  disabled={saving}
                >
                  <Save size={16} className="inline mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={loadContent}
                  className={btnSecondary}
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">📝 Editing Guidelines</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li><strong>Contact Information:</strong> Edit phone, email, and address in the "Contact Information" tab</li>
            <li><strong>About Content:</strong> Update organization description in "About Afosha" tab</li>
            <li><strong>Rules & Regulations:</strong> Edit constitutional basis and objectives in "Heera fi Danbii" tab</li>
            <li><strong>Mission & Vision:</strong> Update organizational goals and vision statements</li>
            <li><strong>Bilingual Support:</strong> Always provide both English and Oromiffa versions</li>
            <li><strong>Preview:</strong> Visit the public About page to see your changes live</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
