export interface InBodyRecord {
  id?: number;
  date: string;
  weight: number;
  skeletalMuscleMass: number;
  bodyFatMass: number;
  bmi: number;
  bodyFatPercentage: number;
  waistHipRatio: number;
  visceralFatLevel: number;
  basalMetabolicRate: number;
  score: number;
}

export interface DietEntry {
  id?: number;
  date: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodName: string;
  protein: number;
  calories: number;
  carbs?: number;
  fat?: number;
}

export interface ExerciseSet {
  weight: number;
  reps: number;
}

export interface Exercise {
  name: string;
  sets: ExerciseSet[];
}

export interface TrainingSession {
  id?: number;
  date: string;
  type: 'push' | 'pull' | 'legs' | 'cardio';
  exercises: Exercise[];
  notes?: string;
}

export interface UserProfile {
  id?: number;
  heightCm: number;
  gender: string;
  age: number;
  targetBodyFatPercentage: number;
  targetWeight: number;
  dailyProteinGoal: number;
  dailyCalorieGoal: number;
  openaiApiKey?: string;
}

export const MEAL_LABELS: Record<DietEntry['meal'], string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '點心',
};

export const TRAINING_TYPE_LABELS: Record<TrainingSession['type'], string> = {
  push: '上肢推',
  pull: '上肢拉',
  legs: '下肢',
  cardio: '有氧',
};

// Apple Health types

export type HealthMetricType = 'bodyMass' | 'bodyFat' | 'bmi' | 'vo2max' | 'restingHR';

export interface HealthMetric {
  id?: number;
  date: string;
  type: HealthMetricType;
  value: number;
  sourceName: string;
}

export interface HealthWorkout {
  id?: number;
  date: string;
  activityType: string;
  duration: number;
  totalEnergyBurned?: number;
  totalDistance?: number;
  sourceName: string;
}

export interface ActivitySummary {
  id?: number;
  date: string;
  activeEnergyBurned: number;
  activeEnergyBurnedGoal: number;
  exerciseMinutes: number;
  exerciseMinutesGoal: number;
  standHours: number;
  standHoursGoal: number;
}

export const WORKOUT_TYPE_LABELS: Record<string, string> = {
  Running: '跑步',
  CoreTraining: '核心訓練',
  FunctionalStrengthTraining: '功能性肌力',
  Walking: '步行',
  Cycling: '騎車',
  Swimming: '游泳',
  Yoga: '瑜伽',
  HIIT: '高強度間歇',
  TraditionalStrengthTraining: '重量訓練',
  Elliptical: '橢圓機',
  Rowing: '划船機',
};
