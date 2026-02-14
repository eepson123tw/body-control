import { useState, useCallback, useRef } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, X, Check, Loader2, Utensils, Camera, Sparkles } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useDiet } from '../hooks/useDiet';
import type { DietEntry } from '../types';
import { MEAL_LABELS } from '../types';
import { recognizeFood, fileToBase64DataUrl } from '../utils/foodRecognition';
import type { FoodRecognitionResult } from '../utils/foodRecognition';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';

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
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResults, setAiResults] = useState<FoodRecognitionResult[] | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
    if (!form.foodName.trim()) {
      setToast({ visible: true, message: '請輸入食物名稱', type: 'error' as const });
      return;
    }
    setSaving(true);
    try {
      await addEntry({ ...form, date: selectedDate });
      setShowForm(false);
      setToast({ visible: true, message: '已儲存', type: 'success' as const });
    } finally {
      setSaving(false);
    }
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
    setToast({ visible: true, message: '已新增', type: 'success' as const });
  }

  async function handleConfirmDelete() {
    if (confirmDelete == null) return;
    await deleteEntry(confirmDelete);
    setConfirmDelete(null);
    setToast({ visible: true, message: '已刪除', type: 'success' as const });
  }

  async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be selected again
    if (cameraInputRef.current) cameraInputRef.current.value = '';

    const apiKey = profile?.openaiApiKey;
    if (!apiKey) {
      setToast({ visible: true, message: '請先在設定頁面輸入 OpenAI API Key', type: 'error' });
      return;
    }

    setAnalyzing(true);
    setAiResults(null);
    try {
      const base64 = await fileToBase64DataUrl(file);
      setPhotoPreview(base64);
      const results = await recognizeFood(base64, apiKey);
      if (results.length === 0) {
        setToast({ visible: true, message: '無法辨識照片中的食物，請手動輸入', type: 'error' });
        setPhotoPreview(null);
      } else {
        setAiResults(results);
      }
    } catch (err) {
      setToast({ visible: true, message: `辨識失敗：${err instanceof Error ? err.message : '未知錯誤'}`, type: 'error' });
      setPhotoPreview(null);
    } finally {
      setAnalyzing(false);
    }
  }

  function applyAiResult(result: FoodRecognitionResult) {
    setForm((f) => ({
      ...f,
      foodName: result.foodName,
      protein: result.protein,
      calories: result.calories,
    }));
    setAiResults(null);
    setPhotoPreview(null);
    setShowForm(true);
  }

  async function quickAddAiResult(result: FoodRecognitionResult, meal: DietEntry['meal']) {
    await addEntry({
      date: selectedDate,
      meal,
      foodName: result.foodName,
      protein: result.protein,
      calories: result.calories,
    });
    setToast({ visible: true, message: '已新增', type: 'success' });
  }

  async function addAllAiResults(meal: DietEntry['meal']) {
    if (!aiResults) return;
    for (const result of aiResults) {
      await addEntry({
        date: selectedDate,
        meal,
        foodName: result.foodName,
        protein: result.protein,
        calories: result.calories,
      });
    }
    setAiResults(null);
    setPhotoPreview(null);
    setToast({ visible: true, message: `已新增 ${aiResults.length} 項食物`, type: 'success' });
  }

  const closeToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

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

  const hasAnyEntries = allEntries.length > 0;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">飲食紀錄</h1>

      {/* Hidden camera input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-bg-surface rounded-xl p-3 border border-border-default">
        <button
          onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
          className="p-2 text-text-muted hover:text-text-primary rounded-lg"
          aria-label="前一天"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="font-medium">{selectedDate}</span>
        <button
          onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
          className="p-2 text-text-muted hover:text-text-primary rounded-lg"
          aria-label="後一天"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Empty state for entire app */}
      {!hasAnyEntries && entries.length === 0 && (
        <div className="bg-bg-surface rounded-xl p-8 border border-border-default text-center">
          <Utensils size={32} className="text-text-faint mx-auto mb-3" />
          <p className="text-text-muted mb-4">尚無飲食紀錄</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => openAdd('lunch')}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2.5 rounded-lg transition-colors min-h-[44px]"
            >
              <Plus size={16} /> 手動輸入
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={analyzing}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-4 py-2.5 rounded-lg transition-colors min-h-[44px]"
            >
              {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              拍照辨識
            </button>
          </div>
        </div>
      )}

      {/* AI Photo Button — always visible when there are entries */}
      {(hasAnyEntries || entries.length > 0) && (
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={analyzing}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-xl transition-colors text-sm min-h-[44px]"
        >
          {analyzing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              AI 辨識中...
            </>
          ) : (
            <>
              <Camera size={16} />
              拍照辨識食物
            </>
          )}
        </button>
      )}

      {/* AI Results Modal */}
      {aiResults && aiResults.length > 0 && (
        <div
          className="fixed inset-0 bg-bg-overlay z-50 flex items-end sm:items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={() => { setAiResults(null); setPhotoPreview(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-results-title"
            className="bg-bg-surface rounded-xl w-full max-w-md max-h-[85vh] flex flex-col border border-border-strong"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border-strong shrink-0">
              <h3 id="ai-results-title" className="font-semibold flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                AI 辨識結果
              </h3>
              <button
                onClick={() => { setAiResults(null); setPhotoPreview(null); }}
                className="p-2 text-text-muted hover:text-text-primary rounded-lg"
                aria-label="關閉"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              {photoPreview && (
                <img src={photoPreview} alt="拍攝的食物照片" className="w-full h-40 object-cover rounded-lg" />
              )}
              {aiResults.map((result, i) => (
                <div key={i} className="flex items-center justify-between bg-bg-elevated/50 p-3 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{result.foodName}</p>
                    <div className="flex gap-3 text-xs mt-1">
                      <span className="text-blue-400">{result.protein}g 蛋白質</span>
                      <span className="text-amber-400">{result.calories} kcal</span>
                      <span className={`${result.confidence === 'high' ? 'text-green-400' : result.confidence === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                        {result.confidence === 'high' ? '高信心' : result.confidence === 'medium' ? '中信心' : '低信心'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => applyAiResult(result)}
                      className="text-xs bg-bg-elevated hover:opacity-80 px-2.5 py-1.5 rounded-md text-text-secondary transition-colors min-h-[36px]"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => quickAddAiResult(result, form.meal)}
                      className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-2.5 py-1.5 rounded-md transition-colors min-h-[36px]"
                    >
                      新增
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {aiResults.length > 1 && (
              <div className="p-4 border-t border-border-strong shrink-0">
                <button
                  onClick={() => addAllAiResults(form.meal)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition-colors min-h-[44px]"
                >
                  <Check size={16} />
                  全部新增 ({aiResults.length} 項)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Bars */}
      {(hasAnyEntries || entries.length > 0) && (
        <>
          <div className="bg-bg-surface rounded-xl p-4 border border-border-default space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>蛋白質</span>
                <span className={totalProtein >= proteinGoal ? 'text-green-400' : ''}>
                  {totalProtein} / {proteinGoal} g
                </span>
              </div>
              <div className="h-3 bg-bg-elevated rounded-full overflow-hidden">
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
              <div className="h-3 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${totalCalories > calorieGoal ? 'bg-red-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, (totalCalories / calorieGoal) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Meal Groups */}
          {mealGroups.map(({ meal, items }) => (
            <div key={meal} className="bg-bg-surface rounded-xl p-4 border border-border-default">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">{MEAL_LABELS[meal]}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowCommon(true); setForm((f) => ({ ...f, meal })); }}
                    className="text-xs bg-bg-elevated hover:opacity-80 px-3 py-1.5 rounded-md text-text-secondary transition-colors min-h-[44px]"
                  >
                    常用
                  </button>
                  <button
                    onClick={() => openAdd(meal)}
                    className="text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1.5 rounded-md transition-colors min-h-[44px]"
                  >
                    <Plus size={14} className="inline -mt-0.5" /> 新增
                  </button>
                </div>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-text-faint">尚無紀錄</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span>{item.foodName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-blue-400">{item.protein}g</span>
                        <span className="text-amber-400">{item.calories}kcal</span>
                        <button
                          onClick={() => setConfirmDelete(item.id!)}
                          className="p-2 text-text-faint hover:text-red-400 rounded-lg"
                          aria-label={`刪除 ${item.foodName}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Weekly Chart */}
          <div className="bg-bg-surface rounded-xl p-4 border border-border-default">
            <h2 className="text-sm font-semibold text-text-secondary mb-3">近 7 日蛋白質攝取</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                <XAxis dataKey="date" stroke="var(--color-chart-axis)" tick={{ fill: 'var(--color-chart-tick)', fontSize: 12 }} />
                <YAxis stroke="var(--color-chart-axis)" tick={{ fill: 'var(--color-chart-tick)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-chart-tooltip-bg)',
                    border: '1px solid var(--color-chart-tooltip-border)',
                    borderRadius: '8px',
                    color: 'var(--color-chart-tooltip-text)',
                  }}
                />
                <Bar dataKey="protein" fill="#3b82f6" radius={[4, 4, 0, 0]} name="蛋白質 (g)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Add Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-bg-overlay z-50 flex items-end sm:items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={() => setShowForm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="diet-form-title"
            className="bg-bg-surface rounded-xl w-full max-w-md max-h-[85vh] flex flex-col border border-border-strong"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border-strong shrink-0">
              <h3 id="diet-form-title" className="font-semibold">新增 {MEAL_LABELS[form.meal]}</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-text-muted hover:text-text-primary rounded-lg"
                aria-label="關閉"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div>
                <label htmlFor="diet-foodName" className="block text-sm text-text-muted mb-1">
                  食物名稱<span className="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  id="diet-foodName"
                  type="text"
                  value={form.foodName}
                  onChange={(e) => setForm((f) => ({ ...f, foodName: e.target.value }))}
                  className="w-full bg-bg-input border border-border-strong rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="例：雞胸肉 100g"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="diet-protein" className="block text-sm text-text-muted mb-1">蛋白質 (g)</label>
                  <input
                    id="diet-protein"
                    type="number"
                    value={form.protein || ''}
                    onChange={(e) => setForm((f) => ({ ...f, protein: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-bg-input border border-border-strong rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="diet-calories" className="block text-sm text-text-muted mb-1">熱量 (kcal)</label>
                  <input
                    id="diet-calories"
                    type="number"
                    value={form.calories || ''}
                    onChange={(e) => setForm((f) => ({ ...f, calories: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-bg-input border border-border-strong rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="diet-meal" className="block text-sm text-text-muted mb-1">餐別</label>
                <select
                  id="diet-meal"
                  value={form.meal}
                  onChange={(e) => setForm((f) => ({ ...f, meal: e.target.value as DietEntry['meal'] }))}
                  className="w-full bg-bg-input border border-border-strong rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  {Object.entries(MEAL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-border-strong shrink-0">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg transition-colors min-h-[44px]"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Common Foods Modal */}
      {showCommon && (
        <div
          className="fixed inset-0 bg-bg-overlay z-50 flex items-end sm:items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={() => setShowCommon(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="common-foods-title"
            className="bg-bg-surface rounded-xl w-full max-w-md max-h-[70vh] flex flex-col border border-border-strong"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border-strong shrink-0">
              <h3 id="common-foods-title" className="font-semibold">常用食物 — {MEAL_LABELS[form.meal]}</h3>
              <button
                onClick={() => setShowCommon(false)}
                className="p-2 text-text-muted hover:text-text-primary rounded-lg"
                aria-label="關閉"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-2 overflow-y-auto flex-1 min-h-0">
              {COMMON_FOODS.map((food, i) => (
                <button
                  key={i}
                  onClick={() => quickAdd(food, form.meal)}
                  className="w-full flex items-center justify-between bg-bg-elevated/50 hover:bg-bg-elevated p-3 rounded-lg text-sm transition-colors text-left min-h-[44px]"
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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDelete != null}
        title="刪除食物"
        message="確定要刪除這筆飲食紀錄嗎？"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />
    </div>
  );
}
