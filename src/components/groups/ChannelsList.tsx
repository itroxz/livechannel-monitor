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
import { Pen, Trash, TrendingUp, Youtube, Twitch } from "lucide-react";
import { useMetrics } from "@/hooks/useMetrics";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Channel {
  id: string;
  channel_name: string;
  platform: string;
  channel_id: string;
  peak_viewers_count: number;
  peak_viewers_timestamp: string;
}

interface ChannelsListProps {
  channels: Channel[];
  groupId: string;
  onDeleteChannel: (channelId: string) => void;
}

export function ChannelsList({ channels, groupId, onDeleteChannel }: ChannelsListProps) {
  const { metrics } = useMetrics();

  console.log("Métricas disponíveis:", metrics);
  console.log("Canais na lista:", channels);

  const getChannelLatestMetric = (channelId: string) => {
    if (!metrics || metrics.length === 0) {
      console.log(`Nenhuma métrica encontrada para o canal ${channelId}`);
      return null;
    }

    const channelMetrics = metrics
      .filter(metric => metric.channel_id === channelId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    console.log(`Métricas filtradas para o canal ${channelId}:`, channelMetrics);
    
    if (channelMetrics.length > 0) {
      console.log(`Última métrica para o canal ${channelId}:`, channelMetrics[0]);
      return channelMetrics[0];
    }
    
    return null;
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <Youtube className="h-4 w-4 text-[#FF0000]" />;
      case 'twitch':
        return <Twitch className="h-4 w-4 text-[#9146FF]" />;
      case 'tiktok':
        return (
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19.321 5.562a5.124 5.124 0 0 1-3.585-1.476A5.12 5.12 0 0 1 14.262.5h-4.034v13.95c0 1.763-1.435 3.198-3.198 3.198-1.763 0-3.198-1.435-3.198-3.198 0-1.763 1.435-3.198 3.198-3.198.354 0 .69.065 1.005.168v-4.034c-.33-.033-.663-.05-.999-.05C3.154 7.336 0 10.49 0 14.372c0 3.882 3.154 7.036 7.036 7.036 3.882 0 7.036-3.154 7.036-7.036V9.858a9.193 9.193 0 0 0 5.249 1.651v-4.034c0-1.763 1.435-3.198 3.198-3.198h.999V.5h-.999c-1.763 0-3.198 1.435-3.198 3.198v1.864z"
              fill="#000000"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getPlatformStyles = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return 'hover:bg-red-50 border-red-100';
      case 'twitch':
        return 'hover:bg-purple-50 border-purple-100';
      case 'tiktok':
        return 'hover:bg-gray-50 border-gray-100';
      default:
        return 'hover:bg-gray-50 border-gray-100';
    }
  };

  return (
    <Card className="bg-white/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Canais</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {channels.map((channel) => {
            const latestMetric = getChannelLatestMetric(channel.id);
            console.log(`Processando canal ${channel.channel_name}:`, {
              id: channel.id,
              latestMetric,
              peakViewers: channel.peak_viewers_count,
              peakTimestamp: channel.peak_viewers_timestamp
            });

            const isLive = latestMetric?.is_live ?? false;
            const viewersCount = latestMetric?.viewers_count ?? 0;
            const peakViewersCount = channel.peak_viewers_count;
            const peakDate = channel.peak_viewers_timestamp 
              ? format(new Date(channel.peak_viewers_timestamp), "dd/MM/yyyy HH:mm")
              : '';

            return (
              <div
                key={channel.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border transition-colors duration-200",
                  getPlatformStyles(channel.platform)
                )}
              >
                <div className="flex items-center gap-4">
                  {getPlatformIcon(channel.platform)}
                  <span className="font-medium">{channel.channel_name}</span>
                  {isLive ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className={cn(
                        "bg-gradient-to-r shadow-sm",
                        channel.platform.toLowerCase() === 'youtube' ? "from-red-500 to-red-600" :
                        channel.platform.toLowerCase() === 'twitch' ? "from-purple-500 to-purple-600" :
                        "from-gray-500 to-gray-600"
                      )}>
                        {viewersCount.toLocaleString()} assistindo
                      </Badge>
                      {peakViewersCount > 0 && peakDate && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="flex items-center gap-1 bg-white">
                                <TrendingUp className="h-3 w-3" />
                                {peakViewersCount.toLocaleString()}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Pico de {peakViewersCount.toLocaleString()} viewers em {peakDate}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">Offline</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ChannelFormDialog
                    groupId={groupId}
                    channelId={channel.id}
                    trigger={
                      <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                        <Pen className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="hover:bg-gray-100">
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