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
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{format(parseISO(label || ''), "HH:mm")}</p>
        <p className="text-sm text-muted-foreground mt-1">Total: {data.totalViewers} viewers</p>
        <div className="mt-2 space-y-1">
          {Object.entries(data.channels).map(([channel, viewers]) => (
            <p key={channel} className="text-sm">
              {channel}: {viewers.toString()} viewers
            </p>
          ))}
        </div>
      </div>
    );
  }
  return null;
}