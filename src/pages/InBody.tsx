import { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, Check, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { useInBody } from '../hooks/useInBody';
import { useHealthMetrics } from '../hooks/useHealthData';
import type { InBodyRecord } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';

const METRICS = [
  { key: 'weight', label: '體重', unit: 'kg', color: '#3b82f6', healthType: 'bodyMass' as const },
  { key: 'bodyFatPercentage', label: '體脂率', unit: '%', color: '#ef4444', healthType: 'bodyFat' as const },
  { key: 'skeletalMuscleMass', label: '肌肉量', unit: 'kg', color: '#22c55e', healthType: undefined },
  { key: 'bmi', label: 'BMI', unit: '', color: '#f59e0b', healthType: 'bmi' as const },
] as const;

const emptyForm: Omit<InBodyRecord, 'id'> = {
  date: new Date().toISOString().slice(0, 10),
  weight: 0,
  skeletalMuscleMass: 0,
  bodyFatMass: 0,
  bmi: 0,
  bodyFatPercentage: 0,
  waistHipRatio: 0,
  visceralFatLevel: 0,
  basalMetabolicRate: 0,
  score: 0,
};

export default function InBody() {
  const { records, addRecord, updateRecord, deleteRecord } = useInBody();
  const healthWeight = useHealthMetrics('bodyMass');
  const healthFat = useHealthMetrics('bodyFat');
  const healthBmi = useHealthMetrics('bmi');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [activeMetric, setActiveMetric] = useState<string>('weight');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // Merge InBody + Apple Health data for charts
  const mergedChartData = useMemo(() => {
    const selectedMetric = METRICS.find((m) => m.key === activeMetric)!;
    const healthMap: Record<string, number> = {};

    if (selectedMetric.healthType) {
      const healthData = selectedMetric.healthType === 'bodyMass' ? healthWeight
        : selectedMetric.healthType === 'bodyFat' ? healthFat
        : healthBmi;
      for (const m of healthData) {
        healthMap[m.date] = m.value;
      }
    }

    const allDates = new Set<string>();
    records.forEach((r) => allDates.add(r.date));
    Object.keys(healthMap).forEach((d) => allDates.add(d));

    const sorted = [...allDates].sort();
    return sorted.map((date) => {
      const inbody = records.find((r) => r.date === date);
      const inbodyVal = inbody ? (inbody[selectedMetric.key as keyof InBodyRecord] as number) : undefined;
      const healthVal = healthMap[date];
      return {
        date,
        InBody: inbodyVal ?? null,
        'Apple Health': healthVal ?? null,
      };
    });
  }, [records, healthWeight, healthFat, healthBmi, activeMetric]);

  const hasHealthData = healthWeight.length > 0 || healthFat.length > 0 || healthBmi.length > 0;

  function openAdd() {
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(record: InBodyRecord) {
    const { id, ...rest } = record;
    setForm(rest);
    setEditId(id!);
    setShowForm(true);
  }

  async function handleSave() {
    if (form.weight <= 0) {
      setToast({ visible: true, message: '體重不可為 0', type: 'error' as const });
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await updateRecord(editId, form);
      } else {
        await addRecord(form);
      }
      setShowForm(false);
      setToast({ visible: true, message: '已儲存', type: 'success' as const });
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (confirmDelete == null) return;
    await deleteRecord(confirmDelete);
    setConfirmDelete(null);
    setToast({ visible: true, message: '已刪除', type: 'success' as const });
  }

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: key === 'date' ? value : parseFloat(value) || 0 }));
  }

  const closeToast = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);

  const selectedMetric = METRICS.find((m) => m.key === activeMetric)!;
  const reversed = [...records].reverse();

  const formFields = [
    { key: 'date', label: '日期', type: 'date' },
    { key: 'weight', label: '體重 (kg)', required: true },
    { key: 'skeletalMuscleMass', label: '骨骼肌量 (kg)' },
    { key: 'bodyFatMass', label: '體脂肪量 (kg)' },
    { key: 'bmi', label: 'BMI' },
    { key: 'bodyFatPercentage', label: '體脂率 (%)' },
    { key: 'waistHipRatio', label: '腰臀比' },
    { key: 'visceralFatLevel', label: '內臟脂肪等級' },
    { key: 'basalMetabolicRate', label: '基礎代謝率 (kcal)' },
    { key: 'score', label: 'InBody 分數' },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">InBody 數據</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-lg transition-colors min-h-[44px]"
        >
          <Plus size={16} /> 新增
        </button>
      </div>

      {/* Empty state */}
      {records.length === 0 && !hasHealthData && (
        <div className="bg-bg-surface rounded-xl p-8 border border-border-default text-center">
          <p className="text-text-muted mb-4">尚無 InBody 量測紀錄</p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2.5 rounded-lg transition-colors min-h-[44px]"
          >
            <Plus size={16} /> 新增第一筆量測
          </button>
        </div>
      )}

      {/* Trend Chart — merged InBody + Apple Health */}
      {mergedChartData.length > 1 && (
        <div className="bg-bg-surface rounded-xl p-4 border border-border-default">
          <div className="flex gap-2 mb-4 flex-wrap">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setActiveMetric(m.key)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors min-h-[44px] min-w-[44px] ${
                  activeMetric === m.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-bg-elevated text-text-secondary hover:opacity-80'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mergedChartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
              <XAxis
                dataKey="date"
                stroke="var(--color-chart-axis)"
                tick={{ fill: 'var(--color-chart-tick)', fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                stroke="var(--color-chart-axis)"
                tick={{ fill: 'var(--color-chart-tick)', fontSize: 12 }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-chart-tooltip-bg)',
                  border: '1px solid var(--color-chart-tooltip-border)',
                  borderRadius: '8px',
                  color: 'var(--color-chart-tooltip-text)',
                }}
              />
              {hasHealthData && <Legend wrapperStyle={{ fontSize: 12 }} />}
              <Line
                type="monotone"
                dataKey="InBody"
                stroke={selectedMetric.color}
                strokeWidth={2}
                dot={{ fill: selectedMetric.color, r: 4 }}
                connectNulls
                name="InBody"
              />
              {hasHealthData && selectedMetric.healthType && (
                <Line
                  type="monotone"
                  dataKey="Apple Health"
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#f97316', r: 3 }}
                  connectNulls
                  name="Apple Health"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comparison */}
      {records.length >= 2 && (
        <div className="bg-bg-surface rounded-xl p-4 border border-border-default">
          <h2 className="text-sm font-semibold text-text-secondary mb-3">前後對比</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted">
                  <th className="text-left py-1">指標</th>
                  <th className="text-right py-1">{records[0].date.slice(5)}</th>
                  <th className="text-right py-1">{records[records.length - 1].date.slice(5)}</th>
                  <th className="text-right py-1">變化</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map(({ key, label, unit }) => {
                  const first = records[0][key] as number;
                  const last = records[records.length - 1][key] as number;
                  const diff = last - first;
                  const isGoodDown = key === 'weight' || key === 'bodyFatPercentage' || key === 'bmi';
                  const colorClass = diff < 0
                    ? (isGoodDown ? 'text-green-400' : 'text-red-400')
                    : diff > 0
                    ? (isGoodDown ? 'text-red-400' : 'text-green-400')
                    : '';
                  return (
                    <tr key={key} className="border-t border-border-default">
                      <td className="py-2">{label}</td>
                      <td className="text-right">{first}{unit}</td>
                      <td className="text-right">{last}{unit}</td>
                      <td className={`text-right ${colorClass}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}{unit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apple Health Body Records */}
      {healthWeight.length > 0 && (
        <div className="bg-bg-surface rounded-xl p-4 border border-orange-500/20">
          <h2 className="text-sm font-semibold text-orange-400 mb-3">
            Apple Health 體組成紀錄
            <span className="text-xs text-text-muted ml-2 font-normal">
              來源：{healthWeight[0]?.sourceName}
            </span>
          </h2>
          <div className="relative">
            <div className="space-y-1.5 max-h-48 overflow-y-auto scroll-mask">
              {[...healthWeight].reverse().map((m, i) => {
                const fat = healthFat.find((f) => f.date === m.date);
                const bmi = healthBmi.find((b) => b.date === m.date);
                return (
                  <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border-default last:border-0">
                    <span className="text-orange-400 text-xs">{m.date}</span>
                    <div className="flex gap-3 text-xs">
                      <span>{m.value}kg</span>
                      {fat && <span className="text-red-400">{fat.value}%</span>}
                      {bmi && <span className="text-amber-400">BMI {bmi.value.toFixed(1)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Records List */}
      {records.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary">InBody 量測紀錄</h2>
          {reversed.map((record) => (
            <div
              key={record.id}
              className="bg-bg-surface rounded-xl p-4 border border-border-default transition-transform active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-blue-400">{record.date}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(record)}
                    className="p-2 text-text-muted hover:text-text-primary rounded-lg"
                    aria-label="編輯紀錄"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(record.id!)}
                    className="p-2 text-text-muted hover:text-red-400 rounded-lg"
                    aria-label="刪除紀錄"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><span className="text-text-muted">體重</span> <span className="font-medium">{record.weight}kg</span></div>
                <div><span className="text-text-muted">體脂</span> <span className="font-medium">{record.bodyFatPercentage}%</span></div>
                <div><span className="text-text-muted">肌肉</span> <span className="font-medium">{record.skeletalMuscleMass}kg</span></div>
                <div><span className="text-text-muted">BMI</span> <span className="font-medium">{record.bmi}</span></div>
                <div><span className="text-text-muted">BMR</span> <span className="font-medium">{record.basalMetabolicRate}</span></div>
                <div><span className="text-text-muted">分數</span> <span className="font-medium">{record.score}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div
          className="fixed inset-0 bg-bg-overlay z-50 flex items-end sm:items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={() => setShowForm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="inbody-form-title"
            className="bg-bg-surface rounded-xl w-full max-w-md max-h-[85vh] flex flex-col border border-border-strong"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border-strong shrink-0">
              <h3 id="inbody-form-title" className="font-semibold">{editId ? '編輯' : '新增'}量測紀錄</h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-text-muted hover:text-text-primary rounded-lg"
                aria-label="關閉"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              {formFields.map(({ key, label, type, required }) => (
                <div key={key}>
                  <label htmlFor={`inbody-${key}`} className="block text-sm text-text-muted mb-1">
                    {label}{required && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  <input
                    id={`inbody-${key}`}
                    type={type || 'number'}
                    step="any"
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setField(key, e.target.value)}
                    className="w-full bg-bg-input border border-border-strong rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDelete != null}
        title="刪除紀錄"
        message="確定要刪除這筆 InBody 量測紀錄嗎？此操作無法復原。"
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
