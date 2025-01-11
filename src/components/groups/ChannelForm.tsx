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
  FormDescription,
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

  const getPlaceholderText = (platform: string) => {
    switch (platform) {
      case "twitch":
        return "Ex: bigodezerah (apenas o nome do usuário)";
      case "youtube":
        return "Ex: @channelname ou nome do canal";
      case "kick":
        return "Ex: channelname (apenas o nome do usuário)";
      default:
        return "Selecione uma plataforma primeiro";
    }
  };

  const getHelperText = (platform: string) => {
    switch (platform) {
      case "twitch":
        return "Digite apenas o nome do usuário, não a URL completa. Ex: se o canal é https://www.twitch.tv/bigodezerah, digite apenas 'bigodezerah'";
      case "youtube":
        return "Digite o @ do canal ou o nome do canal como aparece na URL";
      case "kick":
        return "Digite apenas o nome do usuário como aparece na URL do canal";
      default:
        return "";
    }
  };

  const fetchTwitchChannelInfo = async (username: string) => {
    try {
      console.log('Fetching Twitch channel info for:', username);
      const response = await fetch(
        'https://yvxmkixhezvdmazculvo.supabase.co/functions/v1/get-twitch-channel',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Error response from Twitch API:', error);
        throw new Error(error.error || 'Falha ao buscar informações do canal');
      }

      const data = await response.json();
      console.log('Twitch API response:', data);
      return {
        channel_id: data.id,
        channel_name: data.display_name,
      };
    } catch (error) {
      console.error('Error fetching Twitch channel:', error);
      throw new Error('Canal não encontrado. Verifique se o nome do usuário está correto.');
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
        try {
          const twitchInfo = await fetchTwitchChannelInfo(values.username);
          if (!twitchInfo) {
            return;
          }
          channelInfo = twitchInfo;
        } catch (error) {
          toast.error(error.message);
          return;
        }
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
                  placeholder={getPlaceholderText(platform)}
                  {...field}
                />
              </FormControl>
              {platform && (
                <FormDescription>
                  {getHelperText(platform)}
                </FormDescription>
              )}
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