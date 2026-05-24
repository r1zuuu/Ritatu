export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

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
