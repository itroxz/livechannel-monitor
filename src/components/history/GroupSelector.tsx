import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Group {
  id: string;
  name: string;
}

interface GroupSelectorProps {
  selectedGroupId: string | null;
  onGroupChange: (groupId: string | null) => void;
}

export function GroupSelector({ selectedGroupId, onGroupChange }: GroupSelectorProps) {
  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*");
      if (error) throw error;
      return data as Group[];
    },
  });

  return (
    <Select
      value={selectedGroupId || "all"}
      onValueChange={(value) => onGroupChange(value === "all" ? null : value)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Todos os grupos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os grupos</SelectItem>
        {groups.map((group) => (
          <SelectItem key={group.id} value={group.id}>
            {group.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}