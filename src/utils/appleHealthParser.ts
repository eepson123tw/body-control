import type { HealthMetric, HealthWorkout, ActivitySummary } from '../types';

export interface AppleHealthParseResult {
  metrics: Omit<HealthMetric, 'id'>[];
  workouts: Omit<HealthWorkout, 'id'>[];
  activitySummaries: Omit<ActivitySummary, 'id'>[];
}

const METRIC_TYPE_MAP: Record<string, HealthMetric['type']> = {
  HKQuantityTypeIdentifierBodyMass: 'bodyMass',
  HKQuantityTypeIdentifierBodyFatPercentage: 'bodyFat',
  HKQuantityTypeIdentifierBodyMassIndex: 'bmi',
  HKQuantityTypeIdentifierVO2Max: 'vo2max',
  HKQuantityTypeIdentifierRestingHeartRate: 'restingHR',
};

const WORKOUT_TYPE_MAP: Record<string, string> = {
  HKWorkoutActivityTypeRunning: 'Running',
  HKWorkoutActivityTypeCoreTraining: 'CoreTraining',
  HKWorkoutActivityTypeFunctionalStrengthTraining: 'FunctionalStrengthTraining',
  HKWorkoutActivityTypeWalking: 'Walking',
  HKWorkoutActivityTypeCycling: 'Cycling',
  HKWorkoutActivityTypeSwimming: 'Swimming',
  HKWorkoutActivityTypeYoga: 'Yoga',
  HKWorkoutActivityTypeHighIntensityIntervalTraining: 'HIIT',
  HKWorkoutActivityTypeTraditionalStrengthTraining: 'TraditionalStrengthTraining',
  HKWorkoutActivityTypeElliptical: 'Elliptical',
  HKWorkoutActivityTypeRowing: 'Rowing',
};

function extractAttr(line: string, attr: string): string {
  const idx = line.indexOf(`${attr}="`);
  if (idx === -1) return '';
  const start = idx + attr.length + 2;
  const end = line.indexOf('"', start);
  return end === -1 ? '' : line.substring(start, end);
}

function parseDate(dateStr: string): string {
  // "2023-03-18 20:20:32 +0800" → "2023-03-18"
  return dateStr.slice(0, 10);
}

function processLine(line: string, result: AppleHealthParseResult) {
  const trimmed = line.trimStart();

  if (trimmed.startsWith('<Record ')) {
    const type = extractAttr(trimmed, 'type');
    const metricType = METRIC_TYPE_MAP[type];
    if (!metricType) return;

    let value = parseFloat(extractAttr(trimmed, 'value'));
    if (isNaN(value)) return;

    // BodyFatPercentage is stored as decimal (0.246 = 24.6%)
    if (metricType === 'bodyFat') {
      value = Math.round(value * 1000) / 10; // 0.246095 → 24.6
    }

    result.metrics.push({
      date: parseDate(extractAttr(trimmed, 'startDate')),
      type: metricType,
      value,
      sourceName: extractAttr(trimmed, 'sourceName'),
    });
    return;
  }

  if (trimmed.startsWith('<Workout ')) {
    const rawType = extractAttr(trimmed, 'workoutActivityType');
    const activityType = WORKOUT_TYPE_MAP[rawType] || rawType.replace('HKWorkoutActivityType', '');
    const duration = parseFloat(extractAttr(trimmed, 'duration'));
    const energyStr = extractAttr(trimmed, 'totalEnergyBurned');
    const distStr = extractAttr(trimmed, 'totalDistance');

    result.workouts.push({
      date: parseDate(extractAttr(trimmed, 'startDate')),
      activityType,
      duration: Math.round(duration * 10) / 10,
      totalEnergyBurned: energyStr ? Math.round(parseFloat(energyStr)) : undefined,
      totalDistance: distStr ? Math.round(parseFloat(distStr) * 100) / 100 : undefined,
      sourceName: extractAttr(trimmed, 'sourceName'),
    });
    return;
  }

  if (trimmed.startsWith('<ActivitySummary ')) {
    const dateComponents = extractAttr(trimmed, 'dateComponents');
    if (!dateComponents) return;

    result.activitySummaries.push({
      date: dateComponents,
      activeEnergyBurned: Math.round(parseFloat(extractAttr(trimmed, 'activeEnergyBurned')) || 0),
      activeEnergyBurnedGoal: Math.round(parseFloat(extractAttr(trimmed, 'activeEnergyBurnedGoal')) || 0),
      exerciseMinutes: Math.round(parseFloat(extractAttr(trimmed, 'appleExerciseTime')) || 0),
      exerciseMinutesGoal: Math.round(parseFloat(extractAttr(trimmed, 'appleExerciseTimeGoal')) || 0),
      standHours: Math.round(parseFloat(extractAttr(trimmed, 'appleStandHours')) || 0),
      standHoursGoal: Math.round(parseFloat(extractAttr(trimmed, 'appleStandHoursGoal')) || 0),
    });
    return;
  }
}

export async function parseAppleHealthExport(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<AppleHealthParseResult> {
  const result: AppleHealthParseResult = {
    metrics: [],
    workouts: [],
    activitySummaries: [],
  };

  const stream = file.stream();
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();

  let buffer = '';
  let bytesRead = 0;
  const totalSize = file.size;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Approximate bytes read from the decoded string length
    bytesRead += new TextEncoder().encode(value).length;
    buffer += value;

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      processLine(line, result);
    }

    onProgress?.(Math.min(99, Math.round((bytesRead / totalSize) * 100)));
  }

  // Process remaining buffer
  if (buffer) {
    processLine(buffer, result);
  }

  onProgress?.(100);
  return result;
}
