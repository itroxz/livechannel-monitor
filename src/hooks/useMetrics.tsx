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
      console.log("Metrics data:", data); // Added for debugging
      return data as Metric[];
    },
    refetchInterval: 30000,
  });

  const getLatestMetrics = () => {
    const latestMetricsByChannel = new Map<string, Metric>();
    
    // Sort metrics by timestamp in descending order to get the most recent first
    const sortedMetrics = [...metrics].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Only take the most recent metric for each channel
    sortedMetrics.forEach((metric) => {
      if (!latestMetricsByChannel.has(metric.channel_id)) {
        latestMetricsByChannel.set(metric.channel_id, metric);
      }
    });
    
    const latestMetrics = Array.from(latestMetricsByChannel.values());
    console.log("Latest metrics:", latestMetrics); // Added for debugging
    return latestMetrics;
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