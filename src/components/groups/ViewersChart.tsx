import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

interface ViewersChartProps {
  data: Array<{
    timestamp: string;
    viewers: number;
    channelName: string;
  }>;
}

export function ViewersChart({ data }: ViewersChartProps) {
  // Agregar dados por minuto
  const aggregatedData = data.reduce((acc, curr) => {
    const minute = format(parseISO(curr.timestamp), "yyyy-MM-dd HH:mm:00");
    
    if (!acc[minute]) {
      acc[minute] = {
        timestamp: minute,
        totalViewers: 0,
      };
    }
    
    acc[minute].totalViewers += curr.viewers;
    return acc;
  }, {} as Record<string, { timestamp: string; totalViewers: number; }>);

  const chartData = Object.values(aggregatedData).sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  if (chartData.length === 0) {
    return (
      <div className="flex justify-center items-center h-[400px] text-muted-foreground">
        Sem dados disponíveis
      </div>
    );
  }

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
          <Tooltip
            labelFormatter={(value) => format(parseISO(value as string), "HH:mm")}
            formatter={(value: number) => [`${value} viewers`, "Total"]}
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
  );
}