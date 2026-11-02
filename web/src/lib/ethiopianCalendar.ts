import { EthDateTime } from 'ethiopian-calendar-date-converter';

export interface EthiopianMonthInfo {
  number: number;
  nameEn: string;
  nameOm: string;
  nameAm: string;
  days: number;
}

export interface EthiopianDateResult {
  year: number;
  month: number;
  date: number;
  monthNameEn: string;
  monthNameOm: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  dayNameEn: string;
  dayNameOm: string;
  formattedEth: string; // e.g. "24 Onkololeessa 2019"
  formattedEn: string;  // e.g. "24 Tikimt 2019"
}

export const ETHIOPIAN_MONTHS: EthiopianMonthInfo[] = [
  { number: 1, nameEn: 'Meskerem', nameOm: 'Fulbaana', nameAm: 'መስከረም', days: 30 },
  { number: 2, nameEn: 'Tikimt', nameOm: 'Onkololeessa', nameAm: 'ጥቅምት', days: 30 },
  { number: 3, nameEn: 'Hidar', nameOm: 'Sadaasa', nameAm: 'ኅዳር', days: 30 },
  { number: 4, nameEn: 'Tahsas', nameOm: 'Muddee', nameAm: 'ታኅሣሥ', days: 30 },
  { number: 5, nameEn: 'Tir', nameOm: 'Amajjii', nameAm: 'ጥር', days: 30 },
  { number: 6, nameEn: 'Yekatit', nameOm: 'Guraandhala', nameAm: 'የካቲት', days: 30 },
  { number: 7, nameEn: 'Megabit', nameOm: 'Bitootessa', nameAm: 'መጋቢት', days: 30 },
  { number: 8, nameEn: 'Miazia', nameOm: 'Ebla', nameAm: 'ሚያዝያ', days: 30 },
  { number: 9, nameEn: 'Ginbot', nameOm: 'Caamsaa', nameAm: 'ግንቦት', days: 30 },
  { number: 10, nameEn: 'Sene', nameOm: 'Waxabajjii', nameAm: 'ሰኔ', days: 30 },
  { number: 11, nameEn: 'Hamle', nameOm: 'Adooleessa', nameAm: 'ሐምሌ', days: 30 },
  { number: 12, nameEn: 'Nehase', nameOm: 'Hagayya', nameAm: 'ነሐሴ', days: 30 },
  { number: 13, nameEn: 'Pagume', nameOm: 'Qaammee', nameAm: 'ጳጉሜ', days: 5 }, // 6 in leap year
];

export const ETHIOPIAN_WEEKDAYS = [
  { day: 0, nameEn: 'Sunday', nameOm: 'Dilbata', shortOm: 'Dil' },
  { day: 1, nameEn: 'Monday', nameOm: 'Wiixata', shortOm: 'Wix' },
  { day: 2, nameEn: 'Tuesday', nameOm: 'Kibxata', shortOm: 'Kib' },
  { day: 3, nameEn: 'Wednesday', nameOm: 'Roobii', shortOm: 'Rob' },
  { day: 4, nameEn: 'Thursday', nameOm: 'Kamiisa', shortOm: 'Kam' },
  { day: 5, nameEn: 'Friday', nameOm: 'Jimmata', shortOm: 'Jim' },
  { day: 6, nameEn: 'Saturday', nameOm: 'Sanbata', shortOm: 'San' },
];

/**
 * Ethiopian leap year: year % 4 === 3
 */
export function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 3;
}

export function getDaysInEthiopianMonth(year: number, month: number): number {
  if (month === 13) return isEthiopianLeapYear(year) ? 6 : 5;
  return 30;
}

/**
 * Convert Date to Ethiopian Date object with Africa/Addis_Ababa timezone correction
 */
export function toEthiopianDate(dateInput: Date | string | null | undefined): EthiopianDateResult | null {
  if (!dateInput) return null;
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return null;

  // Offset for Africa/Addis_Ababa (UTC+3)
  const addisOffsetMs = 3 * 60 * 60 * 1000;
  const localTime = new Date(d.getTime() + addisOffsetMs);

  const utcDate = new Date(Date.UTC(localTime.getUTCFullYear(), localTime.getUTCMonth(), localTime.getUTCDate()));
  const eth = EthDateTime.fromEuropeanDate(utcDate);

  const mInfo = ETHIOPIAN_MONTHS[eth.month - 1] || ETHIOPIAN_MONTHS[0];
  const dayOfWeek = utcDate.getUTCDay();
  const dayInfo = ETHIOPIAN_WEEKDAYS[dayOfWeek];

  return {
    year: eth.year,
    month: eth.month,
    date: eth.date,
    monthNameEn: mInfo.nameEn,
    monthNameOm: mInfo.nameOm,
    dayOfWeek,
    dayNameEn: dayInfo.nameEn,
    dayNameOm: dayInfo.nameOm,
    formattedEth: `${eth.date} ${mInfo.nameOm} ${eth.year}`,
    formattedEn: `${eth.date} ${mInfo.nameEn} ${eth.year}`,
  };
}

/**
 * Convert Ethiopian year, month, date to Gregorian Date
 */
export function toGregorianDate(year: number, month: number, date: number): Date {
  const eth = new EthDateTime(year, month, date, 12, 0, 0);
  return eth.toEuropeanDate();
}

export type CalendarPreference = 'ETHIOPIAN' | 'GREGORIAN';

/**
 * Universal date formatter supporting both calendars and both languages
 */
export function formatCalendarDate(
  dateInput: Date | string | null | undefined,
  calendarType: CalendarPreference = 'ETHIOPIAN',
  language: string = 'om',
  options?: {
    includeWeekday?: boolean;
    includeDual?: boolean;
    includeTime?: boolean;
  }
): string {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '-';

  const eth = toEthiopianDate(d);
  if (!eth) return '-';

  // Gregorian formatted
  const gYear = d.getFullYear();
  const gMonth = String(d.getMonth() + 1).padStart(2, '0');
  const gDay = String(d.getDate()).padStart(2, '0');
  const gFormatted = `${gDay}/${gMonth}/${gYear}`;

  if (calendarType === 'ETHIOPIAN') {
    const monthName = language === 'en' ? eth.monthNameEn : eth.monthNameOm;
    const weekdayName = language === 'en' ? eth.dayNameEn : eth.dayNameOm;
    const ethFormatted = `${eth.date} ${monthName} ${eth.year}`;

    let primary = options?.includeWeekday ? `${weekdayName}, ${ethFormatted}` : ethFormatted;
    if (options?.includeDual) {
      return `${primary} (${gFormatted})`;
    }
    return primary;
  } else {
    // Gregorian format
    let primary = gFormatted;
    if (options?.includeWeekday) {
      const gWeekday = d.toLocaleDateString(language === 'en' ? 'en-US' : 'om-ET', { weekday: 'short' });
      primary = `${gWeekday}, ${gFormatted}`;
    }
    if (options?.includeDual) {
      const monthName = language === 'en' ? eth.monthNameEn : eth.monthNameOm;
      return `${primary} (${eth.date} ${monthName} ${eth.year})`;
    }
    return primary;
  }
}
