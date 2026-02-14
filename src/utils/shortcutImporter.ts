import type { HealthMetric, HealthWorkout } from '../types';

/**
 * Parse JSON exported by iOS Shortcut.
 *
 * Expected format:
 * {
 *   "bodyMass":   [{ "date": "2026-02-14", "value": 77 }],
 *   "bodyFat":    [{ "date": "2026-02-14", "value": 0.205 }],   // fraction
 *   "vo2max":     [{ "date": "2026-02-14", "value": 37.2 }],
 *   "restingHR":  [{ "date": "2026-02-14", "value": 62 }],
 *   "workouts":   [{ "date": "2026-02-14", "type": "Running",
 *                    "duration": 35.1, "energy": 320, "distance": 5.2 }]
 * }
 */

interface ShortcutSample {
  date: string;
  value: number;
}

interface ShortcutWorkout {
  date: string;
  type: string;
  duration: number;
  energy?: number;
  distance?: number;
}

interface ShortcutJSON {
  bodyMass?: ShortcutSample[];
  bodyFat?: ShortcutSample[];
  vo2max?: ShortcutSample[];
  restingHR?: ShortcutSample[];
  workouts?: ShortcutWorkout[];
}

export interface ShortcutParseResult {
  metrics: Omit<HealthMetric, 'id'>[];
  workouts: Omit<HealthWorkout, 'id'>[];
}

export function isShortcutJSON(data: unknown): data is ShortcutJSON {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.bodyMass) ||
    Array.isArray(d.bodyFat) ||
    Array.isArray(d.vo2max) ||
    Array.isArray(d.restingHR) ||
    Array.isArray(d.workouts)
  );
}

export function parseShortcutJSON(data: ShortcutJSON): ShortcutParseResult {
  const metrics: Omit<HealthMetric, 'id'>[] = [];
  const workouts: Omit<HealthWorkout, 'id'>[] = [];

  const src = 'iOS 捷徑';

  if (data.bodyMass) {
    for (const s of data.bodyMass) {
      metrics.push({ date: s.date.slice(0, 10), type: 'bodyMass', value: s.value, sourceName: src });
    }
  }

  if (data.bodyFat) {
    for (const s of data.bodyFat) {
      // HealthKit stores body fat as fraction (0.205 = 20.5%)
      const pct = s.value < 1 ? Math.round(s.value * 1000) / 10 : s.value;
      metrics.push({ date: s.date.slice(0, 10), type: 'bodyFat', value: pct, sourceName: src });
    }
  }

  if (data.vo2max) {
    for (const s of data.vo2max) {
      metrics.push({ date: s.date.slice(0, 10), type: 'vo2max', value: s.value, sourceName: src });
    }
  }

  if (data.restingHR) {
    for (const s of data.restingHR) {
      metrics.push({ date: s.date.slice(0, 10), type: 'restingHR', value: s.value, sourceName: src });
    }
  }

  if (data.workouts) {
    for (const w of data.workouts) {
      workouts.push({
        date: w.date.slice(0, 10),
        activityType: w.type || 'Other',
        duration: Math.round(w.duration * 10) / 10,
        totalEnergyBurned: w.energy ? Math.round(w.energy) : undefined,
        totalDistance: w.distance ? Math.round(w.distance * 100) / 100 : undefined,
        sourceName: src,
      });
    }
  }

  return { metrics, workouts };
}
