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
      className="hover:shadow-lg transition-shadow cursor-pointer" 
      onClick={() => navigate(`/groups/${id}`)}
    >
      <CardHeader>
        <CardTitle className="text-xl">{name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex items-center gap-4">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {totalChannels} canais ({liveChannels} ao vivo)
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {totalViewers} espectadores
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}