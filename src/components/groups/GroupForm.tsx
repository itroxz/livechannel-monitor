import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  name: z.string().min(1, "Nome do grupo é obrigatório"),
});

interface GroupFormProps {
  groupId?: string;
  onSuccess?: () => void;
}

export function GroupForm({ groupId, onSuccess }: GroupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      if (groupId) {
        const { error } = await supabase
          .from("groups")
          .update({ name: values.name })
          .eq("id", groupId);
        if (error) throw error;
        toast.success("Grupo atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("groups").insert([values]);
        if (error) throw error;
        toast.success("Grupo criado com sucesso!");
      }
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao salvar grupo:", error);
      toast.error("Erro ao salvar grupo. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Grupo</FormLabel>
              <FormControl>
                <Input placeholder="Digite o nome do grupo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando..." : groupId ? "Atualizar" : "Criar"}
        </Button>
      </form>
    </Form>
  );
}