import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Mail, MailOpen } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Message {
  id: string;
  sujet: string;
  contenu: string;
  created_at: string;
  lu: boolean | null;
  type_destinataire: string | null;
  classe_id: string | null;
}

export function StagiaireMessagesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMessages();
    }
  }, [user]);

  const loadMessages = async () => {
    try {
      // Get stagiaire's enrolled classes
      const { data: stagiaire } = await supabase
        .from("stagiaires")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!stagiaire) {
        setLoading(false);
        return;
      }

      const { data: inscriptions } = await supabase
        .from("inscriptions")
        .select("classe_id")
        .eq("stagiaire_id", stagiaire.id);

      if (!inscriptions || inscriptions.length === 0) {
        setLoading(false);
        return;
      }

      const classeIds = inscriptions.map(i => i.classe_id);

      // Get messages for enrolled classes (collective messages) or direct messages
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`classe_id.in.(${classeIds.join(",")}),destinataire_id.eq.${user?.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setMessages(data);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from("messages")
        .update({ lu: true })
        .eq("id", messageId);

      setMessages(messages.map(m => 
        m.id === messageId ? { ...m, lu: true } : m
      ));
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucun message</p>
          <p className="text-sm text-muted-foreground mt-2">
            Les messages de vos formateurs apparaîtront ici
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <Card 
          key={message.id}
          className={message.lu ? "opacity-75" : "border-primary/50"}
          onClick={() => !message.lu && markAsRead(message.id)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {message.lu ? (
                  <MailOpen className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Mail className="h-5 w-5 text-primary" />
                )}
                <div>
                  <CardTitle className="text-lg">{message.sujet}</CardTitle>
                  <CardDescription>
                    {format(new Date(message.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}
                  </CardDescription>
                </div>
              </div>
              {!message.lu && (
                <Badge variant="default">Nouveau</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{message.contenu}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
