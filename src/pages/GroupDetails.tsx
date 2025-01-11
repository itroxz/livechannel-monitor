import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GroupFormDialog } from "@/components/groups/GroupFormDialog";
import { ChannelFormDialog } from "@/components/groups/ChannelFormDialog";
import { GroupStats } from "@/components/groups/GroupStats";
import { ViewersChart } from "@/components/groups/ViewersChart";
import { ChannelsList } from "@/components/groups/ChannelsList";
import { Plus, ArrowLeft, MoreHorizontal, Pen, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const GroupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: group } = useQuery({
    queryKey: ["group", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["group-channels", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("group_id", id);

      if (error) throw error;
      return data;
    },
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ["group-metrics", id],
    queryFn: async () => {
      const channelIds = channels.map((channel) => channel.id);
      
      if (channelIds.length === 0) return [];

      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .in("channel_id", channelIds)
        .order("timestamp", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: channels.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

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
      queryClient.invalidateQueries({ queryKey: ["group-channels", id] });
    } catch (error) {
      console.error("Erro ao excluir canal:", error);
      toast.error("Erro ao excluir canal. Tente novamente.");
    }
  };

  // Get the most recent metrics for each channel
  const getLatestMetrics = () => {
    const latestMetricsByChannel = new Map();
    metrics.forEach((metric) => {
      const existing = latestMetricsByChannel.get(metric.channel_id);
      if (!existing || new Date(metric.timestamp) > new Date(existing.timestamp)) {
        latestMetricsByChannel.set(metric.channel_id, metric);
      }
    });
    return Array.from(latestMetricsByChannel.values());
  };

  const latestMetrics = getLatestMetrics();
  const totalChannels = channels.length;
  const liveChannels = latestMetrics.filter((m) => m.is_live).length;
  const totalViewers = latestMetrics
    .filter((m) => m.is_live)
    .reduce((sum, m) => sum + m.viewers_count, 0);

  const chartData = metrics
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((metric) => ({
      timestamp: new Date(metric.timestamp).toLocaleTimeString(),
      viewers: metric.viewers_count,
    }));

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center justify-between w-full">
          <h1 className="text-3xl font-bold">{group?.name}</h1>
          <div className="flex items-center gap-4">
            <ChannelFormDialog
              groupId={id!}
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Canal
                </Button>
              }
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <GroupFormDialog
                    groupId={id}
                    trigger={
                      <button className="w-full flex items-center">
                        <Pen className="mr-2 h-4 w-4" /> Editar Grupo
                      </button>
                    }
                  />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <AlertDialog>
                    <AlertDialogTrigger className="w-full flex items-center text-destructive">
                      <Trash className="mr-2 h-4 w-4" /> Excluir Grupo
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Grupo</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <GroupStats
        totalChannels={totalChannels}
        liveChannels={liveChannels}
        totalViewers={totalViewers}
      />

      <ViewersChart data={chartData} />

      <ChannelsList
        channels={channels}
        groupId={id!}
        onDeleteChannel={handleDeleteChannel}
      />
    </div>
  );
};

export default GroupDetails;