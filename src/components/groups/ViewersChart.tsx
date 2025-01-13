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
} from "recharts";
import { format, parseISO } from "date-fns";

interface ViewersChartProps {
  data: Array<{
    timestamp: string;
    viewers: number;
    channelName: string;
  }>;
  timeRange?: number; // em horas
}

type CustomTooltipProps = TooltipProps<number, string> & {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: {
      timestamp: string;
      totalViewers: number;
      channels: Record<string, number>;
    };
  }>;
  label?: string;
};

export function ViewersChart({ data, timeRange = 1 }: ViewersChartProps) {
  // Filtrar dados pelo intervalo de tempo
  const filterDataByTimeRange = () => {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - timeRange * 60 * 60 * 1000);
    return data.filter(item => new Date(item.timestamp) > cutoffTime);
  };

  // Agregar dados por minuto e por canal
  const aggregateData = () => {
    const filteredData = filterDataByTimeRange();
    console.log("Filtered data:", filteredData);
    
    const aggregatedByMinute: Record<string, { 
      timestamp: string;
      totalViewers: number;
      channels: Record<string, number>;
    }> = {};

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
    
    console.log("Aggregated data:", sortedData);
    return sortedData;
  };

  const chartData = aggregateData();

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
                {channel}: {viewers} viewers
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
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
  );
}