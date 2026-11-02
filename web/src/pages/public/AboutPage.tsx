import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Scale,
  Printer,
  Edit3,
  CheckCircle2,
  Heart,
  AlertCircle
} from 'lucide-react';
import PublicLayout from '../../components/PublicLayout';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { LoadingSpinner, Modal, inputClass, btnPrimary, btnSecondary } from '../../components/ui';

interface ContentTab {
  slug: string;
  title: string;
  titleOm?: string;
  content: string;
  contentOm?: string;
}

interface RegulationItem {
  id: number;
  titleOm: string;
  titleEn: string;
  descOm: string;
  descEn: string;
  icon: string;
}

const DEFAULT_REGULATIONS: RegulationItem[] = [
  {
    id: 1,
    titleOm: 'Kaayyoo Gamtaa',
    titleEn: 'Purpose of the Association',
    descOm: 'Gamtaan keenya kan hundeeffame tokkummaa, wal-gargaarsa, jaalala, kabajaafi hariiroo gaarii dargaggoota gidduutti cimsuuf.',
    descEn: 'Our association is established to strengthen unity, mutual support, love, respect, and positive relationships among the youth.',
    icon: '🎯',
  },
  {
    id: 2,
    titleOm: 'Kabaja Walii',
    titleEn: 'Mutual Respect',
    descOm: 'Miseensi hundi aadaa, amantii, yaadaafi ilaalcha miseensota biroo kabajuu qaba.',
    descEn: 'Every member must respect the culture, religion, opinions, and perspectives of other members.',
    icon: '🤝',
  },
  {
    id: 3,
    titleOm: 'Kaffaltii Torbanii',
    titleEn: 'Weekly Contribution',
    descOm: 'Miseensi hundi kaffaltii torbanii dhaabbanni murteesse yeroo isaa eeggatee kaffaluu qaba. Guyyaan kaffaltii Sanbata.',
    descEn: 'Every member must pay the weekly contribution established by the organization on time. Contribution day is Saturday.',
    icon: '📅',
  },
  {
    id: 4,
    titleOm: 'Adabbii Kaffaltii',
    titleEn: 'Payment Penalties',
    descOm: "Miseensi kaffaltii torbanii yeroo isaa keessatti hin kaffalle adabbii akkaataa dambii gamtaa keessatti murtaa'een kaffaluu qaba.",
    descEn: "Any member who fails to pay the weekly contribution on time shall pay penalties as determined in the association's bylaws.",
    icon: '⚖️',
  },
  {
    id: 5,
    titleOm: 'Gumaacha Addaa',
    titleEn: 'Special Contributions',
    descOm: "Yeroo miseensa tokkoof taatee addaa, kan akka du'a ykn eebba barnootaa maatii isaa, uumamu miseensonni biroo akka murtii gamtaa gumaacha taasisu.",
    descEn: "When an exceptional event occurs for a member, such as bereavement or family educational graduation, other members make contributions per the association's decision.",
    icon: '🎁',
  },
  {
    id: 6,
    titleOm: 'Wal-gargaarsa',
    titleEn: 'Mutual Support',
    descOm: 'Miseensonni yeroo gammachuu, gaddaafi rakkoo wal deeggaruu qabu.',
    descEn: 'Members must support and stand by one another in times of joy, grief, and adversity.',
    icon: '🤲',
  },
  {
    id: 7,
    titleOm: 'Iftoomina Maallaqaa',
    titleEn: 'Financial Transparency',
    descOm: "Bulchiinsi galii, baasii, kaffaltii, adabbii fi qabeenya gamtaa iftoominaafi ragaa qabatamaa irratti hundaa'uun bulchuu qaba.",
    descEn: 'Administration of revenue, expenditures, contributions, penalties, and association assets must be managed with transparency and verifiable documentation.',
    icon: '📊',
  },
  {
    id: 8,
    titleOm: "Hirmaannaa Walga'ii",
    titleEn: 'Meeting Participation',
    descOm: "Miseensonni walga'ii gamtaa irratti hirmaachuuf carraaqqii gochuu qabu.",
    descEn: 'Members must make every effort to attend and participate in association meetings.',
    icon: '👥',
  },
  {
    id: 9,
    titleOm: 'Murtii Gamtaa',
    titleEn: 'Association Decisions',
    descOm: "Murtiin gamtaa haala seera qabeessa, marii fi waliigaltee miseensotaa irratti hundaa'uun kennamuu qaba.",
    descEn: 'Decisions of the association must be made legally, based on deliberation and consensus of the members.',
    icon: '🗳️',
  },
  {
    id: 10,
    titleOm: "Fooyya'iinsa Dambii",
    titleEn: 'Amendment of Regulations',
    descOm: "Dambiin gamtaa yeroo barbaachisaa ta'etti akkaataa adeemsa murtii gamtaa irratti hundaa'uun fooyya'uu danda'a.",
    descEn: "The association bylaws may be amended whenever necessary based on the association's established decision-making procedures.",
    icon: '📜',
  },
];

