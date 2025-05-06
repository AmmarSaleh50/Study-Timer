// Helper: Returns a unique key for a given ISO date string based on the week of the year.
export function getWeekKey(isoString) {
  const date = new Date(isoString);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() + 4 - day);
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNumber = Math.ceil(
    ((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${year}-W${weekNumber}`;
}

// Helper: Returns the Monday and Sunday of the week for a given date.
export function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}

// Helper: Formats a duration (in seconds) smartly as seconds, minutes, or hours + minutes, using localization.
export function formatSmartDuration(seconds, t, i18n) {
  const isRTL = i18n && i18n.dir && i18n.dir() === 'rtl';
  if (seconds < 60) return `${seconds}${t ? 's' : ''}`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (isRTL) {
    if (hours > 0 && minutes > 0) return `${hours} ${t ? t('time.hour', 'h') : 'h'} ${minutes} ${t ? t('time.minute', 'm') : 'm'}`;
    if (hours > 0) return `${hours} ${t ? t('time.hour', 'h') : 'h'}`;
    return `${minutes} ${t ? t('time.minute', 'm') : 'm'}`;
  } else {
    if (hours > 0 && minutes > 0) return `${hours} ${t ? t('time.hour', 'h') : 'h'} ${minutes} ${t ? t('time.minute', 'm') : 'm'}`;
    if (hours > 0) return `${hours} ${t ? t('time.hour', 'h') : 'h'}`;
    return `${minutes} ${t ? t('time.minute', 'm') : 'm'}`;
  }
}

// i18n helper for localized weekday short names
const WEEKDAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function getLocalizedShortWeekdays(t) {
  return WEEKDAY_KEYS.map((key) => t(`dashboard.${key}`));
} 

