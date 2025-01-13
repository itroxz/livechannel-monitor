import { Button } from "@/components/ui/button";

interface TimeRangeSelectorProps {
  timeRange: number;
  onTimeRangeChange: (range: number) => void;
}

export function TimeRangeSelector({ timeRange, onTimeRangeChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex justify-end gap-2 mb-4">
      <Button
        variant={timeRange === 1 ? "default" : "outline"}
        onClick={() => onTimeRangeChange(1)}
      >
        1 hora
      </Button>
      <Button
        variant={timeRange === 2 ? "default" : "outline"}
        onClick={() => onTimeRangeChange(2)}
      >
        2 horas
      </Button>
      <Button
        variant={timeRange === 3 ? "default" : "outline"}
        onClick={() => onTimeRangeChange(3)}
      >
        3 horas
      </Button>
      <Button
        variant={timeRange === 4 ? "default" : "outline"}
        onClick={() => onTimeRangeChange(4)}
      >
        4 horas
      </Button>
    </div>
  );
}