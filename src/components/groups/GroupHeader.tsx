import { Button } from "@/components/ui/button";
import { GroupFormDialog } from "@/components/groups/GroupFormDialog";
import { ChannelFormDialog } from "@/components/groups/ChannelFormDialog";
import { ArrowLeft, MoreHorizontal, Plus, Pen, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface GroupHeaderProps {
  groupId: string;
  groupName?: string;
  onBack: () => void;
  onDeleteGroup: () => void;
}

export function GroupHeader({ groupId, groupName, onBack, onDeleteGroup }: GroupHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="shrink-0"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center justify-between w-full">
        <h1 className="text-3xl font-bold">{groupName}</h1>
        <div className="flex items-center gap-4">
          <ChannelFormDialog
            groupId={groupId}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Adicionar Canal
              </Button>
            }
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <GroupFormDialog
                  groupId={groupId}
                  trigger={
                    <button className="w-full flex items-center">
                      <Pen className="mr-2 h-4 w-4" /> Editar Grupo
                    </button>
                  }
                />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <AlertDialog>
                  <AlertDialogTrigger className="w-full flex items-center text-destructive">
                    <Trash className="mr-2 h-4 w-4" /> Excluir Grupo
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Grupo</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={onDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}