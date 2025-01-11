import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartBarIcon, ChartLineIcon, Users, Eye } from "lucide-react";

const GroupDetails = () => {
  const { id } = useParams();

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
      const { data, error } = await supabase
        .from("metrics")
        .select("*")
        .in("channel_id", channelIds)
        .order("timestamp", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: channels.length > 0,
  });

  const totalChannels = channels.length;
  const liveChannels = new Set(
    metrics.filter((m) => m.is_live).map((m) => m.channel_id)
  ).size;
  const totalViewers = metrics
    .filter((m) => m.is_live)
    .reduce((sum, m) => sum + m.viewers_count, 0);

  const chartData = metrics.map((metric) => ({
    timestamp: new Date(metric.timestamp).toLocaleTimeString(),
    viewers: metric.viewers_count,
  }));

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">{group?.name}</h1>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Canais</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChannels}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canais ao Vivo</CardTitle>
            <ChartBarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveChannels}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Viewers</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViewers}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartLineIcon className="h-4 w-4" />
            Evolução de Viewers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ChartContainer
              config={{
                viewers: {
                  theme: {
                    light: "#0ea5e9",
                    dark: "#0ea5e9",
                  },
                },
              }}
            >
              <AreaChart data={chartData}>
                <XAxis dataKey="timestamp" />
                <YAxis />
                <ChartTooltip />
                <Area
                  type="monotone"
                  dataKey="viewers"
                  stroke="#0ea5e9"
                  fill="#0ea5e9"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Canais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{channel.channel_name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {channel.platform}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupDetails;