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
  // Agrupa os dados por timestamp
  const groupedData = data.reduce((acc, curr) => {
    const timestamp = curr.timestamp;
    if (!acc[timestamp]) {
      acc[timestamp] = {
        timestamp,
        totalViewers: 0,
        channels: {}
      };
    }
    acc[timestamp].totalViewers += curr.viewers;
    acc[timestamp].channels[curr.channelName] = curr.viewers;
    return acc;
  }, {} as Record<string, { timestamp: string; totalViewers: number; channels: Record<string, number> }>);

  // Converte para array e ordena por timestamp
  const chartData = Object.values(groupedData)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  console.log("Processed chart data:", chartData);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">
            {new Date(label).toLocaleTimeString()}
          </p>
          <p className="text-sm font-medium mb-2">
            Total: {data.totalViewers.toLocaleString()} viewers
          </p>
          <div className="space-y-1">
            {Object.entries(data.channels).map(([channelName, viewers]) => (
              <p key={channelName} className="text-sm">
                {channelName}: {Number(viewers).toLocaleString()} viewers
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