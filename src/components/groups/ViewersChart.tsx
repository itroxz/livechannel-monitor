import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
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
  // Agrupar dados por timestamp para calcular o total
  const groupedData = data.reduce((acc, curr) => {
    const existing = acc.find(item => item.timestamp === curr.timestamp);
    if (existing) {
      existing.total = (existing.total || 0) + curr.viewers;
      existing[curr.channelName] = curr.viewers;
    } else {
      acc.push({
        timestamp: curr.timestamp,
        total: curr.viewers,
        [curr.channelName]: curr.viewers,
      });
    }
    return acc;
  }, [] as any[]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
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
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartLineIcon className="h-4 w-4" />
          Evolução de Viewers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={groupedData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
                <Area
                  key={channel.id}
                  type="monotone"
                  dataKey={channel.channel_name}
                  stackId="1"
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}