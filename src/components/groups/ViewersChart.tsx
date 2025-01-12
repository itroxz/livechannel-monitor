import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";

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
        total: 0,
      };
    }
    
    acc[timestamp][curr.channelName] = curr.viewers;
    acc[timestamp].total = Object.values(acc[timestamp])
      .filter((value): value is number => typeof value === 'number' && value !== acc[timestamp].total)
      .reduce((sum, value) => sum + value, 0);
    
    return acc;
  }, {} as Record<string, any>);

  // Converter para array e ordenar
  const chartData = Object.values(processedData)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  console.log("Dados processados para o gráfico:", chartData);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
      return (
        <div className="bg-white border rounded-lg p-4 shadow-lg">
          <p className="font-medium mb-2">
            {new Date(label).toLocaleTimeString()}
          </p>
          <p className="font-medium text-lg mb-2">
            Total: {payload.find((p: any) => p.dataKey === 'total')?.value.toLocaleString() || 0} viewers
          </p>
          <div className="space-y-1">
            {payload
              .filter((entry: any) => entry.dataKey !== 'total')
              .map((entry: any) => (
                <p key={entry.dataKey} className="text-sm">
                  {entry.dataKey}: {entry.value?.toLocaleString() || 0} viewers
                </p>
              ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Gerar cores únicas para cada canal
  const colors = [
    "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#a4de6c",
    "#d0ed57", "#83a6ed", "#8dd1e1", "#a4de6c", "#d0ed57"
  ];

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
          <Legend />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#000000"
            strokeWidth={2}
            dot={false}
            name="Total"
          />
          {channels.map((channel, index) => (
            <Line
              key={channel.id}
              type="monotone"
              dataKey={channel.channel_name}
              stroke={colors[index % colors.length]}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}