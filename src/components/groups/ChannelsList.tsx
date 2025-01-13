import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ChannelFormDialog } from "@/components/groups/ChannelFormDialog";
import { Users, Pen, Trash } from "lucide-react";
import { useMetrics } from "@/hooks/useMetrics";
import { Badge } from "@/components/ui/badge";

interface Channel {
  id: string;
  channel_name: string;
  platform: string;
  channel_id: string;
}

interface ChannelsListProps {
  channels: Channel[];
  groupId: string;
  onDeleteChannel: (channelId: string) => void;
}

export function ChannelsList({ channels, groupId, onDeleteChannel }: ChannelsListProps) {
  const { metrics } = useMetrics();

  console.log("Todos os metrics:", metrics);
  console.log("Todos os canais:", channels);

  const getChannelLatestMetric = (channelId: string) => {
    if (!metrics || metrics.length === 0) return null;

    const channelMetrics = metrics
      .filter(metric => metric.channel_id === channelId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    console.log(`Métricas para o canal ${channelId}:`, channelMetrics);
    return channelMetrics.length > 0 ? channelMetrics[0] : null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Canais</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {channels.map((channel) => {
            const latestMetric = getChannelLatestMetric(channel.id);
            console.log(`Canal ${channel.channel_name} métricas:`, latestMetric);
            console.log(`Canal ${channel.channel_name} ID:`, channel.id);

            const isLive = latestMetric?.is_live ?? false;
            const viewersCount = latestMetric?.viewers_count ?? 0;

            return (
              <div
                key={channel.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{channel.channel_name}</span>
                  <span className="text-sm text-muted-foreground">
                    {channel.platform}
                  </span>
                  {isLive ? (
                    <Badge variant="default" className="bg-green-500">
                      {viewersCount} assistindo
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Offline</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ChannelFormDialog
                    groupId={groupId}
                    channelId={channel.id}
                    trigger={
                      <Button variant="ghost" size="icon">
                        <Pen className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Canal</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir este canal? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteChannel(channel.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}