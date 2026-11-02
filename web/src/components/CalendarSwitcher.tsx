import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, Check } from 'lucide-react';
import { useCalendar } from '../contexts/CalendarContext';

export const CalendarSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { calendarType, setCalendarType } = useCalendar();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const isEth = calendarType === 'ETHIOPIAN';
  const lang = i18n.language === 'en' ? 'en' : 'om';

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all border border-emerald-300/60 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 shadow-xs"
        title={t('calendar.switchCalendar', { defaultValue: 'Switch Calendar System' })}
      >
        <CalendarIcon size={16} className="text-emerald-700 shrink-0" />
        <span className="hidden md:inline font-bold">
          {isEth
            ? (lang === 'en' ? 'Ethiopian Calendar' : 'Dhaha Itoophiyaa')
            : (lang === 'en' ? 'Gregorian Calendar' : 'Dhaha Faranjii')}
        </span>
        <span className="md:hidden font-bold">
          {isEth ? (lang === 'en' ? 'EC' : 'ALH') : 'GC'}
        </span>
      </button>

      {dropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3.5 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {lang === 'en' ? 'Select Calendar System' : 'Sirna Dhahaa Filadhaa'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setCalendarType('ETHIOPIAN');
                setDropdownOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                isEth ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="text-left">
                <div className="font-semibold">
                  {lang === 'en' ? 'Ethiopian Calendar' : 'Dhaha Itoophiyaa'}
                </div>
                <div className="text-[11px] text-gray-500">
                  {lang === 'en' ? '13 Months (Meskerem - Pagume)' : "Ji'oota 13 (Fulbaana - Qaammee)"}
                </div>
              </div>
              {isEth && <Check size={16} className="text-emerald-700 shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setCalendarType('GREGORIAN');
                setDropdownOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                !isEth ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="text-left">
                <div className="font-semibold">
                  {lang === 'en' ? 'Gregorian Calendar' : 'Dhaha Faranjii'}
                </div>
                <div className="text-[11px] text-gray-500">
                  {lang === 'en' ? '12 Months (Standard International)' : "Ji'oota 12 (Idil-addunyaa)"}
                </div>
              </div>
              {!isEth && <Check size={16} className="text-emerald-700 shrink-0" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarSwitcher;
