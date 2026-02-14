import { useState, useCallback } from 'react';
import { Plus, Trash2, X, Check, ChevronLeft, ChevronRight, Watch, Loader2, Dumbbell } from 'lucide-react';
import { useTraining } from '../hooks/useTraining';
import { useHealthWorkouts } from '../hooks/useHealthData';
import type { TrainingSession, Exercise } from '../types';
import { TRAINING_TYPE_LABELS, WORKOUT_TYPE_LABELS } from '../types';
import TrendChart from '../components/TrendChart';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';

const EXERCISE_TEMPLATES: Record<TrainingSession['type'], string[]> = {
  push: ['臥推', '上斜啞鈴臥推', '肩推', '三頭下壓', '側平舉', '飛鳥'],
  pull: ['引體向上', '槓鈴划船', '坐姿划船', '面拉', '二頭彎舉', '滑輪下拉'],
  legs: ['深蹲', '腿推', '羅馬尼亞硬舉', '腿彎舉', '腿伸展', '小腿上提'],
  cardio: ['跑步', '飛輪', '划船機', '橢圓機', '跳繩', '游泳'],
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function Training() {
  const [selectedMonth, setSelectedMonth] = useState(() => getToday().slice(0, 7));
  const { sessions, addSession, deleteSession } = useTraining(selectedMonth);
  const allHealthWorkouts = useHealthWorkouts();
  const monthHealthWorkouts = allHealthWorkouts.filter((w) => w.date.startsWith(selectedMonth));
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<TrainingSession['type']>('push');
  const [formDate, setFormDate] = useState(getToday);
  const [formExercises, setFormExercises] = useState<Exercise[]>([]);
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  function shiftMonth(dir: number) {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  function openAdd() {
    setFormDate(getToday());
    setFormType('push');
    setFormExercises([]);
    setFormNotes('');
    setShowForm(true);
  }

  function addExercise(name: string) {
    setFormExercises((prev) => [...prev, { name, sets: [{ weight: 0, reps: 0 }] }]);
  }

  function removeExercise(idx: number) {
    setFormExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function addSet(exerciseIdx: number) {
    setFormExercises((prev) =>
      prev.map((ex, i) =>
        i === exerciseIdx ? { ...ex, sets: [...ex.sets, { weight: 0, reps: 0 }] } : ex
      )
    );
  }

  function updateSet(exerciseIdx: number, setIdx: number, field: 'weight' | 'reps', value: number) {
    setFormExercises((prev) =>
      prev.map((ex, i) =>
        i === exerciseIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, [field]: value } : s)),
            }
          : ex
      )
    );
  }

  function removeSet(exerciseIdx: number, setIdx: number) {
    setFormExercises((prev) =>
      prev.map((ex, i) =>
        i === exerciseIdx ? { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx) } : ex
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await addSession({
        date: formDate,
        type: formType,
        exercises: formExercises,
        notes: formNotes || undefined,
      });
      setShowForm(false);
      setToast({ visible: true, message: '已儲存', type: 'success' as const });
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (confirmDelete == null) return;
    await deleteSession(confirmDelete);
    setConfirmDelete(null);
    setToast({ visible: true, message: '已刪除', type: 'success' as const });
  }

  const closeToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

  // Calendar
  const [year, month] = selectedMonth.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const calendarOffset = firstDay === 0 ? 6 : firstDay - 1;

  const trainedDates = new Set(sessions.map((s) => s.date));
  const healthDates = new Set(monthHealthWorkouts.map((w) => w.date));

  // Volume trend
  const allSessions = useTraining().sessions;
  const volumeData = allSessions.slice(-20).map((s) => ({
    date: s.date,
    volume: s.exercises.reduce(
      (sum, ex) => sum + ex.sets.reduce((ss, set) => ss + set.weight * set.reps, 0),
      0
    ),
  }));

  const monthLabel = `${year}年${month}月`;
  const hasAnySessions = allSessions.length > 0 || allHealthWorkouts.length > 0;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">訓練紀錄</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-lg transition-colors min-h-[44px]"
        >
          <Plus size={16} /> 新增
        </button>
      </div>

      {/* Empty state */}
      {!hasAnySessions && (
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700/50 text-center">
          <Dumbbell size={32} className="text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400 mb-4">尚無訓練紀錄</p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2.5 rounded-lg transition-colors min-h-[44px]"
          >
            <Plus size={16} /> 開始你的第一次訓練
          </button>
        </div>
      )}

      {hasAnySessions && (
        <>
          {/* Calendar */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => shiftMonth(-1)}
                className="p-2 text-slate-400 hover:text-white rounded-lg"
                aria-label="上個月"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="font-medium">{monthLabel}</span>
              <button
                onClick={() => shiftMonth(1)}
                className="p-2 text-slate-400 hover:text-white rounded-lg"
                aria-label="下個月"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
                <div key={d} className="text-slate-500 py-1">{d}</div>
              ))}
              {Array.from({ length: calendarOffset }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                const trained = trainedDates.has(dateStr);
                const healthTrained = healthDates.has(dateStr);
                const isToday = dateStr === getToday();
                return (
                  <div
                    key={day}
                    className={`py-1.5 rounded-md text-sm ${
                      trained
                        ? 'bg-green-500/20 text-green-400 font-medium'
                        : healthTrained
                        ? 'bg-orange-500/20 text-orange-400 font-medium'
                        : isToday
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              {monthLabel} 已訓練 {sessions.length + monthHealthWorkouts.length} 次
              {monthHealthWorkouts.length > 0 && (
                <span className="text-orange-400"> (含 Apple Watch {monthHealthWorkouts.length} 次)</span>
              )}
            </p>
          </div>

          {/* Session List */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-300">訓練紀錄</h2>
            {[...sessions].reverse().map((session) => (
              <div key={session.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 transition-transform active:scale-[0.98]">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-sm text-blue-400">{session.date}</span>
                    <span className="ml-2 text-xs bg-slate-700 px-2 py-0.5 rounded-full">
                      {TRAINING_TYPE_LABELS[session.type]}
                    </span>
                  </div>
                  <button
                    onClick={() => setConfirmDelete(session.id!)}
                    className="p-2 text-slate-400 hover:text-red-400 rounded-lg"
                    aria-label="刪除訓練紀錄"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="space-y-1 text-sm">
                  {session.exercises.map((ex, i) => (
                    <div key={i} className="flex justify-between text-slate-300">
                      <span>{ex.name}</span>
                      <span className="text-slate-500">
                        {ex.sets.map((s) => `${s.weight}kg×${s.reps}`).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
                {session.notes && (
                  <p className="text-xs text-slate-500 mt-2">{session.notes}</p>
                )}
              </div>
            ))}
            {sessions.length === 0 && monthHealthWorkouts.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">本月尚無訓練紀錄</p>
            )}
          </div>

          {/* Apple Health Workouts */}
          {monthHealthWorkouts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-orange-400 flex items-center gap-1.5">
                <Watch size={14} /> Apple Watch 運動紀錄
              </h2>
              {[...monthHealthWorkouts].reverse().map((w) => (
                <div key={w.id} className="bg-slate-800 rounded-xl p-4 border border-orange-500/20 transition-transform active:scale-[0.98]">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="text-sm text-orange-400">{w.date}</span>
                      <span className="ml-2 text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full">
                        {WORKOUT_TYPE_LABELS[w.activityType] || w.activityType}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm text-slate-400 mt-1">
                    <span>{w.duration.toFixed(0)} 分鐘</span>
                    {w.totalEnergyBurned != null && <span>{w.totalEnergyBurned} kcal</span>}
                    {w.totalDistance != null && w.totalDistance > 0 && <span>{w.totalDistance} km</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Volume Trend */}
          {volumeData.length > 1 && (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">訓練量趨勢</h2>
              <TrendChart data={volumeData} dataKey="volume" unit=" kg" color="#22c55e" height={160} />
            </div>
          )}
        </>
      )}

      {/* Add Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="training-form-title"
            className="bg-slate-800 rounded-xl w-full max-w-md max-h-[85vh] overflow-y-auto border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <h3 id="training-form-title" className="font-semibold">新增訓練紀錄</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg"
                aria-label="關閉"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="training-date" className="block text-sm text-slate-400 mb-1">日期</label>
                  <input
                    id="training-date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="training-type" className="block text-sm text-slate-400 mb-1">類型</label>
                  <select
                    id="training-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as TrainingSession['type'])}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {Object.entries(TRAINING_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Exercise Templates */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">快速加入動作</label>
                <div className="flex flex-wrap gap-1.5">
                  {EXERCISE_TEMPLATES[formType].map((name) => (
                    <button
                      key={name}
                      onClick={() => addExercise(name)}
                      className="text-xs bg-slate-700 hover:bg-slate-600 px-2.5 py-1.5 rounded-md text-slate-300 transition-colors min-h-[44px]"
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercise List */}
              {formExercises.map((ex, exIdx) => (
                <div key={exIdx} className="bg-slate-900/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{ex.name}</span>
                    <button
                      onClick={() => removeExercise(exIdx)}
                      className="p-2 text-slate-500 hover:text-red-400 rounded-lg"
                      aria-label={`移除 ${ex.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {ex.sets.map((set, setIdx) => (
                    <div key={setIdx} className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 w-8">#{setIdx + 1}</span>
                      <input
                        type="number"
                        placeholder="kg"
                        aria-label={`${ex.name} 第 ${setIdx + 1} 組重量`}
                        value={set.weight || ''}
                        onChange={(e) => updateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)}
                        className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-slate-500">×</span>
                      <input
                        type="number"
                        placeholder="次"
                        aria-label={`${ex.name} 第 ${setIdx + 1} 組次數`}
                        value={set.reps || ''}
                        onChange={(e) => updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)}
                        className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                      />
                      {ex.sets.length > 1 && (
                        <button
                          onClick={() => removeSet(exIdx, setIdx)}
                          className="p-2 text-slate-500 hover:text-red-400 rounded-lg"
                          aria-label="移除這組"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addSet(exIdx)}
                    className="text-xs text-blue-400 hover:text-blue-300 min-h-[44px] px-2"
                  >
                    + 新增一組
                  </button>
                </div>
              ))}

              <div>
                <label htmlFor="training-notes" className="block text-sm text-slate-400 mb-1">備註</label>
                <input
                  id="training-notes"
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="選填"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 sticky bottom-0 bg-slate-800">
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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDelete != null}
        title="刪除訓練紀錄"
        message="確定要刪除這筆訓練紀錄嗎？此操作無法復原。"
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
