export const dateWithOffset = (offset: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
};

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

// Whole days from today to `date` (negative in the past). Rounded, so the
// 23- and 25-hour days around DST changes still count as one.
export const daysFromToday = (date: Date) =>
  Math.round((startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / 86_400_000);

// Monday of the week containing `date`.
export const startOfWeek = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));

export const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

const MONTHS_SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const WEEKDAYS_SHORT = ["nd", "pn", "wt", "śr", "cz", "pt", "sb"];

// "Dziś" / "Wczoraj" / "śr, 21 wrz" for a diary day `offset` days from today.
export const formatDayLabel = (offset: number, date: Date) => {
  if (offset === 0) return "Dziś";
  if (offset === -1) return "Wczoraj";
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
};

export const formatShortDate = (date: Date) =>
  new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
  }).format(date);

export const formatTargetDate = (date: Date) =>
  new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
