import { useLiveQuery } from 'dexie-react-hooks';
import { Scale, Percent, Beef, Wind, Heart } from 'lucide-react';
import { db } from '../db';
import { useInBody } from '../hooks/useInBody';
import { useDiet } from '../hooks/useDiet';
import { useTraining } from '../hooks/useTraining';
import { useHealthStats } from '../hooks/useHealthData';
import ProgressRing from '../components/ProgressRing';
import StatCard from '../components/StatCard';
import TrendChart from '../components/TrendChart';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getThisWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function Dashboard() {
  const { records, latest, previous } = useInBody();
  const today = getToday();
  const { totalProtein, totalCalories } = useDiet(today);
  const profile = useLiveQuery(() => db.userProfile.toCollection().first());
  const { sessions } = useTraining();
  const { latestVO2Max, latestRestingHR, todayActivity, workouts: healthWorkouts } = useHealthStats();

  const weekRange = getThisWeekRange();
  const weekSessions = sessions.filter(
    (s) => s.date >= weekRange.start && s.date <= weekRange.end
  );
  const weekHealthWorkouts = healthWorkouts.filter(
    (w) => w.date >= weekRange.start && w.date <= weekRange.end
  );
  const totalWeekWorkouts = weekSessions.length + weekHealthWorkouts.length;

  const startFat = 25.4;
  const targetFat = profile?.targetBodyFatPercentage ?? 20;
  const currentFat = latest?.bodyFatPercentage ?? startFat;
  const totalDrop = startFat - targetFat;
  const currentDrop = startFat - currentFat;
  const progressPct = Math.max(0, Math.min(100, (currentDrop / totalDrop) * 100));

  const proteinGoal = profile?.dailyProteinGoal ?? 120;
  const calorieGoal = profile?.dailyCalorieGoal ?? 1800;

  const weightChange = latest && previous ? latest.weight - previous.weight : undefined;
  const fatChange = latest && previous ? latest.bodyFatPercentage - previous.bodyFatPercentage : undefined;
  const muscleChange = latest && previous ? latest.skeletalMuscleMass - previous.skeletalMuscleMass : undefined;

  const last30 = records.slice(-8);

  // Activity ring percentages
  const movePercent = todayActivity
    ? Math.min(100, (todayActivity.activeEnergyBurned / Math.max(1, todayActivity.activeEnergyBurnedGoal)) * 100)
    : 0;
  const exercisePercent = todayActivity
    ? Math.min(100, (todayActivity.exerciseMinutes / Math.max(1, todayActivity.exerciseMinutesGoal)) * 100)
    : 0;
  const standPercent = todayActivity
    ? Math.min(100, (todayActivity.standHours / Math.max(1, todayActivity.standHoursGoal)) * 100)
    : 0;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">減脂控制台</h1>

      {/* Progress Ring */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700/50 flex flex-col items-center">
        <ProgressRing
          value={progressPct}
          max={100}
          label={`${currentFat}%`}
          sublabel={`目標 ${targetFat}%`}
          color={progressPct >= 100 ? '#22c55e' : '#3b82f6'}
        />
        <p className="mt-3 text-sm text-slate-400">
          體脂率 {startFat}% → {targetFat}%　已完成 {progressPct.toFixed(0)}%
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          title="體重"
          value={latest?.weight ?? '--'}
          unit="kg"
          change={weightChange}
          icon={<Scale size={16} />}
        />
        <StatCard
          title="體脂率"
          value={latest?.bodyFatPercentage ?? '--'}
          unit="%"
          change={fatChange}
          icon={<Percent size={16} />}
        />
        <StatCard
          title="肌肉量"
          value={latest?.skeletalMuscleMass ?? '--'}
          unit="kg"
          change={muscleChange}
          icon={<Beef size={16} />}
        />
      </div>

      {/* Apple Health Stats */}
      {(latestVO2Max || latestRestingHR) && (
        <div className="grid grid-cols-2 gap-3">
          {latestVO2Max && (
            <StatCard
              title="VO2Max"
              value={latestVO2Max.value}
              unit="mL/min·kg"
              icon={<Wind size={16} />}
            />
          )}
          {latestRestingHR && (
            <StatCard
              title="靜息心率"
              value={latestRestingHR.value}
              unit="bpm"
              icon={<Heart size={16} />}
            />
          )}
        </div>
      )}

      {/* Today Activity Rings */}
      {todayActivity && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">今日活動</h2>
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center">
              <ProgressRing
                value={movePercent}
                max={100}
                size={70}
                strokeWidth={6}
                label={`${todayActivity.activeEnergyBurned}`}
                sublabel="kcal"
                color="#ef4444"
              />
              <span className="text-xs text-slate-400 mt-1">活動</span>
            </div>
            <div className="flex flex-col items-center">
              <ProgressRing
                value={exercisePercent}
                max={100}
                size={70}
                strokeWidth={6}
                label={`${todayActivity.exerciseMinutes}`}
                sublabel="分鐘"
                color="#22c55e"
              />
              <span className="text-xs text-slate-400 mt-1">運動</span>
            </div>
            <div className="flex flex-col items-center">
              <ProgressRing
                value={standPercent}
                max={100}
                size={70}
                strokeWidth={6}
                label={`${todayActivity.standHours}`}
                sublabel="小時"
                color="#3b82f6"
              />
              <span className="text-xs text-slate-400 mt-1">站立</span>
            </div>
          </div>
        </div>
      )}

      {/* Today Diet Summary */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">今日飲食</h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>蛋白質</span>
              <span>{totalProtein} / {proteinGoal} g</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (totalProtein / proteinGoal) * 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>熱量</span>
              <span>{totalCalories} / {calorieGoal} kcal</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (totalCalories / calorieGoal) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Training */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-300 mb-2">本週訓練</h2>
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const d = new Date(weekRange.start);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().slice(0, 10);
            const manualDone = weekSessions.some((s) => s.date === dateStr);
            const healthDone = weekHealthWorkouts.some((w) => w.date === dateStr);
            const done = manualDone || healthDone;
            const isToday = dateStr === today;
            return (
              <div
                key={i}
                className={`flex-1 h-8 rounded-md flex items-center justify-center text-xs font-medium ${
                  done
                    ? healthDone && !manualDone
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : isToday
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-slate-700/50 text-slate-500'
                }`}
              >
                {['一', '二', '三', '四', '五', '六', '日'][i]}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          已完成 {totalWeekWorkouts} 次訓練
          {weekHealthWorkouts.length > 0 && (
            <span className="text-orange-400"> (含 Apple Watch {weekHealthWorkouts.length} 次)</span>
          )}
        </p>
      </div>

      {/* Weight Trend */}
      {last30.length > 1 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">體重趨勢</h2>
          <TrendChart data={last30} dataKey="weight" unit=" kg" height={160} />
        </div>
      )}
    </div>
  );
}
