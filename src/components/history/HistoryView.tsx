import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ViewersChart } from "@/components/groups/ViewersChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartLineIcon } from "lucide-react";

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

export function HistoryView() {
  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("channels").select("*");
      if (error) throw error;
      return data as Channel[];
    },
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ["metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .order("timestamp", { ascending: true });
      if (error) throw error;
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
          <CardTitle className="flex items-center gap-2">
            <ChartLineIcon className="h-4 w-4" />
            Histórico de Viewers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ViewersChart data={chartData} channels={channels} />
        </CardContent>
      </Card>
    </div>
  );
}