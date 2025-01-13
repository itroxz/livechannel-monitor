import { Button } from "@/components/ui/button";
import { TimeRange } from "@/types/history";

interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

export function TimeRangeSelector({ selectedRange, onRangeChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button 
        size="sm"
        variant={selectedRange === "30min" ? "default" : "outline"}
        onClick={() => onRangeChange("30min")}
      >
        30 minutos
      </Button>
      <Button 
        size="sm"
        variant={selectedRange === "1h" ? "default" : "outline"}
        onClick={() => onRangeChange("1h")}
      >
        1 hora
      </Button>
      <Button 
        size="sm"
        variant={selectedRange === "5h" ? "default" : "outline"}
        onClick={() => onRangeChange("5h")}
      >
        5 horas
      </Button>
      <Button 
        size="sm"
        variant={selectedRange === "1d" ? "default" : "outline"}
        onClick={() => onRangeChange("1d")}
      >
        1 dia
      </Button>
      <Button 
        size="sm"
        variant={selectedRange === "custom" ? "default" : "outline"}
        onClick={() => onRangeChange("custom")}
      >
        Personalizado
      </Button>
    </div>
  );
}