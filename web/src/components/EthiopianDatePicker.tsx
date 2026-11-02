import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ETHIOPIAN_MONTHS,
  ETHIOPIAN_WEEKDAYS,
  toEthiopianDate,
  toGregorianDate,
  getDaysInEthiopianMonth,
} from '../lib/ethiopianCalendar';

interface EthiopianDatePickerProps {
  value?: string; // Gregorian ISO date string (YYYY-MM-DD or full ISO)
  onChange: (gregorianDateString: string, ethInfo?: any) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
}

export const EthiopianDatePicker: React.FC<EthiopianDatePickerProps> = ({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  minYear = 2010,
  maxYear = 2030,
}) => {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'om';

  // Current or selected Ethiopian date components
  const initialEth = value ? toEthiopianDate(value) : toEthiopianDate(new Date());
  const [selectedYear, setSelectedYear] = useState<number>(initialEth ? initialEth.year : 2017);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialEth ? initialEth.month : 1);
  const [selectedDay, setSelectedDay] = useState<number>(initialEth ? initialEth.date : 1);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (value) {
      const eth = toEthiopianDate(value);
      if (eth) {
        setSelectedYear(eth.year);
        setSelectedMonth(eth.month);
        setSelectedDay(eth.date);
      }
    }
  }, [value]);

  const daysInMonth = getDaysInEthiopianMonth(selectedYear, selectedMonth);

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    const gDate = toGregorianDate(selectedYear, selectedMonth, day);
    const gStr = gDate.toISOString().slice(0, 10);
    const eth = toEthiopianDate(gDate);
    onChange(gStr, eth);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (selectedMonth > 1) {
      setSelectedMonth(selectedMonth - 1);
    } else {
      setSelectedMonth(13);
      setSelectedYear(selectedYear - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth < 13) {
      setSelectedMonth(selectedMonth + 1);
    } else {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    }
  };

  const currentMonthInfo = ETHIOPIAN_MONTHS[selectedMonth - 1] || ETHIOPIAN_MONTHS[0];
  const monthDisplayName = lang === 'en' ? currentMonthInfo.nameEn : currentMonthInfo.nameOm;

  // Selected date's Gregorian counterpart
  const selectedGregorian = toGregorianDate(
    selectedYear,
    selectedMonth,
    Math.min(selectedDay, daysInMonth)
  );
  const gFormatted = selectedGregorian.toISOString().slice(0, 10);

  return (
    <div className="relative w-full">
      {label && (
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm transition-all cursor-pointer shadow-xs ${
          isOpen ? 'ring-2 ring-emerald-500/20 border-emerald-500' : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
      >
        <div className="flex items-center gap-2.5">
          <CalendarIcon size={18} className="text-emerald-600 shrink-0" />
          <div>
            <span className="font-semibold text-gray-900">
              {selectedDay} {monthDisplayName} {selectedYear}
            </span>
            <span className="ml-2 text-xs text-gray-500">
              (GC: {gFormatted})
            </span>
          </div>
        </div>
        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
          {lang === 'en' ? 'Ethiopian' : 'Itoophiyaa'}
        </span>
      </div>

      {/* Dropdown Calendar Modal */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 mt-2 p-4 bg-white border border-gray-200 rounded-2xl shadow-xl w-80 sm:w-88 animate-in fade-in zoom-in-95 duration-150">
            {/* Header: Month & Year Controls */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-xs font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {ETHIOPIAN_MONTHS.map((m) => (
                    <option key={m.number} value={m.number}>
                      {m.number}. {lang === 'en' ? m.nameEn : m.nameOm}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).map((yr) => (
                    <option key={yr} value={yr}>
                      {yr} {lang === 'en' ? 'EC' : 'ALH'}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Weekday Labels (Sanbata highlighted) */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {ETHIOPIAN_WEEKDAYS.map((wd) => (
                <div
                  key={wd.day}
                  className={`text-[11px] font-bold ${
                    wd.day === 6 ? 'text-emerald-700 font-extrabold' : 'text-gray-400'
                  }`}
                  title={lang === 'en' ? wd.nameEn : wd.nameOm}
                >
                  {lang === 'en' ? wd.nameEn.slice(0, 3) : wd.shortOm}
                </div>
              ))}
            </div>

            {/* Day Numbers Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const isSelected = day === selectedDay;
                // Check if this day is a Saturday
                const gD = toGregorianDate(selectedYear, selectedMonth, day);
                const isSaturday = gD.getUTCDay() === 6;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`h-8 w-8 text-xs font-medium rounded-lg flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : isSaturday
                        ? 'text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Footer with Gregorian Equivalent & Legend */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>{lang === 'en' ? 'Saturday (Meeting)' : 'Sanbata (Walgahii)'}</span>
              </div>
              <div className="font-semibold text-gray-700">
                GC: {gFormatted}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EthiopianDatePicker;
