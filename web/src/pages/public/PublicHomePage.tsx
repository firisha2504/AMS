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
    if (!img) return '';
    if (img.startsWith('data:') || img.startsWith('http://') || img.startsWith('https://')) {
      return img;
    }
    const API_URL = import.meta.env.VITE_API_URL || '/api';
    const BASE = API_URL.replace('/api', '');
    return `${BASE}${img.startsWith('/') ? '' : '/'}${img}`;
  };

  useEffect(() => {
    Promise.all([
      api.get('/public/home').then((res: { data: { data: HomeData } }) => setData(res.data.data)).catch(() => setData(null)),
      api.get('/team').then((res: { data: { data: TeamMember[] } }) => setTeamMembers(res.data.data || [])).catch(() => setTeamMembers([])),
    ]).finally(() => setLoading(false));
  }, []);

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
      {teamMembers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 border-t border-white/10">
          <div className="text-center space-y-3 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-3.5 py-1.5 rounded-full border border-emerald-500/30 inline-flex items-center gap-1.5">
              <Crown size={14} className="text-amber-400" />
              {isOm ? 'Gaggeessitoota fi Koree Gamtaa' : 'Leadership & Executive Committee'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isOm ? 'Hoggantoota fi Miseensota Koree' : 'Organization Leaders & Key Members'}
            </h2>
            <p className="text-sm text-blue-200/80 max-w-xl mx-auto">
              {isOm
                ? 'Gaggeessitoota gamtaa dargaggoota Melka Jabdu Qaxaa Araati'
                : 'Dedicated leaders and committee representatives serving the Melka Jabdu Youth Association'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {teamMembers.map((member) => {
              const displayName = isOm && member.nameOm ? member.nameOm : member.name;
              const displayRole = isOm && member.roleOm ? member.roleOm : member.role;
              const imgUrl = resolveImageUrl(member.image);
              const isLeader = member.type === 'leader';

              return (
                <div
                  key={member.id}
                  className={`relative rounded-2xl overflow-hidden shadow-lg border transition-all duration-300 hover:-translate-y-1 ${
                    isLeader
                      ? 'bg-gradient-to-b from-[#0f2347] to-[#0a1931] border-amber-500/40 shadow-amber-900/10'
                      : 'bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/25'
                  }`}
                >
                  {/* Photo with aspect-ratio preservation and object-fit cover */}
                  <div className="w-full aspect-[4/5] bg-slate-800/80 relative overflow-hidden flex items-center justify-center">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={displayName}
                        className="w-full h-full object-cover object-top transition-transform duration-500 hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const fallback = (e.target as HTMLElement).nextElementSibling;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    ) : null}

                    {/* Fallback avatar if no image or image error */}
                    <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 ${imgUrl ? 'hidden' : ''}`}>
                      <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center text-emerald-300 font-bold text-2xl shadow-inner">
                        {displayName ? displayName.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <span className="text-[11px] text-slate-400 mt-2 font-medium">Melka Jabdu Afosha</span>
                    </div>

                    {/* Role badge top right */}
                    <div className="absolute top-3 right-3">
                      {isLeader ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 flex items-center gap-1 shadow-md">
                          <Crown size={12} />
                          {isOm ? 'Gaggeessaa' : 'Leader'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600/90 text-white flex items-center gap-1 shadow-md">
                          <UserCheck size={12} />
                          {isOm ? 'Miseensa Koree' : 'Committee'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Member info */}
                  <div className="p-4 text-center space-y-1">
                    <h3 className="font-bold text-white text-base leading-snug">
                      {displayName}
                    </h3>
                    <p className={`text-xs font-medium ${isLeader ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {displayRole}
                    </p>
                  </div>
                </div>
              );
            })}
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
