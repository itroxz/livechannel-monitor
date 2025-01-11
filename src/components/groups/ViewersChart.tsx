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

const COLORS = [
  "#0ea5e9",
  "#f97316",
  "#8b5cf6",
  "#22c55e",
  "#ef4444",
  "#f59e0b",
  "#06b6d4",
  "#ec4899",
];

export function ViewersChart({ data, channels }: ViewersChartProps) {
  // Reorganizar dados para ter todos os canais em cada ponto do tempo
  const organizedData = data.reduce((acc, curr) => {
    const timeKey = curr.timestamp;
    if (!acc[timeKey]) {
      acc[timeKey] = {
        timestamp: curr.timestamp,
      };
    }
    acc[timeKey][curr.channelName] = curr.viewers;
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(organizedData);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">
            {new Date(label).toLocaleTimeString()}
          </p>
          {payload.map((entry: any, index: number) => (
            entry.value > 0 && (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {entry.value} viewers
              </p>
            )
          ))}
          <p className="text-sm font-medium mt-2 border-t border-border pt-2">
            Total: {total} viewers
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
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          {channels.map((channel, index) => (
            <Line
              key={channel.id}
              type="monotone"
              dataKey={channel.channel_name}
              stroke={COLORS[index % COLORS.length]}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}