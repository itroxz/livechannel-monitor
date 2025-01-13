import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GroupCardProps {
  id: string;
  name: string;
  totalChannels: number;
  liveChannels: number;
  totalViewers: number;
}

export function GroupCard({
  id,
  name,
  totalChannels,
  liveChannels,
  totalViewers,
}: GroupCardProps) {
  const navigate = useNavigate();

  return (
    <Card 
      className="bg-white/50 backdrop-blur-sm border-none shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group" 
      onClick={() => navigate(`/groups/${id}`)}
    >
      <CardHeader>
        <CardTitle className="text-xl font-semibold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent group-hover:from-purple-600 group-hover:to-primary transition-all duration-200">
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex items-center gap-4">
            <Users className="h-4 w-4 text-primary/80" />
            <div className="text-sm text-muted-foreground">
              {totalChannels.toLocaleString('pt-BR')} canais ({liveChannels.toLocaleString('pt-BR')} ao vivo)
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Eye className="h-4 w-4 text-primary/80" />
            <div className="text-sm text-muted-foreground">
              {totalViewers.toLocaleString('pt-BR')} espectadores
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}