import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  TooltipProps,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";

interface ViewersChartProps {
  data: Array<{
    timestamp: string;
    viewers: number;
    channelName: string;
  }>;
  timeRange?: number;
}

interface ChartData {
  timestamp: string;
  totalViewers: number;
  channels: Record<string, number>;
}

type CustomTooltipProps = TooltipProps<number, string> & {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ChartData;
  }>;
  label?: string;
};

export function ViewersChart({ data, timeRange = 1 }: ViewersChartProps) {
  const filterDataByTimeRange = () => {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - timeRange * 60 * 60 * 1000);
    return data.filter(item => new Date(item.timestamp) > cutoffTime);
  };

  const aggregateData = () => {
    const filteredData = filterDataByTimeRange();
    console.log("Dados filtrados para o gráfico:", filteredData);
    
    const aggregatedByMinute: Record<string, ChartData> = {};

    filteredData.forEach((item) => {
      const minute = format(parseISO(item.timestamp), "yyyy-MM-dd HH:mm:00");
      
      if (!aggregatedByMinute[minute]) {
        aggregatedByMinute[minute] = {
          timestamp: minute,
          totalViewers: 0,
          channels: {},
        };
      }
      
      aggregatedByMinute[minute].channels[item.channelName] = item.viewers;
      aggregatedByMinute[minute].totalViewers = Object.values(aggregatedByMinute[minute].channels).reduce((a, b) => a + b, 0);
    });

    const sortedData = Object.values(aggregatedByMinute).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    console.log("Dados agregados para o gráfico:", sortedData);
    return sortedData;
  };

  const chartData = aggregateData();
  const peakViewers = chartData.length > 0 
    ? Math.max(...chartData.map(d => d.totalViewers))
    : 0;

  if (chartData.length === 0) {
    return (
      <div className="flex justify-center items-center h-[400px] text-muted-foreground">
        Sem dados disponíveis
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{format(parseISO(label || ''), "HH:mm")}</p>
          <p className="text-sm text-muted-foreground mt-1">Total: {data.totalViewers} viewers</p>
          <div className="mt-2 space-y-1">
            {Object.entries(data.channels).map(([channel, viewers]) => (
              <p key={channel} className="text-sm">
                {channel}: {viewers.toString()} viewers
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Pico de viewers no período: <span className="font-medium text-foreground">{peakViewers}</span>
        </div>
      </div>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) => format(parseISO(value), "HH:mm")}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine 
              y={peakViewers} 
              stroke="#ff0000" 
              strokeDasharray="3 3"
              label={{ 
                value: `Pico: ${peakViewers}`,
                position: 'right',
                fill: '#ff0000',
                fontSize: 12
              }}
            />
            <Line
              type="monotone"
              dataKey="totalViewers"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}