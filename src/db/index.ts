import Dexie, { type Table } from 'dexie';
import type {
  InBodyRecord, DietEntry, TrainingSession, UserProfile,
  HealthMetric, HealthWorkout, ActivitySummary,
} from '../types';

class InBodyDB extends Dexie {
  inbodyRecords!: Table<InBodyRecord>;
  dietEntries!: Table<DietEntry>;
  trainingSessions!: Table<TrainingSession>;
  userProfile!: Table<UserProfile>;
  healthMetrics!: Table<HealthMetric>;
  healthWorkouts!: Table<HealthWorkout>;
  activitySummaries!: Table<ActivitySummary>;

  constructor() {
    super('InBodyControlDB');
    this.version(1).stores({
      inbodyRecords: '++id, date',
      dietEntries: '++id, date, meal',
      trainingSessions: '++id, date, type',
      userProfile: '++id',
    });
    this.version(2).stores({
      inbodyRecords: '++id, date',
      dietEntries: '++id, date, meal',
      trainingSessions: '++id, date, type',
      userProfile: '++id',
      healthMetrics: '++id, date, type',
      healthWorkouts: '++id, date, activityType',
      activitySummaries: '++id, &date',
    });
  }
}

export const db = new InBodyDB();

export async function seedDatabase() {
  const profileCount = await db.userProfile.count();
  if (profileCount === 0) {
    await db.userProfile.add({
      heightCm: 173,
      gender: '男',
      age: 32,
      targetBodyFatPercentage: 20,
      targetWeight: 72,
      dailyProteinGoal: 120,
      dailyCalorieGoal: 1800,
    });
  }

  const recordCount = await db.inbodyRecords.count();
  if (recordCount === 0) {
    await db.inbodyRecords.bulkAdd([
      {
        date: '2024-12-15',
        weight: 82.5,
        skeletalMuscleMass: 33.1,
        bodyFatMass: 21.0,
        bmi: 26.9,
        bodyFatPercentage: 25.4,
        waistHipRatio: 0.92,
        visceralFatLevel: 12,
        basalMetabolicRate: 1680,
        score: 72,
      },
      {
        date: '2025-04-20',
        weight: 80.1,
        skeletalMuscleMass: 33.5,
        bodyFatMass: 18.8,
        bmi: 26.2,
        bodyFatPercentage: 23.5,
        waistHipRatio: 0.90,
        visceralFatLevel: 11,
        basalMetabolicRate: 1695,
        score: 75,
      },
      {
        date: '2025-09-10',
        weight: 78.3,
        skeletalMuscleMass: 34.0,
        bodyFatMass: 16.9,
        bmi: 25.6,
        bodyFatPercentage: 21.6,
        waistHipRatio: 0.88,
        visceralFatLevel: 10,
        basalMetabolicRate: 1710,
        score: 78,
      },
      {
        date: '2026-02-08',
        weight: 77.0,
        skeletalMuscleMass: 34.2,
        bodyFatMass: 15.8,
        bmi: 25.1,
        bodyFatPercentage: 20.5,
        waistHipRatio: 0.87,
        visceralFatLevel: 9,
        basalMetabolicRate: 1720,
        score: 80,
      },
    ]);
  }
}
