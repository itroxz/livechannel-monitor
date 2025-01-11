import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { ChartLineIcon } from "lucide-react";

interface ViewerData {
  timestamp: string;
  viewers: number;
  channelName: string;
}

interface ViewersChartProps {
  data: Array<{
    timestamp: string;
    viewers: number;
    channelName: string;
  }>;
  channels: Array<{
    id: string;
    channel_name: string;
  }>;
}

export function ViewersChart({ data, channels }: ViewersChartProps) {
  // Primeiro, vamos criar um Map para armazenar a soma dos viewers por timestamp
  const viewersByTimestamp = new Map<string, number>();
  
  // Processa os dados para somar os viewers de todos os canais no mesmo timestamp
  data.forEach((entry) => {
    const timestamp = new Date(entry.timestamp).toISOString();
    const currentTotal = viewersByTimestamp.get(timestamp) || 0;
    viewersByTimestamp.set(timestamp, currentTotal + entry.viewers);
  });

  // Converte o Map para um array de objetos e ordena por timestamp
  const chartData = Array.from(viewersByTimestamp.entries())
    .map(([timestamp, totalViewers]) => ({
      timestamp,
      totalViewers,
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  console.log("Processed data for chart:", chartData);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">
            {new Date(label).toLocaleTimeString()}
          </p>
          <p className="text-sm font-medium">
            Total: {payload[0].value.toLocaleString()} viewers
          </p>
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
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleTimeString();
            }}
            stroke="#888888"
          />
          <YAxis
            stroke="#888888"
            tickFormatter={(value) => value.toLocaleString()}
          />
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