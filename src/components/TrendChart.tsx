import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface TrendChartProps {
  data: any[];
  dataKey: string;
  xKey?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showAxis?: boolean;
  unit?: string;
}

export default function TrendChart({
  data,
  dataKey,
  xKey = 'date',
  color = '#3b82f6',
  height = 200,
  showGrid = true,
  showAxis = true,
  unit = '',
}: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />}
        {showAxis && (
          <>
            <XAxis
              dataKey={xKey}
              stroke="var(--color-chart-axis)"
              tick={{ fill: 'var(--color-chart-tick)', fontSize: 12 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              stroke="var(--color-chart-axis)"
              tick={{ fill: 'var(--color-chart-tick)', fontSize: 12 }}
              domain={['auto', 'auto']}
            />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-chart-tooltip-bg)',
            border: '1px solid var(--color-chart-tooltip-border)',
            borderRadius: '8px',
            color: 'var(--color-chart-tooltip-text)',
          }}
          formatter={(value: unknown) => [`${value}${unit}`, dataKey]}
          labelFormatter={(label: unknown) => String(label)}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
