import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ChartTooltip } from "./ChartTooltip";
import { filterDataByTimeRange, aggregateChartData } from "./ChartUtils";
import { ViewerData } from "./types";

interface ViewersChartProps {
  data: ViewerData[];
  timeRange?: number;
}

export function ViewersChart({ data, timeRange = 1 }: ViewersChartProps) {
  const filteredData = filterDataByTimeRange(data, timeRange);
  console.log("Dados filtrados para o gráfico:", filteredData);
  
  const chartData = aggregateChartData(filteredData);
  console.log("Dados agregados para o gráfico:", chartData);
  
  const peakViewers = chartData.length > 0 
    ? Math.max(...chartData.map(d => d.totalViewers))
    : 0;

  if (chartData.length === 0) {
    return (
      <div className="flex justify-center items-center h-[400px] text-muted-foreground">
        Sem dados disponíveis
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Pico de viewers no período: <span className="font-medium text-foreground">{peakViewers}</span>
        </div>
      </div>
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
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine 
              y={peakViewers} 
              stroke="#ff0000" 
              strokeDasharray="3 3"
              label={{ 
                value: `Pico: ${peakViewers}`,
                position: 'right',
                fill: '#ff0000',
                fontSize: 12
              }}
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
    </div>
  );
}