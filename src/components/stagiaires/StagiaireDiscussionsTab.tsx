import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { MessagesSquare, Plus, Send, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Discussion {
  id: string;
  titre: string;
  type_discussion: string;
  created_at: string;
  classe: {
    nom: string;
    programme: {
      titre: string;
    };
  } | null;
  messagesCount: number;
}

interface DiscussionMessage {
  id: string;
  contenu: string;
  created_at: string;
  user_id: string;
  profile: {
    nom: string;
    prenom: string;
  } | null;
}

export function StagiaireDiscussionsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [classeIds, setClasseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDiscussion, setNewDiscussion] = useState({ titre: "", classeId: "" });

  useEffect(() => {
    if (user) {
      loadEnrolledClasses();
    }
  }, [user]);

  const loadEnrolledClasses = async () => {
    try {
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

      const ids = inscriptions.map(i => i.classe_id);
      setClasseIds(ids);
      await loadDiscussions(ids);
    } catch (error) {
      console.error("Error loading enrolled classes:", error);
      setLoading(false);
    }
  };

  const loadDiscussions = async (cIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("discussions")
        .select(`
          id,
          titre,
          type_discussion,
          created_at,
          classes (
            nom,
            programmes (
              titre
            )
          )
        `)
        .in("classe_id", cIds)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      if (data) {
        // Get message counts for each discussion
        const discussionsWithCounts = await Promise.all(
          data.map(async (d) => {
            const { count } = await supabase
              .from("discussion_messages")
              .select("*", { count: "exact", head: true })
              .eq("discussion_id", d.id);

            return {
              id: d.id,
              titre: d.titre,
              type_discussion: d.type_discussion,
              created_at: d.created_at,
              classe: d.classes ? {
                nom: d.classes.nom,
                programme: {
                  titre: d.classes.programmes?.titre || ""
                }
              } : null,
              messagesCount: count || 0
            };
          })
        );
        setDiscussions(discussionsWithCounts);
      }
    } catch (error) {
      console.error("Error loading discussions:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les discussions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (discussionId: string) => {
    try {
      const { data, error } = await supabase
        .from("discussion_messages")
        .select(`
          id,
          contenu,
          created_at,
          user_id,
          profiles:user_id (
            nom,
            prenom
          )
        `)
        .eq("discussion_id", discussionId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        setMessages(data.map(m => ({
          id: m.id,
          contenu: m.contenu,
          created_at: m.created_at,
          user_id: m.user_id,
          profile: m.profiles ? {
            nom: (m.profiles as any).nom || "",
            prenom: (m.profiles as any).prenom || ""
          } : null
        })));
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedDiscussion || !user) return;

    try {
      const { error } = await supabase
        .from("discussion_messages")
        .insert({
          discussion_id: selectedDiscussion.id,
          contenu: newMessage,
          user_id: user.id
        });

      if (error) throw error;

      setNewMessage("");
      loadMessages(selectedDiscussion.id);
      
      // Update discussion timestamp
      await supabase
        .from("discussions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedDiscussion.id);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    }
  };

  const openDiscussion = (discussion: Discussion) => {
    setSelectedDiscussion(discussion);
    loadMessages(discussion.id);
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  if (discussions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessagesSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucune discussion</p>
          <p className="text-sm text-muted-foreground mt-2">
            Les discussions de vos classes apparaîtront ici
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {selectedDiscussion ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{selectedDiscussion.titre}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedDiscussion.classe?.programme.titre} - {selectedDiscussion.classe?.nom}
              </p>
            </div>
            <Button variant="outline" onClick={() => setSelectedDiscussion(null)}>
              Retour
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.user_id === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="text-xs opacity-75 mb-1">
                          {message.profile 
                            ? `${message.profile.prenom} ${message.profile.nom}`
                            : "Utilisateur"}
                          {" • "}
                          {format(new Date(message.created_at), "d MMM HH:mm", { locale: fr })}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.contenu}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2 mt-4">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Votre message..."
                  className="flex-1 resize-none"
                  rows={2}
                />
                <Button onClick={handleSendMessage} className="self-end">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4">
          {discussions.map((discussion) => (
            <Card 
              key={discussion.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => openDiscussion(discussion)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      {discussion.titre}
                    </CardTitle>
                    <CardDescription>
                      {discussion.classe?.programme.titre} - {discussion.classe?.nom}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {discussion.messagesCount} messages
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Créée le {format(new Date(discussion.created_at), "d MMMM yyyy", { locale: fr })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
