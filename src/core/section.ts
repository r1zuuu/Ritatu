export const SECTIONS = ["Śniadanie", "Obiad", "Kolacja", "Przekąska"] as const;
export type Section = typeof SECTIONS[number];

export const getSectionByTime = (): Section => {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();

  if (minutes >= 5 * 60 && minutes < 10 * 60 + 30) return "Śniadanie";
  if (minutes >= 10 * 60 + 30 && minutes < 15 * 60) return "Obiad";
  if (minutes >= 18 * 60 && minutes < 22 * 60) return "Kolacja";
  return "Przekąska";
};
