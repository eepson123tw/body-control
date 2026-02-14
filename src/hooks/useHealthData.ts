import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { HealthMetricType } from '../types';

export function useHealthMetrics(type?: HealthMetricType) {
  return useLiveQuery(() => {
    if (type) {
      return db.healthMetrics.where('type').equals(type).sortBy('date');
    }
    return db.healthMetrics.orderBy('date').toArray();
  }, [type]) ?? [];
}

export function useHealthWorkouts() {
  return useLiveQuery(() =>
    db.healthWorkouts.orderBy('date').toArray()
  ) ?? [];
}

export function useActivitySummaries() {
  return useLiveQuery(() =>
    db.activitySummaries.orderBy('date').toArray()
  ) ?? [];
}

export function useHealthStats() {
  const vo2max = useHealthMetrics('vo2max');
  const restingHR = useHealthMetrics('restingHR');
  const bodyMass = useHealthMetrics('bodyMass');
  const bodyFat = useHealthMetrics('bodyFat');
  const workouts = useHealthWorkouts();
  const activities = useActivitySummaries();

  const latestVO2Max = vo2max.length > 0 ? vo2max[vo2max.length - 1] : undefined;
  const latestRestingHR = restingHR.length > 0 ? restingHR[restingHR.length - 1] : undefined;
  const todayActivity = activities.find(
    (a) => a.date === new Date().toISOString().slice(0, 10)
  );

  return {
    vo2max, restingHR, bodyMass, bodyFat, workouts, activities,
    latestVO2Max, latestRestingHR, todayActivity,
  };
}
