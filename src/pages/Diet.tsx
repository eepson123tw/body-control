import { useState } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useDiet } from '../hooks/useDiet';
import type { DietEntry } from '../types';
import { MEAL_LABELS } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const COMMON_FOODS = [
  { foodName: '雞胸肉 100g', protein: 31, calories: 165 },
  { foodName: '水煮蛋', protein: 6, calories: 70 },
  { foodName: '希臘優格', protein: 15, calories: 100 },
  { foodName: '鮭魚 100g', protein: 25, calories: 208 },
  { foodName: '豆腐 150g', protein: 12, calories: 108 },
  { foodName: '乳清蛋白', protein: 25, calories: 120 },
  { foodName: '白飯一碗', protein: 4, calories: 270 },
  { foodName: '地瓜 200g', protein: 3, calories: 172 },
  { foodName: '香蕉', protein: 1, calories: 105 },
  { foodName: '牛奶 240ml', protein: 8, calories: 150 },
];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function Diet() {
  const [selectedDate, setSelectedDate] = useState(getToday);
  const { entries, totalProtein, totalCalories, addEntry, deleteEntry } = useDiet(selectedDate);
  const profile = useLiveQuery(() => db.userProfile.toCollection().first());
  const [showForm, setShowForm] = useState(false);
  const [showCommon, setShowCommon] = useState(false);

  const proteinGoal = profile?.dailyProteinGoal ?? 120;
  const calorieGoal = profile?.dailyCalorieGoal ?? 1800;

  const [form, setForm] = useState<Omit<DietEntry, 'id'>>({
    date: selectedDate,
    meal: 'lunch',
    foodName: '',
    protein: 0,
    calories: 0,
  });

  function openAdd(meal: DietEntry['meal'] = 'lunch') {
    setForm({ date: selectedDate, meal, foodName: '', protein: 0, calories: 0 });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.foodName) return;
    await addEntry({ ...form, date: selectedDate });
    setShowForm(false);
  }

  async function quickAdd(food: typeof COMMON_FOODS[number], meal: DietEntry['meal']) {
    await addEntry({
      date: selectedDate,
      meal,
      foodName: food.foodName,
      protein: food.protein,
      calories: food.calories,
    });
    setShowCommon(false);
  }

  const mealGroups = (['breakfast', 'lunch', 'dinner', 'snack'] as const).map((meal) => ({
    meal,
    items: entries.filter((e) => e.meal === meal),
  }));

  // Weekly chart data
  const allEntries = useLiveQuery(() => db.dietEntries.orderBy('date').toArray()) ?? [];
  const weekData: { date: string; protein: number; calories: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = shiftDate(selectedDate, -i);
    const dayEntries = allEntries.filter((e) => e.date === d);
    weekData.push({
      date: d.slice(5),
      protein: dayEntries.reduce((s, e) => s + e.protein, 0),
      calories: dayEntries.reduce((s, e) => s + e.calories, 0),
    });
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">飲食紀錄</h1>

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-slate-800 rounded-xl p-3 border border-slate-700/50">
        <button onClick={() => setSelectedDate((d) => shiftDate(d, -1))} className="p-1 text-slate-400 hover:text-white">
          <ChevronLeft size={20} />
        </button>
        <span className="font-medium">{selectedDate}</span>
        <button onClick={() => setSelectedDate((d) => shiftDate(d, 1))} className="p-1 text-slate-400 hover:text-white">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Progress Bars */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>蛋白質</span>
            <span className={totalProtein >= proteinGoal ? 'text-green-400' : ''}>
              {totalProtein} / {proteinGoal} g
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (totalProtein / proteinGoal) * 100)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>熱量</span>
            <span className={totalCalories > calorieGoal ? 'text-red-400' : ''}>
              {totalCalories} / {calorieGoal} kcal
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${totalCalories > calorieGoal ? 'bg-red-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(100, (totalCalories / calorieGoal) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Meal Groups */}
      {mealGroups.map(({ meal, items }) => (
        <div key={meal} className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">{MEAL_LABELS[meal]}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCommon(true); setForm((f) => ({ ...f, meal })); }}
                className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded-md text-slate-300 transition-colors"
              >
                常用
              </button>
              <button
                onClick={() => openAdd(meal)}
                className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-2 py-1 rounded-md transition-colors"
              >
                <Plus size={14} className="inline -mt-0.5" /> 新增
              </button>
            </div>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">尚無紀錄</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>{item.foodName}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400">{item.protein}g</span>
                    <span className="text-amber-400">{item.calories}kcal</span>
                    <button onClick={() => deleteEntry(item.id!)} className="text-slate-500 hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Weekly Chart */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">近 7 日蛋白質攝取</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weekData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f1f5f9',
              }}
            />
            <Bar dataKey="protein" fill="#3b82f6" radius={[4, 4, 0, 0]} name="蛋白質 (g)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="font-semibold">新增 {MEAL_LABELS[form.meal]}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">食物名稱</label>
                <input
                  type="text"
                  value={form.foodName}
                  onChange={(e) => setForm((f) => ({ ...f, foodName: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="例：雞胸肉 100g"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">蛋白質 (g)</label>
                  <input
                    type="number"
                    value={form.protein || ''}
                    onChange={(e) => setForm((f) => ({ ...f, protein: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">熱量 (kcal)</label>
                  <input
                    type="number"
                    value={form.calories || ''}
                    onChange={(e) => setForm((f) => ({ ...f, calories: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">餐別</label>
                <select
                  value={form.meal}
                  onChange={(e) => setForm((f) => ({ ...f, meal: e.target.value as DietEntry['meal'] }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  {Object.entries(MEAL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-slate-700">
              <button
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition-colors"
              >
                <Check size={16} /> 儲存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Common Foods Modal */}
      {showCommon && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md max-h-[70vh] overflow-y-auto border border-slate-700">
            <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800">
              <h3 className="font-semibold">常用食物 — {MEAL_LABELS[form.meal]}</h3>
              <button onClick={() => setShowCommon(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {COMMON_FOODS.map((food, i) => (
                <button
                  key={i}
                  onClick={() => quickAdd(food, form.meal)}
                  className="w-full flex items-center justify-between bg-slate-700/50 hover:bg-slate-700 p-3 rounded-lg text-sm transition-colors text-left"
                >
                  <span>{food.foodName}</span>
                  <div className="flex gap-3 text-xs">
                    <span className="text-blue-400">{food.protein}g</span>
                    <span className="text-amber-400">{food.calories}kcal</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
