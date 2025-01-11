import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface ViewerData {
  timestamp: string;
  viewers: number;
  channelName: string;
}

interface ViewersChartProps {
  data: ViewerData[];
  channels: Array<{
    id: string;
    channel_name: string;
  }>;
}

export function ViewersChart({ data, channels }: ViewersChartProps) {
  // Processar os dados para o gráfico
  const processedData = data.reduce((acc, curr) => {
    const timestamp = curr.timestamp;
    if (!acc[timestamp]) {
      acc[timestamp] = {
        timestamp,
        totalViewers: 0,
        channelData: {}
      };
    }
    
    acc[timestamp].totalViewers += curr.viewers;
    acc[timestamp].channelData[curr.channelName] = curr.viewers;
    
    return acc;
  }, {} as Record<string, { 
    timestamp: string; 
    totalViewers: number; 
    channelData: Record<string, number>; 
  }>);

  // Converter para array e ordenar
  const chartData = Object.values(processedData)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  console.log("Dados processados para o gráfico:", chartData);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border rounded-lg p-4 shadow-lg">
          <p className="font-medium mb-2">
            {new Date(label).toLocaleTimeString()}
          </p>
          <p className="font-medium text-lg mb-2">
            Total: {data.totalViewers.toLocaleString()} viewers
          </p>
          <div className="space-y-1">
            {Object.entries(data.channelData).map(([channel, viewers]) => (
              <p key={channel} className="text-sm">
                {channel}: {Number(viewers).toLocaleString()} viewers
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
            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
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