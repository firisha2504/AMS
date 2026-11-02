import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PublicLayout from '../../components/PublicLayout';
import { api } from '../../lib/api';
import { LoadingSpinner } from '../../components/ui';

interface ContentTab {
  slug: string;
  title: string;
  titleOm?: string;
  content: string;
  contentOm?: string;
}

const TAB_SLUGS = ['about-afosha', 'mission-vision', 'heera-danbii', 'contact'] as const;

const tabLabels: Record<string, { en: string; om: string }> = {
  'about-afosha': { en: 'About Afosha', om: 'Waa\'ee Afosha' },
  'mission-vision': { en: 'Mission & Vision', om: 'Ergaa fi Mul\'ata' },
  'heera-danbii': { en: 'Rules & Regulations', om: 'Heera fi Danbii' },
  contact: { en: 'Contact', om: 'Quunnamtii' },
};

export default function AboutPage() {
  const { t, i18n } = useTranslation();
  const [tabs, setTabs] = useState<ContentTab[]>([]);
  const [loading, setLoading] = useState(true);
  const isOm = i18n.language === 'om';

  useEffect(() => {
    api.get('/public/about')
      .then((res) => {
        const data = (res.data.data as ContentTab[]) || [];
        setTabs(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const scrollTo = (slug: string) => {
    document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <PublicLayout>

      {/* Hero banner */}
      <div className="py-10 sm:py-12 md:py-16 text-center" style={{
        background: 'linear-gradient(135deg, #060e33 0%, #091540 60%, #0d1e5e 100%)',
      }}>
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">{t('public.about')}</h1>
          <p className="text-lg italic" style={{ color: '#bfdbfe' }}>
            "{t('public.motto')}"
          </p>
          <div className="w-20 h-1 rounded-full mx-auto mt-4"
            style={{ background: 'linear-gradient(90deg, #d97706, #f59e0b)' }} />
        </div>
      </div>

      {/* Sticky section nav */}
      <div className="sticky top-[64px] z-20 border-b"
        style={{ background: 'rgba(9,21,64,0.95)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto py-2">
          {TAB_SLUGS.map((slug) => (
            <button
              key={slug}
              onClick={() => scrollTo(slug)}
              className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all hover:bg-white/10"
              style={{ color: '#bfdbfe' }}>
              {isOm ? tabLabels[slug].om : tabLabels[slug].en}
            </button>
          ))}
        </div>
      </div>

      {/* All sections stacked */}
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10 md:py-12 space-y-6 sm:space-y-8">
        {loading ? <LoadingSpinner /> : (
          tabs.length ? (
            tabs.map((tab) => (
              <div
                key={tab.slug}
                id={tab.slug}
                className="rounded-xl sm:rounded-2xl border p-5 sm:p-6 md:p-8 scroll-mt-32"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>

                {/* Section header */}
                <div className="flex items-center gap-2.5 sm:gap-3 mb-5 sm:mb-6 pb-4 sm:pb-5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-white shrink-0 text-base sm:text-lg"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)' }}>
                    {(isOm && tab.titleOm ? tab.titleOm : tab.title)[0]}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold" style={{ color: '#e2e8f0' }}>
                    {isOm && tab.titleOm ? tab.titleOm : tab.title}
                  </h2>
                </div>

                {/* Content body */}
                <div className="whitespace-pre-line leading-relaxed text-sm" style={{ color: '#bfdbfe' }}>
                  {isOm && tab.contentOm ? tab.contentOm : tab.content}
                </div>

                {/* Gold accent for Heera fi Danbii */}
                {tab.slug === 'heera-danbii' && (
                  <div className="mt-8 p-5 rounded-xl" style={{
                    background: 'linear-gradient(135deg, rgba(217,119,6,0.08), rgba(245,158,11,0.12))',
                    border: '1px solid rgba(217,119,6,0.2)',
                  }}>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#f59e0b' }}>
                      {isOm ? 'Moto Keenya' : 'Our Motto'}
                    </p>
                    <p className="text-lg font-bold italic" style={{ color: '#fbbf24' }}>
                      {isOm ? '"Tokkummaan Ciminaa fi Milkaayina"' : '"Unity is Strength and Success"'}
                    </p>
                  </div>
                )}
              </div>
            ))
          ) : (
            /* Fallback — API returned nothing, render placeholder sections */
            TAB_SLUGS.map((slug) => (
              <div
                key={slug}
                id={slug}
                className="rounded-2xl border p-8 scroll-mt-32"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-3 mb-6 pb-5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)' }}>
                    {tabLabels[slug].en[0]}
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: '#e2e8f0' }}>
                    {isOm ? tabLabels[slug].om : tabLabels[slug].en}
                  </h2>
                </div>
                <p className="text-sm" style={{ color: '#93c5fd' }}>—</p>
              </div>
            ))
          )
        )}
      </div>
    </PublicLayout>
  );
}
