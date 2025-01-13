import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLineIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ViewersChart } from "@/components/groups/ViewersChart";
import * as XLSX from 'xlsx';
import { Input } from "@/components/ui/input";

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
  peak_viewers_count: number;
}

type TimeRange = "30min" | "1h" | "5h" | "1d" | "custom";

export function HistoryView() {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("1h");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  
  const getTimeRange = () => {
    const baseDate = selectedDate;
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    if (selectedRange === "custom") {
      const start = new Date(baseDate);
      start.setHours(startHour, startMinute, 0);
      const end = new Date(baseDate);
      end.setHours(endHour, endMinute, 59);
      return { start, end };
    }

    switch (selectedRange) {
      case "30min":
        return { start: subMinutes(baseDate, 30), end: baseDate };
      case "1h":
        return { start: subHours(baseDate, 1), end: baseDate };
      case "5h":
        return { start: subHours(baseDate, 5), end: baseDate };
      case "1d":
        return { start: subDays(baseDate, 1), end: baseDate };
      default:
        return { start: baseDate, end: baseDate };
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
    queryKey: ["metrics", selectedRange, selectedDate.toISOString(), selectedGroupId, startTime, endTime],
    queryFn: async () => {
      const { start, end } = getTimeRange();
      const channelIds = channels.map(c => c.id);
      
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .in("channel_id", channelIds)
        .gte("timestamp", start.toISOString())
        .lte("timestamp", end.toISOString())
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

  const exportToExcel = () => {
    const exportData = metrics.map((metric) => {
      const channel = channels.find((c) => c.id === metric.channel_id);
      return {
        Canal: channel?.channel_name || "Desconhecido",
        "Data e Hora": format(new Date(metric.timestamp), "dd/MM/yyyy HH:mm:ss"),
        "Viewers": metric.viewers_count,
        "Pico de Viewers": metric.peak_viewers_count,
        "Ao Vivo": metric.is_live ? "Sim" : "Não"
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Métricas");
    XLSX.writeFile(wb, `metricas_${format(new Date(), "dd-MM-yyyy_HH-mm")}.xlsx`);
  };

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

              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-32"
                />
                <span>até</span>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-32"
                />
              </div>

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
                <Button 
                  variant={selectedRange === "custom" ? "default" : "outline"}
                  onClick={() => setSelectedRange("custom")}
                >
                  Personalizado
                </Button>
              </div>

              <Button onClick={exportToExcel} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ViewersChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
