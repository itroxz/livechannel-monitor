import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Users } from "lucide-react";

interface GroupCardProps {
  name: string;
  totalChannels: number;
  liveChannels: number;
  totalViewers: number;
  onClick?: () => void;
}

export function GroupCard({
  name,
  totalChannels,
  liveChannels,
  totalViewers,
  onClick,
}: GroupCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
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