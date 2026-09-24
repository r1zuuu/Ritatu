const DAY_MS = 86_400_000;

// Smoothed "true" weight (Hacker's Diet / MacroFactor style): each weigh-in
// pulls the trend 10% of the way toward it per day since the previous one, so
// a single salty evening barely moves it while a real change shows within a
// week or two. Entries must be sorted by ISO date.
export const weightTrend = (entries: Array<{ date: string; weightKg: number }>): number[] => {
  const trend: number[] = [];
  entries.forEach((entry, i) => {
    if (i === 0) {
      trend.push(entry.weightKg);
      return;
    }
    const days = Math.max(1, Math.round((Date.parse(entry.date) - Date.parse(entries[i - 1].date)) / DAY_MS));
    const alpha = 1 - 0.9 ** days;
    trend.push(trend[i - 1] + alpha * (entry.weightKg - trend[i - 1]));
  });
  return trend;
};
