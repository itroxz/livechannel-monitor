import { format, parseISO } from "date-fns";
import { TooltipProps } from "recharts";
import { ChartData } from "./types";

interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ChartData;
  }>;
  label?: string;
}

export function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-3 shadow-xl animate-fade-in">
        <p className="font-medium text-sm">{format(parseISO(label || ''), "HH:mm")}</p>
        <p className="text-lg font-bold text-primary mt-1">
          {data.totalViewers.toLocaleString()} viewers
        </p>
        <div className="mt-2 space-y-1.5 max-h-[200px] overflow-y-auto">
          {Object.entries(data.channels)
            .sort(([, a], [, b]) => b - a)
            .map(([channel, viewers]) => (
              <div key={channel} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground truncate">{channel}</span>
                <span className="font-medium tabular-nums">
                  {viewers.toLocaleString()}
                </span>
              </div>
            ))}
        </div>
      </div>
    );
  }
  return null;
}