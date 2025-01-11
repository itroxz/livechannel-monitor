import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ChannelForm } from "./ChannelForm";

interface ChannelFormDialogProps {
  groupId: string;
  channelId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ChannelFormDialog({ groupId, channelId, trigger, onSuccess }: ChannelFormDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Novo Canal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{channelId ? "Editar Canal" : "Novo Canal"}</DialogTitle>
        </DialogHeader>
        <ChannelForm groupId={groupId} channelId={channelId} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}