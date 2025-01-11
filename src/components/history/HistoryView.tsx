import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ViewersChart } from "@/components/groups/ViewersChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { addHours, addMinutes, subHours, subMinutes, subDays } from "date-fns";

interface Channel {
  id: string;
  channel_name: string;
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
  
  const getTimeRange = () => {
    const now = new Date();
    switch (selectedRange) {
      case "30min":
        return subMinutes(now, 30);
      case "1h":
        return subHours(now, 1);
      case "5h":
        return subHours(now, 5);
      case "1d":
        return subDays(now, 1);
      default:
        return subHours(now, 1);
    }
  };

  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("channels").select("*");
      if (error) throw error;
      return data as Channel[];
    },
  });

  const { data: metrics = [], refetch } = useQuery({
    queryKey: ["metrics", selectedRange],
    queryFn: async () => {
      const startTime = getTimeRange();
      
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .gte("timestamp", startTime.toISOString())
        .order("timestamp", { ascending: true });
      
      if (error) throw error;
      console.log("Fetched metrics:", data); // Debug log
      return data as Metric[];
    },
    refetchInterval: 30000,
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
        </CardHeader>
        <CardContent>
          <ViewersChart data={chartData} channels={channels} />
        </CardContent>
      </Card>
    </div>
  );
}