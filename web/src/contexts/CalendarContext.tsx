import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  CalendarPreference,
  EthiopianDateResult,
} from '../lib/ethiopianCalendar';
import {
  formatCalendarDate,
  toEthiopianDate,
  ETHIOPIAN_MONTHS,
  ETHIOPIAN_WEEKDAYS,
} from '../lib/ethiopianCalendar';

interface CalendarContextType {
  calendarType: CalendarPreference;
  setCalendarType: (type: CalendarPreference) => void;
  toggleCalendarType: () => void;
  formatDate: (
    date: Date | string | null | undefined,
    options?: { includeWeekday?: boolean; includeDual?: boolean }
  ) => string;
  getEthiopianDate: (date: Date | string | null | undefined) => EthiopianDateResult | null;
  months: typeof ETHIOPIAN_MONTHS;
  weekdays: typeof ETHIOPIAN_WEEKDAYS;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

const STORAGE_KEY = 'ams_calendar_type';

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [calendarType, setCalendarTypeState] = useState<CalendarPreference>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ETHIOPIAN' || saved === 'GREGORIAN') {
      return saved;
    }
    return 'ETHIOPIAN'; // Ethiopian Calendar is default for Afosha
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, calendarType);
  }, [calendarType]);

  const setCalendarType = (type: CalendarPreference) => {
    setCalendarTypeState(type);
  };

  const toggleCalendarType = () => {
    setCalendarTypeState((prev) => (prev === 'ETHIOPIAN' ? 'GREGORIAN' : 'ETHIOPIAN'));
  };

  const formatDate = (
    date: Date | string | null | undefined,
    options?: { includeWeekday?: boolean; includeDual?: boolean }
  ): string => {
    const lang = i18n.language === 'en' ? 'en' : 'om';
    return formatCalendarDate(date, calendarType, lang, options);
  };

  const getEthiopianDate = (date: Date | string | null | undefined): EthiopianDateResult | null => {
    return toEthiopianDate(date);
  };

  return (
    <CalendarContext.Provider
      value={{
        calendarType,
        setCalendarType,
        toggleCalendarType,
        formatDate,
        getEthiopianDate,
        months: ETHIOPIAN_MONTHS,
        weekdays: ETHIOPIAN_WEEKDAYS,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = (): CalendarContextType => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};
