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

export function ViewersChart({ data }: ViewersChartProps) {
  // Processar os dados para o gráfico
  const processedData = data.reduce((acc, curr) => {
    const timestamp = curr.timestamp;
    if (!acc[timestamp]) {
      acc[timestamp] = {
        timestamp,
        total: 0,
      };
    }
    acc[timestamp].total += curr.viewers;
    return acc;
  }, {} as Record<string, any>);

  // Converter para array e ordenar
  const chartData = Object.values(processedData)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Dados placeholder para quando não houver dados
  const placeholderData = Array.from({ length: 10 }).map((_, index) => ({
    timestamp: new Date(Date.now() - (9 - index) * 1000 * 60).toISOString(),
    total: 0
  }));

  const finalChartData = chartData.length > 0 ? chartData : placeholderData;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      return (
        <div className="bg-white border rounded-lg p-4 shadow-lg">
          <p className="font-medium mb-2">
            {new Date(label).toLocaleTimeString()}
          </p>
          <p className="font-medium text-lg">
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
          data={finalChartData}
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
            dataKey="total"
            stroke="#9b87f5"
            strokeWidth={2}
            dot={false}
            name="Total Viewers"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}