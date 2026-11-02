import i18n from '../i18n';

/**
 * Calculates the Saturday meeting date for a given year and week number.
 */
export function getMeetingDate(year: number, weekNumber: number, dueDate?: string | Date | null): Date {
  if (dueDate) {
    const d = new Date(dueDate);
    if (!isNaN(d.getTime())) return d;
  }
  // Start from Jan 1st of the given year and advance by weeks
  const d = new Date(year, 0, 1 + (weekNumber - 1) * 7);
  // Saturday is day 6 (0 = Sun, 6 = Sat)
  const day = d.getDay();
  const diff = (6 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Formats a week number and year into a meaningful meeting label with its date:
 * e.g., "Meeting #43 · Oct 24, 2026" (English) or "Walga'ii #43 · Oct 24, 2026" (Afan Oromo).
 */
export function formatMeetingLabel(
  weekNumber?: number | null,
  year?: number | null,
  dueDate?: string | Date | null,
  lang?: string
): string {
  if (!weekNumber || !year) return 'N/A';
  const meetingDate = getMeetingDate(year, weekNumber, dueDate);
  const currentLang = lang || i18n.language || 'en';
  const prefix = currentLang === 'om' ? "Walga'ii" : 'Meeting';
  
  const formattedDate = meetingDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  
  return `${prefix} #${weekNumber} · ${formattedDate}`;
}

/**
 * Shorter meeting tag, e.g. "Meeting #43" or "Walga'ii #43".
 */
export function formatMeetingShort(
  weekNumber?: number | null,
  lang?: string
): string {
  if (!weekNumber) return 'N/A';
  const currentLang = lang || i18n.language || 'en';
  const prefix = currentLang === 'om' ? "Walga'ii" : 'Meeting';
  return `${prefix} #${weekNumber}`;
}
