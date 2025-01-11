import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartLineIcon } from "lucide-react";

interface ViewersChartProps {
  data: Array<{
    timestamp: string;
    viewers: number;
  }>;
}

export function ViewersChart({ data }: ViewersChartProps) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartLineIcon className="h-4 w-4" />
          Evolução de Viewers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ChartContainer
            config={{
              viewers: {
                theme: {
                  light: "#0ea5e9",
                  dark: "#0ea5e9",
                },
              },
            }}
          >
            <ResponsiveContainer>
              <AreaChart data={data}>
                <XAxis dataKey="timestamp" />
                <YAxis />
                <ChartTooltip />
                <Area
                  type="monotone"
                  dataKey="viewers"
                  stroke="#0ea5e9"
                  fill="#0ea5e9"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}