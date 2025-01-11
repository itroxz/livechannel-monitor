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

// Define better colors for the chart lines
const COLORS = [
  "#9b87f5", // Primary Purple
  "#0EA5E9", // Ocean Blue
  "#F97316", // Bright Orange
  "#D946EF", // Magenta Pink
  "#22c55e", // Green
  "#8B5CF6", // Vivid Purple
  "#06b6d4", // Cyan
  "#ec4899", // Pink
];

export function ViewersChart({ data, channels }: ViewersChartProps) {
  // Reorganize data to have all channels in each time point
  const organizedData = data.reduce((acc, curr) => {
    const timeKey = curr.timestamp;
    if (!acc[timeKey]) {
      acc[timeKey] = {
        timestamp: curr.timestamp,
      };
      // Initialize all channels with 0 viewers
      channels.forEach((channel) => {
        acc[timeKey][channel.channel_name] = 0;
      });
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
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()} viewers
            </p>
          ))}
          <p className="text-sm font-medium mt-2 border-t border-border pt-2">
            Total: {total.toLocaleString()} viewers
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
          {channels.map((channel, index) => (
            <Line
              key={channel.id}
              type="monotone"
              dataKey={channel.channel_name}
              stroke={COLORS[index % COLORS.length]}
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 4, strokeWidth: 1 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}