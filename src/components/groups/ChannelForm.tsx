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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  platform: z.string().min(1, "Plataforma é obrigatória"),
  username: z.string().min(1, "Nome do usuário é obrigatório"),
});

interface ChannelFormProps {
  groupId: string;
  channelId?: string;
  onSuccess?: () => void;
}

export function ChannelForm({ groupId, channelId, onSuccess }: ChannelFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platform: "",
      username: "",
    },
  });

  const platform = form.watch("platform");

  const fetchTwitchChannelInfo = async (username: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado para realizar esta ação");
        return null;
      }

      const response = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID || '',
          'Authorization': `Bearer ${process.env.TWITCH_CLIENT_SECRET}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Twitch channel info');
      }

      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return {
          channel_id: data.data[0].id,
          channel_name: data.data[0].display_name,
        };
      }
      throw new Error('Canal não encontrado');
    } catch (error) {
      console.error('Error fetching Twitch channel:', error);
      toast.error('Erro ao buscar informações do canal da Twitch');
      return null;
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error("Você precisa estar logado para realizar esta ação");
        return;
      }

      let channelInfo = {
        channel_id: values.username,
        channel_name: values.username
      };

      if (values.platform === 'twitch') {
        const twitchInfo = await fetchTwitchChannelInfo(values.username);
        if (!twitchInfo) {
          return;
        }
        channelInfo = twitchInfo;
      }

      if (channelId) {
        const { error } = await supabase
          .from("channels")
          .update({
            platform: values.platform,
            channel_id: channelInfo.channel_id,
            channel_name: channelInfo.channel_name,
          })
          .eq("id", channelId);

        if (error) {
          if (error.code === "42501") {
            toast.error("Você não tem permissão para atualizar este canal");
            return;
          }
          throw error;
        }
        toast.success("Canal atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("channels")
          .insert({
            group_id: groupId,
            platform: values.platform,
            channel_id: channelInfo.channel_id,
            channel_name: channelInfo.channel_name,
          });

        if (error) {
          if (error.code === "42501") {
            toast.error("Você não tem permissão para criar canais");
            return;
          }
          throw error;
        }
        toast.success("Canal criado com sucesso!");
      }
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao salvar canal:", error);
      toast.error("Erro ao salvar canal. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="platform"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plataforma</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a plataforma" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="twitch">Twitch</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="kick">Kick</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Canal</FormLabel>
              <FormControl>
                <Input 
                  placeholder={`Digite o nome do canal ${platform ? `do ${platform}` : ''}`}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando..." : channelId ? "Atualizar" : "Criar"}
        </Button>
      </form>
    </Form>
  );
}