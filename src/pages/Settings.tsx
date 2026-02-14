import { useState, useEffect, useRef } from 'react';
import { Save, Download, Upload, Apple, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { UserProfile } from '../types';
import { parseAppleHealthExport } from '../utils/appleHealthParser';
import { isShortcutJSON, parseShortcutJSON } from '../utils/shortcutImporter';

export default function Settings() {
  const profile = useLiveQuery(() => db.userProfile.toCollection().first());
  const [form, setForm] = useState<UserProfile>({
    heightCm: 173,
    gender: '男',
    age: 32,
    targetBodyFatPercentage: 20,
    targetWeight: 72,
    dailyProteinGoal: 120,
    dailyCalorieGoal: 1800,
  });
  const [saved, setSaved] = useState(false);

  // Apple Health import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ metrics: number; workouts: number; activities: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const healthMetricCount = useLiveQuery(() => db.healthMetrics.count()) ?? 0;
  const healthWorkoutCount = useLiveQuery(() => db.healthWorkouts.count()) ?? 0;
  const activityCount = useLiveQuery(() => db.activitySummaries.count()) ?? 0;

  useEffect(() => {
    if (profile) {
      setForm(profile);
    }
  }, [profile]);

  async function handleSave() {
    if (profile?.id) {
      await db.userProfile.update(profile.id, form);
    } else {
      await db.userProfile.add(form);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleAppleHealthImport() {
    fileInputRef.current?.click();
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      if (file.name.endsWith('.json')) {
        // Shortcut JSON format
        const text = await file.text();
        const data = JSON.parse(text);

        if (!isShortcutJSON(data)) {
          throw new Error('JSON 格式不正確，需包含 bodyMass / bodyFat / workouts 等欄位');
        }

        const result = parseShortcutJSON(data);
        setImportProgress(50);

        // Merge — append to existing data (don't clear, allow incremental sync)
        if (result.metrics.length > 0) {
          // Deduplicate by date+type
          const existing = await db.healthMetrics.toArray();
          const existingKeys = new Set(existing.map((m) => `${m.date}|${m.type}|${m.value}`));
          const newMetrics = result.metrics.filter((m) => !existingKeys.has(`${m.date}|${m.type}|${m.value}`));
          if (newMetrics.length > 0) await db.healthMetrics.bulkAdd(newMetrics);
        }
        if (result.workouts.length > 0) {
          const existing = await db.healthWorkouts.toArray();
          const existingKeys = new Set(existing.map((w) => `${w.date}|${w.activityType}|${w.duration}`));
          const newWorkouts = result.workouts.filter((w) => !existingKeys.has(`${w.date}|${w.activityType}|${w.duration}`));
          if (newWorkouts.length > 0) await db.healthWorkouts.bulkAdd(newWorkouts);
        }

        setImportProgress(100);
        setImportResult({
          metrics: result.metrics.length,
          workouts: result.workouts.length,
          activities: 0,
        });
      } else {
        // Apple Health XML format
        const result = await parseAppleHealthExport(file, setImportProgress);

        await db.healthMetrics.clear();
        await db.healthWorkouts.clear();
        await db.activitySummaries.clear();

        if (result.metrics.length > 0) {
          await db.healthMetrics.bulkAdd(result.metrics);
        }
        if (result.workouts.length > 0) {
          await db.healthWorkouts.bulkAdd(result.workouts);
        }
        if (result.activitySummaries.length > 0) {
          await db.activitySummaries.bulkAdd(result.activitySummaries);
        }

        setImportResult({
          metrics: result.metrics.length,
          workouts: result.workouts.length,
          activities: result.activitySummaries.length,
        });
      }
    } catch (err) {
      alert(`匯入失敗：${err instanceof Error ? err.message : '未知錯誤'}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function clearHealthData() {
    if (!confirm('確定要清除所有 Apple Health 匯入的數據嗎？')) return;
    await db.healthMetrics.clear();
    await db.healthWorkouts.clear();
    await db.activitySummaries.clear();
    setImportResult(null);
  }

  async function handleExport() {
    const data = {
      inbodyRecords: await db.inbodyRecords.toArray(),
      dietEntries: await db.dietEntries.toArray(),
      trainingSessions: await db.trainingSessions.toArray(),
      userProfile: await db.userProfile.toArray(),
      healthMetrics: await db.healthMetrics.toArray(),
      healthWorkouts: await db.healthWorkouts.toArray(),
      activitySummaries: await db.activitySummaries.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inbody-control-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.inbodyRecords) {
          await db.inbodyRecords.clear();
          await db.inbodyRecords.bulkAdd(data.inbodyRecords.map(({ id: _id, ...r }: Record<string, unknown>) => r));
        }
        if (data.dietEntries) {
          await db.dietEntries.clear();
          await db.dietEntries.bulkAdd(data.dietEntries.map(({ id: _id, ...r }: Record<string, unknown>) => r));
        }
        if (data.trainingSessions) {
          await db.trainingSessions.clear();
          await db.trainingSessions.bulkAdd(data.trainingSessions.map(({ id: _id, ...r }: Record<string, unknown>) => r));
        }
        if (data.userProfile) {
          await db.userProfile.clear();
          await db.userProfile.bulkAdd(data.userProfile.map(({ id: _id, ...r }: Record<string, unknown>) => r));
        }
        if (data.healthMetrics) {
          await db.healthMetrics.clear();
          await db.healthMetrics.bulkAdd(data.healthMetrics.map(({ id: _id, ...r }: Record<string, unknown>) => r));
        }
        if (data.healthWorkouts) {
          await db.healthWorkouts.clear();
          await db.healthWorkouts.bulkAdd(data.healthWorkouts.map(({ id: _id, ...r }: Record<string, unknown>) => r));
        }
        if (data.activitySummaries) {
          await db.activitySummaries.clear();
          await db.activitySummaries.bulkAdd(data.activitySummaries.map(({ id: _id, ...r }: Record<string, unknown>) => r));
        }
        alert('匯入成功！');
      } catch {
        alert('匯入失敗：檔案格式不正確');
      }
    };
    input.click();
  }

  function setField(key: keyof UserProfile, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: key === 'gender' ? value : parseFloat(value) || 0,
    }));
  }

  const hasHealthData = healthMetricCount + healthWorkoutCount + activityCount > 0;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">設定</h1>

      {/* Apple Health Import */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 space-y-4">
        <div className="flex items-center gap-2">
          <Apple size={20} className="text-slate-300" />
          <h2 className="font-semibold text-slate-300">Apple Health 匯入</h2>
        </div>

        <p className="text-xs text-slate-400">
          支援兩種格式：完整匯出 export.xml 或 iOS 捷徑產生的 JSON。
          JSON 格式為增量合併（不覆蓋），可重複匯入。
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,.json"
          onChange={onFileSelected}
          className="hidden"
        />

        {importing ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>解析中...</span>
              <span>{importProgress}%</span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={handleAppleHealthImport}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg transition-colors text-sm"
          >
            <Upload size={16} /> 選擇 XML 或 JSON 匯入
          </button>
        )}

        {importResult && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm space-y-1">
            <p className="text-green-400 font-medium">匯入完成！</p>
            <p className="text-slate-300">健康指標：{importResult.metrics} 筆</p>
            <p className="text-slate-300">運動紀錄：{importResult.workouts} 筆</p>
            <p className="text-slate-300">活動摘要：{importResult.activities} 天</p>
          </div>
        )}

        {hasHealthData && !importResult && (
          <div className="bg-slate-700/50 rounded-lg p-3 text-sm space-y-1">
            <p className="text-slate-300">已匯入數據：{healthMetricCount} 筆指標 / {healthWorkoutCount} 筆運動 / {activityCount} 天活動</p>
          </div>
        )}

        {hasHealthData && (
          <button
            onClick={clearHealthData}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 size={12} /> 清除 Apple Health 數據
          </button>
        )}
      </div>

      {/* Profile */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 space-y-4">
        <h2 className="font-semibold text-slate-300">個人資料</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">身高 (cm)</label>
            <input
              type="number"
              value={form.heightCm || ''}
              onChange={(e) => setField('heightCm', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">年齡</label>
            <input
              type="number"
              value={form.age || ''}
              onChange={(e) => setField('age', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">性別</label>
            <select
              value={form.gender}
              onChange={(e) => setField('gender', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 space-y-4">
        <h2 className="font-semibold text-slate-300">目標設定</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">目標體脂率 (%)</label>
            <input
              type="number"
              value={form.targetBodyFatPercentage || ''}
              onChange={(e) => setField('targetBodyFatPercentage', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">目標體重 (kg)</label>
            <input
              type="number"
              value={form.targetWeight || ''}
              onChange={(e) => setField('targetWeight', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Nutrition Goals */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 space-y-4">
        <h2 className="font-semibold text-slate-300">每日營養目標</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">蛋白質 (g)</label>
            <input
              type="number"
              value={form.dailyProteinGoal || ''}
              onChange={(e) => setField('dailyProteinGoal', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">熱量 (kcal)</label>
            <input
              type="number"
              value={form.dailyCalorieGoal || ''}
              onChange={(e) => setField('dailyCalorieGoal', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition-colors"
      >
        <Save size={16} />
        {saved ? '已儲存 ✓' : '儲存設定'}
      </button>

      {/* Data Management */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 space-y-3">
        <h2 className="font-semibold text-slate-300">資料管理</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-lg transition-colors text-sm"
          >
            <Download size={16} /> 匯出 JSON
          </button>
          <button
            onClick={handleImport}
            className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-lg transition-colors text-sm"
          >
            <Upload size={16} /> 匯入 JSON
          </button>
        </div>
        <p className="text-xs text-slate-500">匯入會覆蓋現有資料，請先匯出備份。</p>
      </div>
    </div>
  );
}
