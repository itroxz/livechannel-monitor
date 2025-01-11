import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/Sidebar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { GroupCard } from "@/components/dashboard/GroupCard";
import { Button } from "@/components/ui/button";
import { Plus, Users, Video, Eye } from "lucide-react";

const Index = () => {
  const [groups] = useState([
    {
      id: 1,
      name: "Grupo 1",
      totalChannels: 5,
      liveChannels: 2,
      totalViewers: 1500,
    },
    {
      id: 2,
      name: "Grupo 2",
      totalChannels: 3,
      liveChannels: 1,
      totalViewers: 800,
    },
  ]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Grupo
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <StatsCard
              title="Total de Canais"
              value="8"
              icon={<Video className="h-4 w-4 text-muted-foreground" />}
            />
            <StatsCard
              title="Canais ao Vivo"
              value="3"
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
            />
            <StatsCard
              title="Total de Espectadores"
              value="2,300"
              icon={<Eye className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          <h2 className="text-2xl font-bold mb-4">Grupos</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                name={group.name}
                totalChannels={group.totalChannels}
                liveChannels={group.liveChannels}
                totalViewers={group.totalViewers}
                onClick={() => console.log(`Clicked group ${group.id}`)}
              />
            ))}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;