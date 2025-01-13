import { StatsCard } from "./StatsCard";
import { GroupCard } from "./GroupCard";
import { Users, Video, Eye } from "lucide-react";
import { useMetrics } from "@/hooks/useMetrics";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Group {
  id: string;
  name: string;
}

interface Channel {
  id: string;
  group_id: string;
}

export function Dashboard() {
  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*");
      if (error) throw error;
      return data as Group[];
    },
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("channels").select("*");
      if (error) throw error;
      return data as Channel[];
    },
  });

  const { calculateViewerStats } = useMetrics();

  const getGroupStats = (groupId: string) => {
    const groupChannels = channels.filter((channel) => channel.group_id === groupId);
    const channelIds = groupChannels.map((channel) => channel.id);
    const stats = calculateViewerStats(channelIds);

    return {
      totalChannels: groupChannels.length,
      liveChannels: stats.liveChannelsCount,
      totalViewers: stats.totalViewers,
    };
  };

  const globalStats = calculateViewerStats();

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total de Canais"
          value={channels.length}
          icon={<Video className="h-5 w-5" />}
        />
        <StatsCard
          title="Canais ao Vivo"
          value={globalStats.liveChannelsCount}
          icon={<Users className="h-5 w-5" />}
        />
        <StatsCard
          title="Total de Espectadores"
          value={globalStats.totalViewers}
          icon={<Eye className="h-5 w-5" />}
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#0EA5E9] to-blue-500 bg-clip-text text-transparent">Grupos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const stats = getGroupStats(group.id);
            return (
              <GroupCard
                key={group.id}
                id={group.id}
                name={group.name}
                totalChannels={stats.totalChannels}
                liveChannels={stats.liveChannels}
                totalViewers={stats.totalViewers}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}