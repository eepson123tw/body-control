import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
}

export default function StatCard({ title, value, unit, change, changeLabel, icon }: StatCardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) return <Minus size={14} className="text-slate-400" />;
    if (change > 0) return <TrendingUp size={14} className="text-red-400" />;
    return <TrendingDown size={14} className="text-green-400" />;
  };

  const getChangeColor = () => {
    if (change === undefined || change === 0) return 'text-slate-400';
    if (change > 0) return 'text-red-400';
    return 'text-green-400';
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{title}</span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${getChangeColor()}`}>
          {getTrendIcon()}
          <span>{change > 0 ? '+' : ''}{change.toFixed(1)}</span>
          {changeLabel && <span className="text-slate-500">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}
