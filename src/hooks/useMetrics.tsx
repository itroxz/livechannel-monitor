import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Metric } from "@/types/history";

export function useMetrics() {
  const { data: metrics = [] } = useQuery({
    queryKey: ["metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .order("timestamp", { ascending: false });
      
      if (error) throw error;
      console.log("Dados brutos das métricas:", data);
      return data as Metric[];
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  const getLatestMetrics = () => {
    const latestMetricsByChannel = new Map<string, Metric>();
    
    metrics.forEach((metric) => {
      if (!latestMetricsByChannel.has(metric.channel_id)) {
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
    const totalViewers = liveChannels.reduce((sum, m) => sum + m.viewers_count, 0);
    
    console.log("Calculando estatísticas de visualização:", {
      metricsCount: metrics.length,
      relevantMetrics,
      liveChannels,
      totalViewers
    });

    return {
      totalViewers,
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