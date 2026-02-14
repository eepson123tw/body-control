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
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#334155" />}
        {showAxis && (
          <>
            <XAxis
              dataKey={xKey}
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              domain={['auto', 'auto']}
            />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#f1f5f9',
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
