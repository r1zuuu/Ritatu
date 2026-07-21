import AsyncStorage from "@react-native-async-storage/async-storage";
import { toDateKey } from "../core/date";
import { WEIGHTS_KEY } from "./developerRepository";
import type { WeightEntry } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Entries used to store a pre-formatted "DD.MM" with no year. Ids are built as
// Date.now().toString(36), so the creation date is recoverable from the id.
// Range-check the result rather than trusting Number.isFinite: parseInt("w1", 36)
// returns 1153, not NaN, because "w" is a valid base-36 digit, and the demo seed
// uses exactly those ids.
const EARLIEST_PLAUSIBLE = Date.parse("2024-01-01");

const dateFromId = (id: string, nowMs: number): string | null => {
  const ms = parseInt(id, 36);
  if (!Number.isFinite(ms) || ms < EARLIEST_PLAUSIBLE || ms > nowMs) return null;
  return toDateKey(new Date(ms));
};

// No usable id: assume the most recent occurrence of that day and month that has
// already passed.
const dateFromDayMonth = (value: string, today: Date): string | null => {
  const [day, month] = value.split(".").map(Number);
  if (!day || !month) return null;
  const candidate = new Date(today.getFullYear(), month - 1, day);
  if (candidate > today) candidate.setFullYear(today.getFullYear() - 1);
  return toDateKey(candidate);
};

const migrateDate = (entry: WeightEntry, today: Date): WeightEntry => {
  if (ISO_DATE.test(entry.date)) return entry;
  const migrated = dateFromId(entry.id, today.getTime()) ?? dateFromDayMonth(entry.date, today);
  // ponytail: an unrecognised format keeps its raw value rather than being
  // dropped or given a made-up date. Only ISO and "DD.MM" have ever been written.
  return migrated ? { ...entry, date: migrated } : entry;
};

export const getWeights = async (): Promise<WeightEntry[]> => {
  const raw = await AsyncStorage.getItem(WEIGHTS_KEY);
  if (!raw) return [];
  try {
    const today = new Date();
    // ISO dates sort lexicographically, so no date parsing is needed here.
    return (JSON.parse(raw) as WeightEntry[])
      .map((entry) => migrateDate(entry, today))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
};

export const saveWeights = async (next: WeightEntry[]): Promise<void> => {
  await AsyncStorage.setItem(WEIGHTS_KEY, JSON.stringify(next));
};
