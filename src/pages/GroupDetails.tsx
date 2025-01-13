import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GroupStats } from "@/components/groups/GroupStats";
import { ViewersChart } from "@/components/groups/ViewersChart";
import { ChannelsList } from "@/components/groups/ChannelsList";
import { useState } from "react";
import { useMetrics } from "@/hooks/useMetrics";
import { toast } from "sonner";
import { GroupHeader } from "@/components/groups/GroupHeader";
import { TimeRangeSelector } from "@/components/groups/TimeRangeSelector";
import { useGroupData } from "@/hooks/useGroupData";

const GroupDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<number>(1);
  const { calculateViewerStats } = useMetrics();

  if (!id) {
    navigate("/");
    return null;
  }

  const { group, channels, metrics } = useGroupData(id);

  // Calculate peak viewers from metrics within the selected time range
  const calculatePeakViewers = () => {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - timeRange * 60 * 60 * 1000);
    const filteredMetrics = metrics.filter(m => new Date(m.timestamp) > cutoffTime);
    return filteredMetrics.length > 0
      ? Math.max(...filteredMetrics.map(m => m.viewers_count))
      : 0;
  };

  const peakViewers = calculatePeakViewers();

  const handleDeleteGroup = async () => {
    try {
      const { error } = await supabase.from("groups").delete().eq("id", id);
      if (error) throw error;
      toast.success("Grupo excluído com sucesso!");
      navigate("/");
    } catch (error) {
      console.error("Erro ao excluir grupo:", error);
      toast.error("Erro ao excluir grupo. Tente novamente.");
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      const { error } = await supabase.from("channels").delete().eq("id", channelId);
      if (error) throw error;
      toast.success("Canal excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir canal:", error);
      toast.error("Erro ao excluir canal. Tente novamente.");
    }
  };

  const channelIds = channels.map(channel => channel.id);
  const stats = calculateViewerStats(channelIds);

  const chartData = metrics
    .map((metric) => {
      const channel = channels.find(c => c.id === metric.channel_id);
      return {
        timestamp: metric.timestamp,
        viewers: metric.viewers_count,
        channelName: channel?.channel_name || 'Unknown',
      };
    });

  return (
    <div className="p-8">
      <GroupHeader
        groupId={id}
        groupName={group?.name}
        onBack={() => navigate("/")}
        onDeleteGroup={handleDeleteGroup}
      />

      <GroupStats
        totalChannels={channels.length}
        liveChannels={stats.liveChannelsCount}
        totalViewers={stats.totalViewers}
        peakViewers={peakViewers}
      />

      <div className="mb-8">
        <TimeRangeSelector
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
        <ViewersChart data={chartData} timeRange={timeRange} />
      </div>

      <ChannelsList
        channels={channels}
        groupId={id}
        onDeleteChannel={handleDeleteChannel}
      />
    </div>
  );
};

export default GroupDetails;