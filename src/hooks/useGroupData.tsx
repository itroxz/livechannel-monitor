import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export function useGroupData(groupId: string) {
  const queryClient = useQueryClient();

  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      if (!groupId) throw new Error("No group ID provided");
      
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["group-channels", groupId],
    queryFn: async () => {
      if (!groupId) throw new Error("No group ID provided");

      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("group_id", groupId);

      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ["group-metrics", groupId],
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
    refetchInterval: 30000,
  });

  // Configurar real-time updates para canais
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel('group-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channels',
          filter: `group_id=eq.${groupId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["group-channels", groupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);

  return {
    group,
    channels,
    metrics,
  };
}