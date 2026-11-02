import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Mail,
  Send,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import PublicLayout from '../../components/PublicLayout';
import { api } from '../../lib/api';
import { LoadingSpinner, inputClass } from '../../components/ui';

interface ContactInfoData {
  organization: string;
  slogan: string;
  founded: string;
  address: {
    city: string;
    subCity: string;
    kebele: string;
    country: string;
    fullAddressEn: string;
    fullAddressOm: string;
  };
  phones: Array<{ label: string; labelOm: string; number: string }>;
  emails: Array<{ label: string; email: string }>;
  meetingSchedule: {
    dayEn: string;
    dayOm: string;
    time: string;
    location: string;
    locationOm: string;
  };
  socials: {
    telegram: string;
    whatsapp: string;
  };
}

export default function ContactPage() {
  const { i18n } = useTranslation();
  const isOm = i18n.language === 'om';

  const [contactData, setContactData] = useState<ContactInfoData | null>(null);
  const [loading, setLoading] = useState(true);

  const phone1 = contactData?.phones?.[0]?.number || '+251 911 234 567';
  const phone2 = contactData?.phones?.[1]?.number || '+251 922 345 678';
  const emergencyPhone = contactData?.phones?.[2]?.number || '+251 900 000 000';
  const email1 = contactData?.emails?.[0]?.email || 'info@afosha.org';
  const email2 = contactData?.emails?.[1]?.email || 'support@afosha.org';
  const fullAddress = isOm
    ? (contactData?.address?.fullAddressOm || 'Melka Jabdu / Qaxanaa Araattii, Ganda 01, Dirree Dawaa, Itoophiyaa')
    : (contactData?.address?.fullAddressEn || 'Melka Jabdu / Qaxanaa Araattii, Kebele 01, Dire Dawa, Ethiopia');
  const meetingLocation = isOm
    ? (contactData?.meetingSchedule?.locationOm || 'Galma Walga\'ii Hawaasaa Melka Jabdu')
    : (contactData?.meetingSchedule?.location || 'Melka Jabdu Community Assembly Hall');

  // Inquiry Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  // FAQ Accordion
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const res = await api.get('/public/contact');
        if (res.data?.data) {
          setContactData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load contact data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchContactInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !message.trim()) {
      setSubmitError(isOm ? 'Maqaa, bilbila fi ergaa galchuun dirqama.' : 'Name, phone number, and message are required.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await api.post('/public/contact', {
        fullName,
        phone,
        email,
        subject: category,
        message,
      });

      setSubmitSuccess(
        isOm
          ? 'Ergaan keessan milkaa\'inaan nu ga\'eera! Koreen gamtaa yeroo dhiyootti isin qunnama.'
          : 'Your message has been sent successfully! The association leadership will reach out shortly.'
      );
      if (res.data?.data?.ticket) {
        setTicketNumber(res.data.data.ticket);
      }
      setFullName('');
      setPhone('');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message ||
        (isOm ? 'Ergaa erguun hin danda\'amne. Irra deebi\'aa yaalaa.' : 'Failed to send message. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const faqs = [
    {
      qEn: 'How can a new member register with the association?',
      qOm: 'Miseensi haaraan akkamitti gamtaa kanaatti makamuu danda\'a?',
      aEn: 'Youth living in Melka Jabdu / Qaxanaa Araattii can apply online by visiting the registration portal or attending the weekly Saturday gathering. Admission follows the bylaws established on 1/1/2017 EC.',
      aOm: 'Dargaggoonni Melka Jabdu Qaxanaa Araattii jiraatan karaa marsariitii kanaan ykn walga\'ii Sanbataa irratti qaamaan argamuun iyyachuu danda\'u. Galmeen heera 1/1/2017 ALH hundeeffame bu\'uura godhata.',
    },
    {
      qEn: 'What are the weekly contribution requirements?',
      qOm: 'Dirqamni kaffaltii torbanii maali?',
      aEn: 'Every member contributes 50 ETB weekly on Saturdays. Payments can be settled via CBE, Telebirr, eBirr, or Bank Transfer through our dedicated Payments page.',
      aOm: 'Miseensi hundi torbanitti 50 ETB Sanbata kaffala. Kaffaltiin CBE, Telebirr, eBirr ykn Dabarsa Baankiin fuula kaffaltii keenya irratti raawwatamuu danda\'a.',
    },
    {
      qEn: 'Where and when do weekly general meetings take place?',
      qOm: 'Walga\'iin waliigalaa yoomiifi eessatti geggeeffama?',
      aEn: 'General meetings are held every Saturday from 2:00 PM to 5:00 PM at the Melka Jabdu Community Assembly Hall in Dire Dawa.',
      aOm: 'Walga\'iin waliigalaa Sanbata hunda sa\'aatii 8:00 hanga 11:00 WB Galma Walga\'ii Hawaasaa Melka Jabdu keessatti geggeeffama.',
    },
    {
      qEn: 'Who do I contact in case of member emergency or bereavement?',
      qOm: 'Yeroo gaddaa ykn rakkoo hatattamaa eenyuun qunnama?',
      aEn: 'Members should immediately contact the Emergency Hotline at +251 900 000 000 or the Secretariat at +251 911 234 567 to trigger solidarity support.',
      aOm: 'Miseensonni hatattamaan bilbila sarara hatattamaa +251 900 000 000 ykn barreessaa +251 911 234 567 qunnamuun deeggarsa gumaata hatattamaa gaafachuu danda\'u.',
    },
  ];

  return (
    <PublicLayout>
      {/* ── Hero Banner ── */}
      <div
        className="py-12 sm:py-16 text-center text-white px-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #060e33 0%, #091540 60%, #0d1e5e 100%)' }}
      >
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Mail size={14} />
            <span>{isOm ? 'Waajjira Quunnamtii Gamtaa' : 'Official Contact & Inquiries'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 tracking-tight">
            {isOm ? 'Nu Qunnamaa' : 'Contact Our Association'}
          </h1>

          <p className="text-base sm:text-lg text-blue-200 max-w-xl mx-auto leading-relaxed">
            {isOm
              ? 'Gamtaan dargaggoota Melka Jabdu Qaxanaa Araattii miseensotaa fi ummataaf banaadha.'
              : 'Gamtaan dargaggoota Melka Jabdu Qaxanaa Araattii is here to support members, inquiries, and community initiatives.'}
          </p>

          <p className="text-xs sm:text-sm font-semibold text-amber-300 italic mt-3">
            "{isOm ? 'Tokkummaan Ciminaa fi Milkaayina' : 'Unity is Strength and Success'}"
          </p>

          <div className="w-24 h-1 rounded-full mx-auto mt-4 bg-gradient-to-r from-emerald-400 to-amber-400" />
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        {loading ? (
          <div className="py-20 text-center">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* ── 4 Key Contact Quick Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Location */}
              <div
                className="p-6 rounded-2xl border transition-all hover:border-amber-400/40"
                style={{ background: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold mb-4">
                  <MapPin size={24} />
                </div>
                <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wide">
                  {isOm ? 'Teessoo Waajjiraa' : 'Office Location'}
                </h3>
                <p className="text-sm text-blue-100 font-semibold">{fullAddress}</p>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <span className="text-[11px] text-amber-400 font-medium">
                    {isOm ? 'Hundeeffama: 1/1/2017 ALI' : 'Founded: 1/1/2017 EC'}
                  </span>
                </div>
              </div>

              {/* Card 2: Phone */}
              <div
                className="p-6 rounded-2xl border transition-all hover:border-emerald-400/40"
                style={{ background: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-4">
                  <Phone size={24} />
                </div>
                <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wide">
                  {isOm ? 'Bilbila Kallattii' : 'Direct Call'}
                </h3>
                <a href={`tel:${phone1.replace(/\s+/g, '')}`} className="block text-sm font-bold text-emerald-400 hover:underline">
                  {phone1}
                </a>
                <a href={`tel:${phone2.replace(/\s+/g, '')}`} className="block text-xs text-blue-300 hover:underline mt-1">
                  {phone2} (Finance)
                </a>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <span className="text-[11px] text-gray-400">
                    {isOm ? 'Sanbata - Jimaata (8:00 - 17:00)' : 'Mon - Sat (8:00 AM - 5:00 PM)'}
                  </span>
                </div>
              </div>

              {/* Card 3: Email */}
              <div
                className="p-6 rounded-2xl border transition-all hover:border-blue-400/40"
                style={{ background: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold mb-4">
                  <Mail size={24} />
                </div>
                <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wide">
                  {isOm ? 'Imeelii Waajjiraa' : 'Official Email'}
                </h3>
                <a href={`mailto:${email1}`} className="block text-sm font-bold text-blue-300 hover:underline">
                  {email1}
                </a>
                <a href={`mailto:${email2}`} className="block text-xs text-blue-200 hover:underline mt-1">
                  {email2}
                </a>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <span className="text-[11px] text-gray-400">
                    {isOm ? 'Deebii sa\'aatii 24 keessatti' : 'Response within 24 hours'}
                  </span>
                </div>
              </div>

              {/* Card 4: Meeting Schedule */}
              <div
                className="p-6 rounded-2xl border transition-all hover:border-purple-400/40"
                style={{ background: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold mb-4">
                  <Calendar size={24} />
                </div>
                <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wide">
                  {isOm ? 'Walga\'ii Torbanii' : 'Weekly Meeting'}
                </h3>
                <p className="text-sm text-purple-200 font-bold">
                  {isOm ? 'Sanbata Hunda' : 'Every Saturday'}
                </p>
                <p className="text-xs text-blue-300 mt-1">2:00 PM – 5:00 PM</p>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <span className="text-[11px] text-purple-300 font-medium">
                    {meetingLocation}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Main Two-Column Section: Form + Details ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column (7 cols): Send Us a Message Form */}
              <div
                className="lg:col-span-7 rounded-3xl border p-6 sm:p-8 space-y-6"
                style={{ background: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="text-emerald-400" size={24} />
                    <span>{isOm ? 'Ergaa Nuuf Ergaa' : 'Send Us a Message'}</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-200 mt-1">
                    {isOm
                      ? 'Gaaffii, yaada ykn qeeqa qabdan barreessaa. Koreen hojii raawwachiiftuu hatattamaan deebii kenna.'
                      : 'Fill in the form below for inquiries, membership, or feedback. Our committee will review and respond promptly.'}
                  </p>
                </div>

                {submitSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CheckCircle2 size={18} className="text-emerald-400" />
                      <span>{submitSuccess}</span>
                    </div>
                    {ticketNumber && (
                      <p className="text-xs text-emerald-300">
                        {isOm ? 'Lakkoofsa Iyyataa (Ticket): ' : 'Inquiry Reference Ticket: '}
                        <strong className="text-white underline">{ticketNumber}</strong>
                      </p>
                    )}
                  </div>
                )}

                {submitError && (
                  <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 flex items-center gap-2 text-xs font-semibold">
                    <AlertCircle size={18} className="text-red-400 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-blue-200 mb-1">
                        {isOm ? 'Maqaa Guutuu' : 'Full Name'} *
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={isOm ? 'Fkn: Caalaa Tolasaa' : 'e.g. Chala Tolasa'}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-200 mb-1">
                        {isOm ? 'Lakkoofsa Bilbilaa' : 'Phone Number'} *
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0911234567"
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-blue-200 mb-1">
                        {isOm ? 'Imeelii (Filannoo)' : 'Email (Optional)'}
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="chala@example.com"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-200 mb-1">
                        {isOm ? 'Gosa Gaaffii' : 'Inquiry Category'}
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={inputClass}
                      >
                        <option value="general">{isOm ? 'Gaaffii Waliigalaa' : 'General Inquiry'}</option>
                        <option value="payments">{isOm ? 'Kaffaltii Torbanii fi Qorannoo' : 'Weekly Contributions & Payments'}</option>
                        <option value="membership">{isOm ? 'Miseensummaa fi Galmee' : 'Membership Application'}</option>
                        <option value="emergency">{isOm ? 'Deeggarsa Addaa fi Hatattamaa' : 'Emergency & Special Support'}</option>
                        <option value="rules">{isOm ? 'Heeraa fi Dambii' : 'Bylaws & Regulations'}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-blue-200 mb-1">
                      {isOm ? 'Ergaa Keessan' : 'Your Message'} *
                    </label>
                    <textarea
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        isOm
                          ? 'Yaada, gaaffii ykn iyyata keessan bal\'inaan asitti galchaa...'
                          : 'Please provide full details of your inquiry, question, or request...'
                      }
                      className={inputClass}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/20"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    }}
                  >
                    {submitting ? (
                      <>
                        <LoadingSpinner />
                        <span>{isOm ? 'Ergamaa Jira...' : 'Sending Message...'}</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>{isOm ? 'Ergaa Ergi' : 'Submit Message'}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Right Column (5 cols): Leadership Directory & Hotline */}
              <div className="lg:col-span-5 space-y-6">
                {/* Emergency Hotline Card */}
                <div
                  className="p-6 rounded-3xl border text-white space-y-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.3) 100%)',
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center font-black">
                      <AlertCircle size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-red-100">
                        {isOm ? 'Sarara Hatattamaa' : 'Emergency Solidarity Hotline'}
                      </h3>
                      <p className="text-xs text-red-200">
                        {isOm ? 'Yeroo gaddaa ykn rakkoo hatattamaa' : 'Bereavement & Sudden Distress Support'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-red-100 leading-relaxed">
                    {isOm
                      ? 'Miseensi yeroo gaddaa ykn rakkoo hatattamaa keessa jiru battalumatti lakkoofsa kanatti bilbiluun deeggarsa gamtaa gaafachuu danda\'a.'
                      : 'For immediate assistance during family bereavement or sudden hardship, reach the emergency coordinator directly.'}
                  </p>
                  <a
                    href={`tel:${emergencyPhone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow transition-all"
                  >
                    <Phone size={16} />
                    <span>{emergencyPhone}</span>
                  </a>
                </div>

                {/* Leadership & Functional Contacts */}
                <div
                  className="p-6 rounded-3xl border space-y-4"
                  style={{ background: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Users size={16} className="text-amber-400" />
                    <span>{isOm ? 'Koreewwan Hojii Gamtaa' : 'Organizational Committee Contacts'}</span>
                  </h3>

                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-xs font-bold text-white">
                        {isOm ? 'Koree Hojii Raawwachiiftuu' : 'Executive Committee / Secretariat'}
                      </p>
                      <p className="text-[11px] text-blue-300">General Governance & Assembly Inquiries</p>
                      <a href="tel:+251911234567" className="text-xs font-bold text-emerald-400 hover:underline mt-1 inline-block">
                        +251 911 234 567
                      </a>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-xs font-bold text-white">
                        {isOm ? 'Waajjira Maallaqaa fi Qorannoo' : 'Treasury & Finance Management'}
                      </p>
                      <p className="text-[11px] text-blue-300">Payment verification, receipts, balance inquiries</p>
                      <a href="tel:+251922345678" className="text-xs font-bold text-emerald-400 hover:underline mt-1 inline-block">
                        +251 922 345 678
                      </a>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-xs font-bold text-white">
                        {isOm ? 'Koree Nageenyaa fi Dambii' : 'Discipline & Rules Enforcement'}
                      </p>
                      <p className="text-[11px] text-blue-300">By-laws enforcement, dispute resolution, appeals</p>
                      <p className="text-xs font-medium text-amber-300 mt-1">Contact via Secretariat</p>
                    </div>
                  </div>
                </div>

                {/* Quick Social & Community Channels */}
                <div
                  className="p-6 rounded-3xl border space-y-4"
                  style={{ background: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <ExternalLink size={16} className="text-blue-400" />
                    <span>{isOm ? 'Marsariitii fi Chaanaalota' : 'Online Channels'}</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href="https://t.me/MelkaJabduAfosha"
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-center transition-all group"
                    >
                      <p className="text-xs font-bold text-blue-200 group-hover:text-white">Telegram</p>
                      <p className="text-[11px] text-blue-400">@MelkaJabduAfosha</p>
                    </a>
                    <a
                      href="https://wa.me/251911234567"
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-center transition-all group"
                    >
                      <p className="text-xs font-bold text-emerald-200 group-hover:text-white">WhatsApp</p>
                      <p className="text-[11px] text-emerald-400">+251 911 234 567</p>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Frequently Asked Questions (FAQ) Section ── */}
            <div
              className="rounded-3xl border p-6 sm:p-8 space-y-6"
              style={{ background: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {isOm ? 'Gaaffilee Yeroo Baay\'ee Gaafataman' : 'Frequently Asked Questions (FAQ)'}
                  </h2>
                  <p className="text-xs text-blue-300">
                    {isOm ? 'Deebiiwwan gaaffilee miseensotaa fi daawwattootaa' : 'Common questions about membership, meetings, and payments'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/10 overflow-hidden transition-all"
                      style={{ background: isOpen ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)' }}
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full text-left p-4 flex items-center justify-between gap-4 font-semibold text-sm text-white hover:text-amber-300 transition-colors"
                      >
                        <span>{isOm ? faq.qOm : faq.qEn}</span>
                        {isOpen ? <ChevronUp size={18} className="text-amber-400 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 text-xs sm:text-sm text-blue-100 leading-relaxed border-t border-white/5 pt-3">
                          {isOm ? faq.aOm : faq.aEn}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Related Links CTA ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                to="/about"
                className="p-6 rounded-2xl border flex items-center justify-between group transition-all hover:bg-white/10"
                style={{ background: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <div>
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    {isOm ? 'Waa\'ee Gamtaa' : 'About Organization'}
                  </p>
                  <p className="text-base font-bold text-white mt-1 group-hover:text-amber-300 transition-colors">
                    {isOm ? 'Seenaa, Ergaa fi Heera Gamtaa Baradhaa' : 'Learn About History, Mission & Bylaws'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                  →
                </div>
              </Link>

              <Link
                to="/payment"
                className="p-6 rounded-2xl border flex items-center justify-between group transition-all hover:bg-white/10"
                style={{ background: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <div>
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                    {isOm ? 'Kaffaltii Raawwadhaa' : 'Make a Contribution'}
                  </p>
                  <p className="text-base font-bold text-white mt-1 group-hover:text-emerald-300 transition-colors">
                    {isOm ? 'Herreega Baankii fi Telebirr Ilaalaa' : 'View Payment Methods (CBE, Telebirr, eBirr)'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                  →
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
