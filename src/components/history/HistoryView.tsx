import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLineIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format, subMinutes, subHours, subDays } from "date-fns";
import { ViewersChart } from "@/components/groups/ViewersChart";
import * as XLSX from 'xlsx';
import { TimeRange, Channel, Metric } from "@/types/history";
import { TimeRangeSelector } from "./TimeRangeSelector";
import { GroupSelector } from "./GroupSelector";
import { DateTimeSelector } from "./DateTimeSelector";

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

  const { data: metrics = [] } = useQuery({
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
        "Ao Vivo": metric.is_live ? "Sim" : "Não",
        "Pico de Viewers": channel?.peak_viewers_count || 0
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
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <ChartLineIcon className="h-4 w-4" />
                Histórico de Viewers
              </CardTitle>
              <Button onClick={exportToExcel} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GroupSelector 
                selectedGroupId={selectedGroupId}
                onGroupChange={setSelectedGroupId}
              />
              
              <DateTimeSelector
                selectedDate={selectedDate}
                startTime={startTime}
                endTime={endTime}
                onDateChange={(date) => date && setSelectedDate(date)}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
              />
            </div>

            <TimeRangeSelector
              selectedRange={selectedRange}
              onRangeChange={setSelectedRange}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ViewersChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}