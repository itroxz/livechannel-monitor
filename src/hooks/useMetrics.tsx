import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Metric {
  channel_id: string;
  viewers_count: number;
  is_live: boolean;
  timestamp: string;
}

export function useMetrics() {
  const { data: metrics = [] } = useQuery({
    queryKey: ["metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .order("timestamp", { ascending: false });
      if (error) throw error;
      return data as Metric[];
    },
    refetchInterval: 30000,
  });

  const getLatestMetrics = () => {
    const latestMetricsByChannel = new Map<string, Metric>();
    
    metrics.forEach((metric) => {
      const existing = latestMetricsByChannel.get(metric.channel_id);
      if (!existing || new Date(metric.timestamp) > new Date(existing.timestamp)) {
        latestMetricsByChannel.set(metric.channel_id, metric);
      }
    });
    
    return Array.from(latestMetricsByChannel.values());
  };

  const calculateViewerStats = (channelIds?: string[]) => {
    const latestMetrics = getLatestMetrics();
    const relevantMetrics = channelIds 
      ? latestMetrics.filter(metric => channelIds.includes(metric.channel_id))
      : latestMetrics;

    const liveChannels = relevantMetrics.filter(m => m.is_live);
    
    return {
      totalViewers: liveChannels.reduce((sum, m) => sum + m.viewers_count, 0),
      liveChannelsCount: liveChannels.length,
      latestMetrics: relevantMetrics,
    };
  };

  return {
    metrics,
    getLatestMetrics,
    calculateViewerStats,
  };
}