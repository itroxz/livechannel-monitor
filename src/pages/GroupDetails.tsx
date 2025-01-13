import { useParams } from "react-router-dom";
import { useGroupData } from "@/hooks/useGroupData";
import { GroupHeader } from "@/components/groups/GroupHeader";
import { GroupStats } from "@/components/groups/GroupStats";
import { ChannelsList } from "@/components/groups/ChannelsList";
import { ViewersChart } from "@/components/groups/ViewersChart";
import { useMetrics } from "@/hooks/useMetrics";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function GroupDetails() {
  const { id } = useParams<{ id: string }>();
  if (!id) throw new Error("No group ID provided");

  const { group, channels, metrics } = useGroupData(id);
  const { calculateViewerStats } = useMetrics();

  // Função para chamar o endpoint de métricas do YouTube
  const fetchYoutubeMetrics = async () => {
    try {
      console.log("Iniciando chamada para fetch-youtube-metrics");
      const { data, error } = await supabase.functions.invoke('fetch-youtube-metrics');
      
      if (error) {
        console.error("Erro ao chamar fetch-youtube-metrics:", error);
        return;
      }
      
      console.log("Resposta do fetch-youtube-metrics:", data);
    } catch (error) {
      console.error("Erro ao atualizar métricas do YouTube:", error);
      toast.error("Erro ao atualizar métricas do YouTube");
    }
  };

  // Efeito para iniciar as chamadas periódicas
  useEffect(() => {
    // Primeira chamada imediata
    fetchYoutubeMetrics();

    // Configurar chamadas periódicas a cada 60 segundos
    const interval = setInterval(fetchYoutubeMetrics, 60000);

    // Cleanup ao desmontar o componente
    return () => clearInterval(interval);
  }, []);

  if (!group || !channels) {
    return <div>Carregando...</div>;
  }

  const { totalViewers, liveChannelsCount } = calculateViewerStats(channels.map(c => c.id));
  const peakViewers = channels.reduce((sum, channel) => sum + (channel.peak_viewers_count || 0), 0);

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
      <GroupHeader group={group} />
      <GroupStats
        totalChannels={channels.length}
        liveChannels={liveChannelsCount}
        totalViewers={totalViewers}
        peakViewers={peakViewers}
      />
      <div className="grid gap-8 grid-cols-1">
        <ViewersChart data={chartData} />
        <ChannelsList
          channels={channels}
          groupId={id}
          onDeleteChannel={async (channelId) => {
            try {
              const { error } = await supabase
                .from("channels")
                .delete()
                .eq("id", channelId);

              if (error) throw error;
              toast.success("Canal removido com sucesso!");
            } catch (error) {
              console.error("Error deleting channel:", error);
              toast.error("Erro ao remover canal");
            }
          }}
        />
      </div>
    </div>
  );
}