const TAB_SLUGS = ['organization-history', 'mission-objectives', 'heera-danbii'] as const;

export default function AboutPage() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const isOmGlobal = i18n.language === 'om';

  const [activeTab, setActiveTab] = useState<string>('organization-history');
  const [tabs, setTabs] = useState<ContentTab[]>([]);
  const [loading, setLoading] = useState(true);

  // Dedicated language switch for regulations (allows independent Afaan Oromoo / English viewing)
  const [regLanguage, setRegLanguage] = useState<'om' | 'en'>(isOmGlobal ? 'om' : 'en');

  useEffect(() => {
    setRegLanguage(i18n.language === 'om' ? 'om' : 'en');
  }, [i18n.language]);

  // Admin edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTitleOm, setEditTitleOm] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editContentOm, setEditContentOm] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  const fetchContent = async () => {
    try {
      const res = await api.get('/public/about');
      const data = (res.data.data as ContentTab[]) || [];
      setTabs(data);

      const rulesTab = data.find((tab) => tab.slug === 'heera-danbii');
      if (rulesTab) {
        setEditTitle(rulesTab.title || 'Laws & Regulations (Seeraa fi Dambii)');
        setEditTitleOm(rulesTab.titleOm || 'Seeraa fi Dambii Gamtaa');
        setEditContent(rulesTab.content || '');
        setEditContentOm(rulesTab.contentOm || '');
      }
    } catch (err) {
      console.error('Failed to fetch about content:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  // Handle URL hash navigation (e.g. #heera-danbii, #organization-history, #mission-objectives)
  useEffect(() => {
    if (location.hash) {
      const raw = location.hash.replace('#', '');
      const mapped = raw === 'about-afosha' ? 'organization-history' : raw === 'mission-vision' ? 'mission-objectives' : raw;
      if (TAB_SLUGS.includes(mapped as any)) {
        setActiveTab(mapped);
        setTimeout(() => {
          document.getElementById(raw)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    }
  }, [location.hash]);

  const handleAdminSaveRegulations = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await api.put('/public/content/heera-danbii', {
        title: editTitle,
        titleOm: editTitleOm,
        content: editContent,
        contentOm: editContentOm,
      });
      setSaveSuccessMsg(true);
      setTimeout(() => {
        setSaveSuccessMsg(false);
        setShowEditModal(false);
      }, 1500);
      await fetchContent();
    } catch (err) {
      console.error('Failed to update regulations:', err);
      alert('Failed to update regulations');
    } finally {
      setSavingEdit(false);
    }
  };

  const isOm = regLanguage === 'om';
  const aboutTab = tabs.find((t) => t.slug === 'about' || t.slug === 'about-afosha' || t.slug === 'organization-history');
  const missionTab = tabs.find((t) => t.slug === 'mission-vision' || t.slug === 'mission-objectives');

  return (
    <PublicLayout>
      {/* Print stylesheet to ensure official charter formatting */}
      <style>{`
        @media print {
          header, footer, nav, button, .no-print {
            display: none !important;
          }
          body, main, #root {
            background: white !important;
            color: black !important;
          }
          .printable-rules-doc {
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .regulation-card {
            border: 1px solid #ccc !important;
            background: #fafafa !important;
            color: black !important;
            page-break-inside: avoid;
            margin-bottom: 12px !important;
          }
        }
      `}</style>

      {/* ── Hero Banner ── */}
      <div
        className="py-12 sm:py-16 text-center text-white px-4"
        style={{ background: 'linear-gradient(135deg, #060e33 0%, #091540 60%, #0d1e5e 100%)' }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Scale size={14} />
            <span>Gamtaan dargaggoota Melka Jabdu  Qaxanaa 4 tti</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 tracking-tight">
            {activeTab === 'heera-danbii'
              ? (isOm ? 'Seeraa fi Dambii Gamtaa' : 'Laws & Regulations')
              : (isOmGlobal ? 'Waa\'ee Gamtaa Keenyaa' : 'About Our Organization')}
          </h1>
          <p className="text-base sm:text-lg italic text-blue-200">
            "{isOmGlobal ? 'Tokkummaan Ciminaa fi Milkaayina' : 'Unity is Strength and Success'}"
          </p>
          <div className="w-24 h-1 rounded-full mx-auto mt-4 bg-gradient-to-r from-amber-500 to-amber-300" />
        </div>
      </div>

      {/* ── Sticky Internal Section Navigation ── */}
      <div
        className="sticky top-[64px] z-30 border-b no-print"
        style={{
          background: 'rgba(9, 21, 64, 0.95)',
          backdropFilter: 'blur(10px)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 flex gap-2 overflow-x-auto py-3">
          {[
            { slug: 'organization-history', labelOm: 'Seenaa Gamtaa', labelEn: 'Organization History', icon: BookOpen },
            { slug: 'mission-objectives', labelOm: 'Ergaa fi Kaayyoo', labelEn: 'Mission & Objectives', icon: Heart },
            { slug: 'heera-danbii', labelOm: 'Seeraa fi Dambii', labelEn: 'Laws & Regulations (Seeraa fi Dambii)', icon: Scale },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.slug;
            return (
              <button
                key={tab.slug}
                onClick={() => {
                  setActiveTab(tab.slug);
                  window.location.hash = tab.slug;
                  document.getElementById(tab.slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                  }`}
              >
                <Icon size={16} />
                <span>{isOmGlobal ? tab.labelOm : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Container ── */}
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        {loading ? (
          <div className="py-20 text-center">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* ════════════════════════════════════════════════════════════════
                SECTION 1: ORGANIZATION HISTORY
            ════════════════════════════════════════════════════════════════ */}
            <div id="organization-history" className="scroll-mt-32 space-y-6">
              <span id="about" className="scroll-mt-32" />
              <div
                className="rounded-2xl border p-6 sm:p-8 space-y-5"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-xl shrink-0"
                    style={{ background: 'linear-gradient(135deg, #0d1e5e, #166534)' }}
                  >
                    <BookOpen size={24} className="text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      {isOmGlobal ? 'Seenaa fi Hundeeffama Gamtaa' : 'Organization History & Foundation'}
                    </h2>
                    <p className="text-xs text-emerald-400 font-semibold">
                      Gamtaan dargaggoota Melka Jabdu  Qaxanaa 4 tti — Founded 1/1/2017 EC
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-xs text-blue-300 font-medium">{isOmGlobal ? 'Guyyaa Hundeeffamaa' : 'Founded Date'}</p>
                    <p className="text-base font-bold text-white mt-1">Fuulbana 1, 2017 ALH</p>
                    <p className="text-[11px] text-gray-400">September 11, 2024 GC</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-xs text-blue-300 font-medium">{isOmGlobal ? 'Bakka Hundeeffamaa' : 'Official Location'}</p>
                    <p className="text-base font-bold text-white mt-1">Melka Jabdu /  Qaxanaa 4 tti</p>
                    <p className="text-[11px] text-gray-400">Dire Dawa, Ethiopia</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-xs text-blue-300 font-medium">{isOmGlobal ? 'Mata Duree' : 'Official Motto'}</p>
                    <p className="text-base font-bold text-amber-300 mt-1">Tokkummaan Ciminaa fi Milkaayina</p>
                    <p className="text-[11px] text-gray-400">Unity is Strength & Success</p>
                  </div>
                </div>

                <div className="whitespace-pre-line leading-relaxed text-sm text-blue-100">
                  {isOmGlobal && aboutTab?.contentOm ? aboutTab.contentOm : (aboutTab?.content || 'Gamtaan dargaggoota Melka Jabdu  Qaxanaa 4 tti gamtaa hawaasummaa dargaggootaati. Gamtaan kun tokkummaa, wal-gargaarsa, jaalala, kabajaafi hariiroo gaarii dargaggoota gidduutti cimsuuf Fuulbana 1, 2017 ALH hundeeffame.')}
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                SECTION 2: MISSION AND OBJECTIVES
            ════════════════════════════════════════════════════════════════ */}
            <div id="mission-objectives" className="scroll-mt-32 space-y-6">
              <span id="mission-vision" className="scroll-mt-32" />
              <div
                className="rounded-2xl border p-6 sm:p-8 space-y-5"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-xl shrink-0"
                    style={{ background: 'linear-gradient(135deg, #166534, #15803d)' }}
                  >
                    <Heart size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      {isOmGlobal ? 'Ergaa, Mul\'ata fi Kaayyoo' : 'Mission, Vision & Objectives'}
                    </h2>
                    <p className="text-xs text-emerald-400 font-semibold">
                      {isOmGlobal ? 'Galmoota Gurguddoo Gamtaa Keenyaa' : 'Strategic Goals of Our Organization'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                    <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-2 mb-2">
                      <CheckCircle2 size={16} />
                      <span>{isOmGlobal ? 'Ergaa Gamtaa (Mission)' : 'Mission'}</span>
                    </h3>
                    <p className="text-sm text-blue-100 leading-relaxed">
                      {isOmGlobal
                        ? 'Tokkummaa, wal-gargaarsa, fi nagaa dargaggoota Melka Jabdu  Qaxanaa 4 tti cimsuun, faayinaansii qulqullina qabuun wal deeggaruu.'
                        : 'To foster unity, mutual aid, and social harmony among youth members through disciplined savings and transparent financial mutual assistance.'}
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-amber-950/30 border border-amber-500/20">
                    <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wide flex items-center gap-2 mb-2">
                      <CheckCircle2 size={16} />
                      <span>{isOmGlobal ? 'Mul\'ata Gamtaa (Vision)' : 'Vision'}</span>
                    </h3>
                    <p className="text-sm text-blue-100 leading-relaxed">
                      {isOmGlobal
                        ? 'Hawaasa dargaggootaa tokkummaa cimaa qaban, dinagdeen of danda\'an fi wal-gargaarsaan fakkeenya ta\'an ijaaruu.'
                        : 'To build a united, financially empowered, and supportive youth community that stands as a model of collective solidarity.'}
                    </p>
                  </div>
                </div>

                <div className="whitespace-pre-line leading-relaxed text-sm text-blue-100">
                  {isOmGlobal && missionTab?.contentOm ? missionTab.contentOm : (missionTab?.content || '')}
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                SECTION 3: LAWS & REGULATIONS (SEERAA FI DAMBII)
            ════════════════════════════════════════════════════════════════ */}
            <div
              id="heera-danbii"
              className="scroll-mt-32 printable-rules-doc space-y-8"
            >
              {/* Top Controls & Language Switcher & Print */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 no-print">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <Scale size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      {isOm ? 'Seeraa fi Dambii Gamtaa' : 'Association Laws & Regulations'}
                    </h2>
                    <p className="text-xs text-blue-300">
                      {isOm ? 'Qajeelfamoota Seera Qabeessa Gamtaa' : 'Organizational Constitution & Codes'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
                  {/* Language Switch */}
                  <div className="inline-flex rounded-xl bg-black/40 p-1 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setRegLanguage('om')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${regLanguage === 'om' ? 'bg-amber-500 text-slate-950 shadow' : 'text-blue-200 hover:text-white'
                        }`}
                    >
                      Afaan Oromoo
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegLanguage('en')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${regLanguage === 'en' ? 'bg-amber-500 text-slate-950 shadow' : 'text-blue-200 hover:text-white'
                        }`}
                    >
                      English
                    </button>
                  </div>

                  {/* Print & PDF Download Button */}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-all"
                    title="Print or Save as PDF"
                  >
                    <Printer size={14} />
                    <span>{isOm ? 'Maxxansi / PDF' : 'Print / PDF'}</span>
                  </button>

                  {/* Admin Edit Modal Trigger */}
                  {user?.role === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => setShowEditModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow transition-all"
                    >
                      <Edit3 size={14} />
                      <span>{isOm ? 'Gulaali (Admin)' : 'Edit Rules'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Notice Banner (Proposed Initial Rules - Subject to General Assembly Approval) */}
              <div
                className="p-5 rounded-2xl border flex items-start gap-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(9, 21, 64, 0.7) 100%)',
                  borderColor: 'rgba(245, 158, 11, 0.35)',
                }}
              >
                <AlertCircle size={22} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-300">
                    {isOm
                      ? 'Wixinee Dambii Jalqabaa (Proposed Initial Organizational Rules)'
                      : 'Proposed Initial Draft — Subject to Formal Organizational Adoption'}
                  </p>
                  <p className="text-xs text-blue-100 leading-relaxed">
                    {isOm
                      ? 'Hubachiisa: Seeraa fi dambiin kun wixinee dambii jalqabaa marii fi murtee yaa\'ii waliigalaa gamtaatiif dhiyaatedha. Dambiin kun akkaataa adeemsa murtii gamtaatiin bulchitoota aangoo qabaniin kan fooyya\'uu fi yeroo yaa\'ii waliigalaatiin ragga\'u kan hojiirra ooludha.'
                      : 'Important Note: These regulations represent the proposed initial draft submitted for deliberation and formal approval by the General Assembly. They remain editable by authorized administrators until formally ratified by the organization.'}
                  </p>
                </div>
              </div>

              {/* Constitutional Reference Section (FDRE Constitution Article 31) */}
              <div
                className="p-6 sm:p-8 rounded-3xl border relative overflow-hidden shadow-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(22, 101, 52, 0.35) 0%, rgba(6, 14, 51, 0.95) 100%)',
                  borderColor: 'rgba(34, 197, 94, 0.4)',
                }}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🇪🇹</span>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                        {isOm ? 'Bu\'uura Seera Biyyattii' : 'National Legal Foundation'}
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        {isOm
                          ? 'Heera Mootummaa Dimokiraatawa Federaalawaa Itoophiyaa (FDRE)'
                          : 'Federal Democratic Republic of Ethiopia (FDRE) Constitution'}
                      </h3>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                    {isOm ? 'Keewwata 31' : 'Article 31'}
                  </span>
                </div>

                <blockquote className="p-4 sm:p-5 rounded-2xl bg-black/40 border-l-4 border-emerald-400 text-blue-100 text-sm sm:text-base leading-relaxed italic mb-4">
                  "{isOm
                    ? 'Namni kamiyyuu haala seera biyyattii, aadaa fi duudhaa hawaasaa hin faallessineen kaayyoo ykn sababa fedheef gurmaa\'uu ykn gamtaadhaan ijaaramuu mirga qaba.'
                    : 'Every person has the right to freedom of association for any cause or purpose, in accordance with the law, culture, and traditions of society.'}"
                </blockquote>

                <p className="text-xs text-blue-200/90 leading-relaxed">
                  {isOm
                    ? 'Gamtaan dargaggoota Melka Jabdu  Qaxanaa 4 tti bu\'uura heera kanaatiin gamtaa seera qabeessa ta\'e seera biyyattii bu\'uura godhachuun, akkasumas aadaa fi duudhaa ummataa haala hin faallessineen Fuulbana 1/1/2017 akka lakk. Itoophiyaatti hundaa\'eera.'
                    : 'Based on this constitutional provision, Gamtaan dargaggoota Melka Jabdu  Qaxanaa 4 tti was officially founded on Meskerem 1, 2017 Ethiopian Calendar as a legally anchored youth association upholding national laws and cultural traditions.'}
                </p>
              </div>

              {/* Section Header: 10 Organizational Rules */}
              <div className="pt-4">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      {isOm ? 'Seeraa fi Dambii Gamtaa (Seera 1 – 10)' : 'Organizational Regulations (Rules 1 – 10)'}
                    </h3>
                    <p className="text-xs text-blue-300 mt-1">
                      {isOm
                        ? 'Qajeelfamoota hirmaannaa, kabaja, gumaata, iftoomina fi bulchiinsa gamtaa.'
                        : 'Governing articles for membership, contributions, discipline, transparency, and assembly.'}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-xl bg-white/10 text-amber-300 border border-white/10">
                    10 {isOm ? 'Qabxiilee' : 'Articles'}
                  </span>
                </div>

                {/* 10 Numbered Regulation Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {DEFAULT_REGULATIONS.map((item) => (
                    <div
                      key={item.id}
                      className="regulation-card p-5 sm:p-6 rounded-2xl border transition-all hover:scale-[1.01] hover:border-amber-400/40 flex flex-col justify-between"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(9, 21, 64, 0.7) 100%)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{item.icon}</span>
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {isOm ? `Seera ${item.id}` : `Rule ${item.id}`}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-blue-300/60 font-mono">
                            #{String(item.id).padStart(2, '0')}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-white mb-2">
                          {isOm ? item.titleOm : item.titleEn}
                        </h4>

                        <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                          {isOm ? item.descOm : item.descEn}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-blue-300/70">
                        <span className="italic">
                          {isOm ? 'Wixinee Gamtaa' : 'Gamtaa Proposal'}
                        </span>
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          <span>{isOm ? 'Dirqama Miseensaa' : 'Binding Standard'}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Motto Card */}
              <div
                className="p-6 rounded-2xl border text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.1) 0%, rgba(245, 158, 11, 0.15) 100%)',
                  borderColor: 'rgba(217, 119, 6, 0.3)',
                }}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                  {isOm ? 'Mata Duree Gamtaa' : 'Organizational Motto'}
                </p>
                <p className="text-xl sm:text-2xl font-black italic text-amber-300">
                  "Tokkummaan Ciminaa fi Milkaayina"
                </p>
                <p className="text-xs text-blue-200 mt-1">
                  Gamtaan dargaggoota Melka Jabdu  Qaxanaa 4 tti — Founded 1/1/2017 EC
                </p>
              </div>
            </div>

            {/* ── Referral to dedicated Contact Page ── */}
            <div
              className="rounded-2xl border p-6 sm:p-8 text-center space-y-4 no-print"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
              }}
            >
              <h3 className="text-lg font-bold text-white">
                {isOmGlobal ? 'Gaaffii ykn Yaada Qabduu?' : 'Have Questions or Need Assistance?'}
              </h3>
              <p className="text-xs sm:text-sm text-blue-200 max-w-xl mx-auto">
                {isOmGlobal
                  ? 'Koree hojii raawwachiiftuu, waajjira maallaqaa ykn sarara hatattamaa gamtaa keenyaa qunnamuuf gara fuula quunnamtii keenyaa daawwadhaa.'
                  : 'To speak with the executive committee, treasury, or emergency hotline coordinators, visit our dedicated contact page.'}
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all shadow-lg"
              >
                <span>{isOmGlobal ? 'Fuula Quunnamtii Daawwadhaa' : 'Go to Contact Page'}</span>
                <span>→</span>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* ── Admin Edit Regulations Modal ── */}
      {showEditModal && (
        <Modal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Rules & Regulations (Seeraa fi Dambii)"
        >
          <form onSubmit={handleAdminSaveRegulations} className="space-y-4">
            <p className="text-xs text-gray-500">
              As an authorized administrator, you can update the official proposal text stored in the database.
            </p>

            {saveSuccessMsg && (
              <div className="p-3 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>Updated successfully!</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Title (English)</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Title (Afaan Oromoo)</label>
              <input
                type="text"
                value={editTitleOm}
                onChange={(e) => setEditTitleOm(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Content (Afaan Oromoo)</label>
              <textarea
                rows={8}
                value={editContentOm}
                onChange={(e) => setEditContentOm(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Content (English Translation)</label>
              <textarea
                rows={8}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className={btnSecondary}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className={btnPrimary}
              >
                {savingEdit ? 'Saving...' : 'Save Regulations'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </PublicLayout>
  );
}
