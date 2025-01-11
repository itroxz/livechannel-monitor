import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/Sidebar";
import { HistoryView } from "@/components/history/HistoryView";

const History = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Histórico</h1>
          </div>
          <HistoryView />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default History;