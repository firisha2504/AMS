import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users, CreditCard, AlertTriangle, Bell, FileText,
  ArrowRight, CheckCircle2,
  Calendar, Sparkles, Scale, Info, Crown, UserCheck
} from 'lucide-react';
import PublicLayout from '../../components/PublicLayout';
import { api } from '../../lib/api';

interface HomeData {
  welcomeMessage: string;
  statistics: { totalMembers: number; activeMembers: number };
  upcomingMeetings: Array<{ id: string; title: string; location?: string; meetingDate: string; meetingTime?: string }>;
}

interface TeamMember {
  id: string;
  name: string;
  nameOm?: string;
  role: string;
  roleOm?: string;
  description?: string;
  descriptionOm?: string;
  image?: string;
  position: number;
  type: 'member' | 'leader';
}

export default function PublicHomePage() {
  const { i18n } = useTranslation();
  const [data, setData] = useState<HomeData | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [_loading, setLoading] = useState(true);
  const isOm = i18n.language === 'om';

  const resolveImageUrl = (img?: string) => {
    if (!img || !img.trim()) return '';
    if (img.startsWith('data:') || img.startsWith('http://') || img.startsWith('https://')) {
      return img;
    }
    const API_URL = import.meta.env.VITE_API_URL || '/api';
    const BASE = API_URL.replace(/\/api\/?$/, '');
    const cleanImg = img.startsWith('/') ? img : `/${img}`;
    return `${BASE}${cleanImg}`;
  };

  useEffect(() => {
    Promise.all([
      api
        .get('/public/home')
        .then((res: { data: { data: HomeData } }) => setData(res.data.data))
        .catch(() => setData(null)),
      api
        .get('/team')
        .then((res: { data: { data?: TeamMember[] } | TeamMember[] }) => {
          const raw = res.data;
          const list = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.data)
            ? raw.data
            : [];
          setTeamMembers(list);
        })
        .catch(() => setTeamMembers([])),
    ]).finally(() => setLoading(false));
  }, []);

  const sortedMembers = [...teamMembers].sort((a, b) => {
    if (a.type === 'leader' && b.type !== 'leader') return -1;
    if (a.type !== 'leader' && b.type === 'leader') return 1;
    return (a.position ?? 0) - (b.position ?? 0);
  });

  const getLayoutClass = (count: number) => {
    if (count <= 2) {
      return 'flex flex-wrap justify-center items-stretch gap-6 sm:gap-8';
    }
    if (count === 3) {
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-items-center max-w-5xl mx-auto';
    }
    return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 justify-items-center max-w-7xl mx-auto';
  };

  return (
    <PublicLayout>
      {/* ── HERO SECTION (Mockup Image 1 Top-Left Match) ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#071329] via-[#0B1F3A] to-[#0A2540] text-white pt-10 pb-16 md:pt-14 md:pb-24 border-b border-white/10">

        {/* Subtle Ambient Background Lighting */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide">
                <Sparkles size={14} className="animate-spin text-emerald-300" style={{ animationDuration: '6s' }} />
                <span>Gamtaan Dargaggoota Melka Jabdu </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.15]">
                Afosha<br className="hidden sm:inline" /> Management System
              </h1>

              {/* Official Slogan in Gold */}
              <div className="text-xl sm:text-2xl font-bold text-[#E5B642] tracking-wide">
                Tokkummaan Ciminaa fi Milkaayina
              </div>

              <p className="text-sm sm:text-base text-blue-100/80 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Gamtaan Dargaggoota Melka Jabdu  Walin Jiruu, Ijaaru fi Gargaarsi Taasisuf.
                Bu'uura Heera FDRE Keewwata 31 jalatti kan hundeeffame.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#159957] hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-900/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <Users size={18} />
                  <span>{isOm ? 'Nuti Dabalami' : 'Join Us'}</span>
                </Link>

                <Link
                  to="/about"
                  className="w-full sm:w-auto px-8 py-3.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm rounded-xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <Info size={18} />
                  <span>{isOm ? 'Dabalata Baradhu' : 'Learn More'}</span>
                </Link>
              </div>

              {/* Quick Status Bar */}
              <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-blue-200/70 border-t border-white/10">
                <span className="flex items-center gap-1.5">
                  <Users size={15} className="text-emerald-400" />
                  {data?.statistics?.activeMembers ?? 0} {isOm ? 'Miseensota Hojii Irra' : 'Active Members'}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-400" />
                  {isOm ? 'Kaffaltii Torbanii: 50 ETB' : 'Weekly Dues: 50 ETB'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={15} className="text-amber-400" />
                  {isOm ? 'Sanbata Sanbata' : 'Every Saturday'}
                </span>
              </div>
            </div>

            {/* Right Photo Column (Mockup Image 1 Photo Match) */}
            <div className="lg:col-span-6 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl overflow-hidden shadow-2xl border-4 border-white/15 group">
                <img
                  src="/hero.jpg"
                  alt="Gamtaan Dargaggoota Melka Jabdu Community in cultural dress"
                  className="w-full h-[320px] sm:h-[400px] lg:h-[430px] object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />

                {/* Cultural Banner Overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 text-white">
                  <p className="font-bold text-sm sm:text-base text-emerald-300">
                    {isOm ? 'Tokkummaa fi Wal-gargaarsa Hawaasaa' : 'Community Unity and Mutual Support'}
                  </p>
                  <p className="text-xs text-gray-200 mt-0.5">
                    Gamtaan Dargaggoota Melka Jabdu
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 5 ACTION FEATURE CARDS (Mockup Image 1 Exact Match) ── */}
      <section className="relative z-20 -mt-8 sm:-mt-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">

          {/* 1. Manage Members */}
          <Link
            to="/login"
            className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all text-center flex flex-col items-center justify-center group"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Users size={22} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">
              {isOm ? 'Miseensota Bulchi' : 'Manage Members'}
            </h3>
            <p className="text-[11px] text-gray-500 mt-1 hidden sm:block">
              {isOm ? 'Profaayilii fi mirkaneessa' : 'Profiles & approvals'}
            </p>
          </Link>

          {/* 2. Track Payments */}
          <Link
            to="/login"
            className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all text-center flex flex-col items-center justify-center group"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CreditCard size={22} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">
              {isOm ? 'Kaffaltii Hordofi' : 'Track Payments'}
            </h3>
            <p className="text-[11px] text-gray-500 mt-1 hidden sm:block">
              {isOm ? 'Kaffaltii torbanii fi addaa' : 'Weekly & special dues'}
            </p>
          </Link>

          {/* 3. Monitor Penalties */}
          <Link
            to="/login"
            className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all text-center flex flex-col items-center justify-center group"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <AlertTriangle size={22} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">
              {isOm ? 'Adabbii To\'adhu' : 'Monitor Penalties'}
            </h3>
            <p className="text-[11px] text-gray-500 mt-1 hidden sm:block">
              {isOm ? 'Seera torbaniifi ji\'aa' : 'Weekly & 4-week rules'}
            </p>
          </Link>

          {/* 4. Send Notifications */}
          <Link
            to="/login"
            className="bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all text-center flex flex-col items-center justify-center group"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Bell size={22} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">
              {isOm ? 'Beeksisa Ergi' : 'Send Notifications'}
            </h3>
            <p className="text-[11px] text-gray-500 mt-1 hidden sm:block">
              {isOm ? 'SMS fi yaadachiisa Sanbataa' : 'SMS & Saturday reminders'}
            </p>
          </Link>

          {/* 5. View Reports */}
          <Link
            to="/login"
            className="col-span-2 sm:col-span-1 bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all text-center flex flex-col items-center justify-center group"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileText size={22} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">
              {isOm ? 'Gabaasa Ilaali' : 'View Reports'}
            </h3>
            <p className="text-[11px] text-gray-500 mt-1 hidden sm:block">
              {isOm ? 'Galmee fi baasii PDF' : 'Ledger & PDF exports'}
            </p>
          </Link>

        </div>
      </section>

      {/* ── ABOUT AFOSHA & 9 OBJECTIVES PREVIEW ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

          <div className="lg:col-span-7 space-y-5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 px-3.5 py-1.5 rounded-full border border-emerald-500/30">
              Seenaa fi Kaayyoo Gamtaa
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isOm ? 'Kaayyoo Ijoo Gamtiichaa' : 'Core Objectives of the Association'}
            </h2>

            <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
              Gamtaan dargaggoota Melka Jabdu  bu'uura Heera Mootummaa Dimokiraatawa Federaalawaa Itoophiyaa (FDRE) keewwata 31 jalatti erameen, walitti dhufeenya dargaggoota keenyaa cimsuuf, tokkummaa fi wal-gargaarsa hawaasaa jabeessuuf hundeeffame.
            </p>

            {/* Special Visual Emphasis on Objectives 1 and 9 */}
            <div className="space-y-3 pt-2">
              <div className="p-4 bg-emerald-950/50 border-l-4 border-emerald-400 rounded-r-xl border border-emerald-500/20">
                <p className="text-xs font-bold text-emerald-300 uppercase">Qabxii 1ffaa (Xiyyeeffannaa Ijoo):</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  1. Tokkummaa fi wal-gargaarsa dargaggoota gidduutti cimsuu, ijaaruu fi akka walgargaaran taasisuu.
                </p>
              </div>

              <div className="p-4 bg-amber-950/40 border-l-4 border-[#E5B642] rounded-r-xl border border-amber-500/20">
                <p className="text-xs font-bold text-amber-300 uppercase">Qabxii 9ffaa (Xiyyeeffannaa Ijoo):</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  9. Aadaa, amantii fi ilaalcha walii kabajuu — aadaa fi duudhaa hawaasaa eeguu fi wal-kabachiisuu.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link to="/about" className="inline-flex items-center gap-2 font-bold text-sm text-emerald-400 hover:text-emerald-300">
                <span>{isOm ? 'Kaayyolee Hunda Dubbisi' : 'Read Full Constitution & Bylaws'}</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 bg-gradient-to-br from-[#0B1F3A] to-[#101827] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Scale size={20} className="text-[#E5B642]" />
              <span>Heera FDRE Keewwata 31</span>
            </h3>

            <blockquote className="italic text-sm text-blue-100/90 leading-relaxed border-l-2 border-[#E5B642] pl-4 my-4">
              "Namni kamiyyuu haala seera biyyattii, aadaa fi duudhaa hawaasaa hin faallessineen kaayyoo ykn sababa fedheef gurmaa'uu ykn gamtaadhaan ijaaramuu mirga qaba."
            </blockquote>

            <div className="pt-4 border-t border-white/10 space-y-2 text-xs text-blue-200">
              <p>• Dargaggoota balaa uumamaa fi nam-tolchee mudateef deeggarsa gochuu.</p>
              <p>• Yeroo gaddaafi gammachuu waliin dhaabbachuu.</p>
              <p>• Kaffaltii torbanii 50 ETB Sanbata hunda.</p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs font-bold text-[#E5B642]">
              #Tokkummaan ciminaa fi milkaayina
            </div>
          </div>

        </div>
      </section>

      {/* ── ORGANIZATION LEADERS & COMMITTEE MEMBERS SECTION ── */}
      {sortedMembers.length > 0 && (
        <section
          id="leadership"
          className="relative w-full py-16 sm:py-20 md:py-24 border-t border-white/10 overflow-hidden"
          style={{ backgroundColor: '#101D45' }}
        >
          {/* Subtle Ambient Background Lighting */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 sm:w-[600px] h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Section Header */}
            <div className="text-center space-y-3 mb-12 sm:mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-3.5 py-1.5 rounded-full border border-emerald-500/30 inline-flex items-center gap-1.5 shadow-sm">
                <Crown size={14} className="text-amber-400" />
                {isOm ? 'Gaggeessitoota fi Koree Gamtaa' : 'Leadership & Executive Committee'}
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                {isOm ? 'Hoggantoota fi Miseensota Koree' : 'Organization Leaders & Key Members'}
              </h2>
              <p className="text-sm sm:text-base text-blue-200/80 max-w-xl mx-auto leading-relaxed">
                {isOm
                  ? 'Gaggeessitoota gamtaa dargaggoota Melka Jabdu fi bakka buutota koree tajaajilan'
                  : 'Dedicated leaders and committee representatives serving the Melka Jabdu Youth Association'}
              </p>
            </div>

            {/* Profile Cards Container */}
            <div className={`w-full ${getLayoutClass(sortedMembers.length)}`}>
              {sortedMembers.map((member) => {
                const displayName = (isOm && member.nameOm ? member.nameOm : member.name) || (isOm ? 'Miseensa' : 'Member');
                const displayRole = (isOm && member.roleOm ? member.roleOm : member.role) || (isOm ? 'Koree Gamtaa' : 'Committee Member');
                const displayDescription = isOm && member.descriptionOm ? member.descriptionOm : member.description;
                const imgUrl = resolveImageUrl(member.image);
                const isLeader = member.type === 'leader';

                return (
                  <div
                    key={member.id}
                    className={`group relative flex flex-col items-center text-center p-6 sm:p-7 rounded-2xl sm:rounded-3xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${
                      isLeader
                        ? 'bg-gradient-to-b from-[#13234d] to-[#0d1838] border border-amber-500/40 shadow-lg shadow-amber-950/20 hover:border-amber-400/80 hover:shadow-amber-900/30'
                        : 'bg-gradient-to-b from-[#112046] to-[#0c1633] border border-white/10 shadow-lg shadow-black/20 hover:border-[#159957]/70 hover:shadow-emerald-950/30'
                    } w-full max-w-[280px] sm:max-w-[300px]`}
                  >
                    {/* Circular Profile Photo Container */}
                    <div className="relative mx-auto mb-4 sm:mb-5 w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] flex-shrink-0">
                      <div
                        className={`w-full h-full rounded-full overflow-hidden p-1 transition-all duration-300 ${
                          isLeader
                            ? 'ring-2 ring-amber-400/70 ring-offset-2 ring-offset-[#101D45] group-hover:ring-amber-300 group-hover:ring-offset-4 group-hover:shadow-lg group-hover:shadow-amber-500/25'
                            : 'ring-2 ring-[#159957] ring-offset-2 ring-offset-[#101D45] group-hover:ring-emerald-400 group-hover:ring-offset-4 group-hover:shadow-lg group-hover:shadow-emerald-500/25'
                        }`}
                        style={{ borderRadius: '50%', aspectRatio: '1 / 1' }}
                      >
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={displayName}
                            className="w-full h-full rounded-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                            style={{
                              borderRadius: '50%',
                              aspectRatio: '1 / 1',
                              objectFit: 'cover',
                              objectPosition: 'center',
                              width: '100%',
                              height: '100%',
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const fallback = (e.target as HTMLElement).nextElementSibling;
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                        ) : null}

                        {/* Fallback circular avatar if no image or image error */}
                        <div
                          className={`w-full h-full rounded-full flex flex-col items-center justify-center select-none ${
                            isLeader
                              ? 'bg-gradient-to-br from-amber-900/60 via-slate-800 to-[#101D45] text-amber-300'
                              : 'bg-gradient-to-br from-emerald-950/60 via-slate-800 to-[#101D45] text-emerald-300'
                          } ${imgUrl ? 'hidden' : ''}`}
                          style={{ borderRadius: '50%', aspectRatio: '1 / 1' }}
                        >
                          <span className="font-extrabold text-2xl sm:text-3xl tracking-wider">
                            {displayName
                              ? displayName
                                  .trim()
                                  .split(/\s+/)
                                  .map((n) => n[0])
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase()
                              : 'A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Small Elegant Role Badge */}
                    <div className="mb-2.5">
                      {isLeader ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                          <Crown size={12} className="text-amber-400" />
                          <span>{isOm ? 'Gaggeessaa' : 'Organization Leader'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm">
                          <UserCheck size={12} className="text-emerald-400" />
                          <span>{isOm ? 'Miseensa Koree' : 'Committee Member'}</span>
                        </span>
                      )}
                    </div>

                    {/* Member's Full Name */}
                    <h3 className="font-bold text-white text-base sm:text-lg leading-snug tracking-tight group-hover:text-emerald-200 transition-colors">
                      {displayName}
                    </h3>

                    {/* Position or Committee Role */}
                    <p className={`text-xs sm:text-sm font-semibold mt-1 ${isLeader ? 'text-amber-400' : 'text-[#159957]'}`}>
                      {displayRole}
                    </p>

                    {/* Optional Short Description */}
                    {displayDescription ? (
                      <p className="text-xs text-blue-200/80 leading-relaxed mt-2.5 line-clamp-3">
                        {displayDescription}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER CALL TO ACTION ── */}
      <section className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white py-12">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-black">
            Gamtaan Dargaggoota Melka Jabdu
          </h2>
          <p className="text-sm sm:text-base text-emerald-100 max-w-2xl mx-auto">
            {isOm
              ? "Hirmaannaan keessan tokkummaa fi fuulduratti tarkaanfii keenyaaf bu'uura. Har'a miseensa ta'aa!"
              : "Your participation is the cornerstone of our unity and collective progress. Become a member today!"}
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-emerald-800 hover:bg-emerald-50 font-bold rounded-xl shadow-lg transition-transform hover:-translate-y-0.5"
            >
              <Users size={18} />
              <span>{isOm ? "Seeni / Galmaa'i" : "Sign In / Join Us"}</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
