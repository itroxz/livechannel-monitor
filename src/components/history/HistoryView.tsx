import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ViewersChart } from "@/components/groups/ViewersChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { addHours, addMinutes, subHours, subMinutes, subDays, format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Channel {
  id: string;
  channel_name: string;
  group_id: string;
}

interface Group {
  id: string;
  name: string;
}

interface Metric {
  channel_id: string;
  viewers_count: number;
  is_live: boolean;
  timestamp: string;
}

type TimeRange = "30min" | "1h" | "5h" | "1d" | "custom";

export function HistoryView() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("1h");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const getTimeRange = () => {
    const baseDate = selectedDate;
    switch (selectedRange) {
      case "30min":
        return subMinutes(baseDate, 30);
      case "1h":
        return subHours(baseDate, 1);
      case "5h":
        return subHours(baseDate, 5);
      case "1d":
        return subDays(baseDate, 1);
      default:
        return subHours(baseDate, 1);
    }
  };

  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*");
      if (error) throw error;
      return data as Group[];
    },
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["channels", selectedGroupId],
    queryFn: async () => {
      let query = supabase.from("channels").select("*");
      
      if (selectedGroupId) {
        query = query.eq("group_id", selectedGroupId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Channel[];
    },
  });

  const { data: metrics = [], refetch } = useQuery({
    queryKey: ["metrics", selectedRange, selectedDate.toISOString(), selectedGroupId],
    queryFn: async () => {
      const startTime = getTimeRange();
      const channelIds = channels.map(c => c.id);
      
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .in("channel_id", channelIds)
        .gte("timestamp", startTime.toISOString())
        .lte("timestamp", selectedDate.toISOString())
        .order("timestamp", { ascending: true });
      
      if (error) throw error;
      console.log("Fetched metrics:", data);
      return data as Metric[];
    },
    refetchInterval: 30000,
    enabled: channels.length > 0,
  });

  const chartData = metrics.map((metric) => {
    const channel = channels.find((c) => c.id === metric.channel_id);
    return {
      timestamp: metric.timestamp,
      viewers: metric.viewers_count,
      channelName: channel?.channel_name || "Desconhecido",
    };
  });

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <ChartLineIcon className="h-4 w-4" />
              Histórico de Viewers
            </CardTitle>
            <div className="flex gap-4">
              <Select
                value={selectedGroupId || "all"}
                onValueChange={(value) => setSelectedGroupId(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos os grupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    {selectedDate ? (
                      format(selectedDate, "PPP")
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <div className="flex gap-2">
                <Button 
                  variant={selectedRange === "30min" ? "default" : "outline"}
                  onClick={() => setSelectedRange("30min")}
                >
                  30 minutos
                </Button>
                <Button 
                  variant={selectedRange === "1h" ? "default" : "outline"}
                  onClick={() => setSelectedRange("1h")}
                >
                  1 hora
                </Button>
                <Button 
                  variant={selectedRange === "5h" ? "default" : "outline"}
                  onClick={() => setSelectedRange("5h")}
                >
                  5 horas
                </Button>
                <Button 
                  variant={selectedRange === "1d" ? "default" : "outline"}
                  onClick={() => setSelectedRange("1d")}
                >
                  1 dia
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ViewersChart data={chartData} channels={channels} />
        </CardContent>
      </Card>
    </div>
  );
}