import { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/Sidebar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { GroupCard } from "@/components/dashboard/GroupCard";
import { GroupFormDialog } from "@/components/groups/GroupFormDialog";
import { Users, Video, Eye, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
}

interface Channel {
  id: string;
  group_id: string;
}

interface Metric {
  channel_id: string;
  viewers_count: number;
  is_live: boolean;
  timestamp: string;
}

const Index = () => {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao fazer logout");
      return;
    }
    navigate("/login");
  };

  const { data: groups = [], refetch: refetchGroups } = useQuery({
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
    refetchInterval: 30000, // Refetch every 30 seconds
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

  const getGroupStats = (groupId: string) => {
    const groupChannels = channels.filter((channel) => channel.group_id === groupId);
    const channelIds = groupChannels.map((channel) => channel.id);
    const latestMetrics = getLatestMetrics();
    const groupMetrics = latestMetrics.filter((metric) => 
      channelIds.includes(metric.channel_id)
    );

    const liveChannels = groupMetrics.filter((metric) => metric.is_live);
    const totalViewers = liveChannels.reduce(
      (sum, metric) => sum + metric.viewers_count,
      0
    );

    return {
      totalChannels: groupChannels.length,
      liveChannels: liveChannels.length,
      totalViewers,
    };
  };

  const latestMetrics = getLatestMetrics();
  const totalChannels = channels.length;
  const liveChannels = latestMetrics.filter((m) => m.is_live).length;
  const totalViewers = latestMetrics
    .filter((m) => m.is_live)
    .reduce((sum, m) => sum + m.viewers_count, 0);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="flex gap-4">
              <GroupFormDialog onSuccess={refetchGroups} />
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <StatsCard
              title="Total de Canais"
              value={totalChannels.toString()}
              icon={<Video className="h-4 w-4 text-muted-foreground" />}
            />
            <StatsCard
              title="Canais ao Vivo"
              value={liveChannels.toString()}
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
            />
            <StatsCard
              title="Total de Espectadores"
              value={totalViewers.toString()}
              icon={<Eye className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          <h2 className="text-2xl font-bold mb-4">Grupos</h2>
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
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;