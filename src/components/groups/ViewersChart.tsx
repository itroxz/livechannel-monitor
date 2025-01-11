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
  "#9b87f5",
  "#0EA5E9",
  "#F97316",
  "#D946EF",
  "#22c55e",
  "#8B5CF6",
  "#06b6d4",
  "#ec4899",
];

export function ViewersChart({ data, channels }: ViewersChartProps) {
  // Primeiro, vamos agrupar os dados por timestamp
  const groupedData = data.reduce((acc: Record<string, Record<string, number>>, curr) => {
    const timestamp = new Date(curr.timestamp).toISOString();
    
    if (!acc[timestamp]) {
      acc[timestamp] = {};
      // Inicializa todos os canais com 0 para este timestamp
      channels.forEach(channel => {
        acc[timestamp][channel.channel_name] = 0;
      });
    }
    
    // Atualiza o valor do canal específico
    acc[timestamp][curr.channelName] = curr.viewers;
    
    return acc;
  }, {});

  // Converte o objeto agrupado em um array ordenado por timestamp
  const processedData = Object.entries(groupedData)
    .map(([timestamp, values]) => ({
      timestamp,
      ...values
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  console.log("Processed data for chart:", processedData);

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
        <AreaChart
          data={processedData}
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
            <Area
              key={channel.id}
              type="monotone"
              dataKey={channel.channel_name}
              stackId="1"
              stroke={COLORS[index % COLORS.length]}
              fill={COLORS[index % COLORS.length]}
              fillOpacity={0.3}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}