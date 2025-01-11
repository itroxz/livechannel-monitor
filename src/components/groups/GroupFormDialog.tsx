import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { GroupForm } from "./GroupForm";

interface GroupFormDialogProps {
  groupId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function GroupFormDialog({ groupId, trigger, onSuccess }: GroupFormDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Novo Grupo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{groupId ? "Editar Grupo" : "Novo Grupo"}</DialogTitle>
        </DialogHeader>
        <GroupForm groupId={groupId} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}