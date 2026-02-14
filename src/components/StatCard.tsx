import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  invertColors?: boolean; // true = up is good (muscle mass), false = down is good (weight, fat)
}

export default function StatCard({ title, value, unit, change, changeLabel, icon, invertColors = false }: StatCardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) return <Minus size={14} className="text-text-muted" />;
    if (change > 0) return <TrendingUp size={14} className={invertColors ? 'text-green-400' : 'text-red-400'} />;
    return <TrendingDown size={14} className={invertColors ? 'text-red-400' : 'text-green-400'} />;
  };

  const getChangeColor = () => {
    if (change === undefined || change === 0) return 'text-text-muted';
    if (change > 0) return invertColors ? 'text-green-400' : 'text-red-400';
    return invertColors ? 'text-red-400' : 'text-green-400';
  };

  const changeAriaLabel = change !== undefined && change !== 0
    ? `${title}${change > 0 ? '上升' : '下降'} ${Math.abs(change).toFixed(1)}${unit || ''}`
    : undefined;

  return (
    <div className="bg-bg-surface rounded-xl p-4 border border-border-default transition-transform active:scale-[0.98]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-text-muted">{title}</span>
        {icon && <span className="text-text-faint">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="text-sm text-text-muted">{unit}</span>}
      </div>
      {change !== undefined && (
        <div
          className={`flex items-center gap-1 mt-1 text-xs ${getChangeColor()}`}
          aria-label={changeAriaLabel}
        >
          {getTrendIcon()}
          <span>{change > 0 ? '+' : ''}{change.toFixed(1)}</span>
          {changeLabel && <span className="text-text-faint">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}
