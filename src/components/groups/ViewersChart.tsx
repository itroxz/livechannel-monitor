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
  Area,
  AreaChart,
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

  const gradientId = "viewersGradient";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Pico de viewers no período: <span className="font-medium text-foreground">{peakViewers}</span>
        </div>
      </div>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 30,
              left: 10,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false}
              stroke="#f0f0f0"
            />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) => format(parseISO(value), "HH:mm")}
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toLocaleString()}
              dx={-10}
            />
            <Tooltip 
              content={<ChartTooltip />}
              cursor={{
                stroke: '#f0f0f0',
                strokeWidth: 2,
                strokeDasharray: "5 5"
              }}
            />
            <ReferenceLine 
              y={peakViewers} 
              stroke="#ff6b6b" 
              strokeDasharray="3 3"
              strokeWidth={2}
              label={{ 
                value: `Pico: ${peakViewers.toLocaleString()}`,
                position: 'right',
                fill: '#ff6b6b',
                fontSize: 12,
                fontWeight: 'bold'
              }}
            />
            <Area
              type="monotone"
              dataKey="totalViewers"
              stroke="#8884d8"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 6,
                stroke: "#8884d8",
                strokeWidth: 2,
                fill: "#ffffff"
              }}
              animationDuration={1000}
              animationEasing="ease-in-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}