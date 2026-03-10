import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Discussion {
  id: string;
  titre: string;
  type_discussion: string;
  created_at: string;
  classe_id: string;
  classes: { nom: string; sous_code: string };
}

interface Message {
  id: string;
  contenu: string;
  created_at: string;
  user_id: string;
}

interface AssignedClasse {
  id: string;
  nom: string;
  sous_code: string;
}

export function EnseignantDiscussionsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClasse[]>([]);
  const [assignedClasseIds, setAssignedClasseIds] = useState<string[]>([]);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDiscussion, setNewDiscussion] = useState({
    titre: "",
    classe_id: "",
    type_discussion: "general",
  });

  useEffect(() => {
    if (user) {
      loadAssignedClasses();
    }
  }, [user]);

  useEffect(() => {
    if (assignedClasseIds.length > 0) {
      loadDiscussions();
    } else {
      setLoading(false);
    }
  }, [assignedClasseIds]);

  const loadAssignedClasses = async () => {
    try {
      const { data: enseignant } = await supabase
        .from("enseignants")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!enseignant) {
        setLoading(false);
        return;
      }

      const { data: affectations } = await supabase
        .from("affectations")
        .select(`
          modules (
            classe_id,
            classes (
              id,
              nom,
              sous_code
            )
          )
        `)
        .eq("enseignant_id", enseignant.id)
        .eq("confirmee", true);

      if (affectations) {
        const classesMap = new Map<string, AssignedClasse>();
        affectations.forEach(a => {
          if (a.modules?.classes) {
            const classe = a.modules.classes;
            if (!classesMap.has(classe.id)) {
              classesMap.set(classe.id, {
                id: classe.id,
                nom: classe.nom,
                sous_code: classe.sous_code
              });
            }
          }
        });
        const classes = Array.from(classesMap.values());
        setAssignedClasses(classes);
        setAssignedClasseIds(classes.map(c => c.id));
      }
    } catch (error) {
      console.error("Error loading assigned classes:", error);
      setLoading(false);
    }
  };

  const loadDiscussions = async () => {
    try {
      const { data, error } = await supabase
        .from("discussions")
        .select(`
          *,
          classes (nom, sous_code)
        `)
        .in("classe_id", assignedClasseIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDiscussions(data || []);
    } catch (error: any) {
      console.error("Error loading discussions:", error);
      toast({
        title: "Erreur",
        description: error.message,
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
        .select("*")
        .eq("discussion_id", discussionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSelectDiscussion = (discussion: Discussion) => {
    setSelectedDiscussion(discussion);
    loadMessages(discussion.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedDiscussion || !user) return;

    try {
      const { error } = await supabase
        .from("discussion_messages")
        .insert([
          {
            discussion_id: selectedDiscussion.id,
            user_id: user.id,
            contenu: newMessage.trim(),
          },
        ]);

      if (error) throw error;

      setNewMessage("");
      loadMessages(selectedDiscussion.id);
      toast({
        title: "Message envoyé",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateDiscussion = async () => {
    if (!newDiscussion.titre.trim() || !newDiscussion.classe_id) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("discussions")
        .insert([
          {
            titre: newDiscussion.titre.trim(),
            classe_id: newDiscussion.classe_id,
            type_discussion: newDiscussion.type_discussion,
            created_by: user?.id,
          },
        ]);

      if (error) throw error;

      toast({
        title: "Discussion créée",
      });

      setDialogOpen(false);
      setNewDiscussion({ titre: "", classe_id: "", type_discussion: "general" });
      loadDiscussions();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
      {/* Liste des discussions */}
      <div className="md:col-span-1 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Discussions</h3>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Nouvelle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une discussion</DialogTitle>
                <DialogDescription>
                  Créez une nouvelle discussion pour une de vos classes
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Titre *</Label>
                  <Input
                    value={newDiscussion.titre}
                    onChange={(e) => setNewDiscussion(prev => ({ ...prev, titre: e.target.value }))}
                    placeholder="Ex: Questions sur le module 1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Classe *</Label>
                  <Select
                    value={newDiscussion.classe_id}
                    onValueChange={(value) => setNewDiscussion(prev => ({ ...prev, classe_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignedClasses.map((classe) => (
                        <SelectItem key={classe.id} value={classe.id}>
                          {classe.sous_code} - {classe.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newDiscussion.type_discussion}
                    onValueChange={(value) => setNewDiscussion(prev => ({ ...prev, type_discussion: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Général</SelectItem>
                      <SelectItem value="question">Question</SelectItem>
                      <SelectItem value="annonce">Annonce</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateDiscussion}>Créer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="h-[530px]">
          <div className="space-y-2 pr-2">
            {discussions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <MessageCircle className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune discussion</p>
                </CardContent>
              </Card>
            ) : (
              discussions.map((discussion) => (
                <Card
                  key={discussion.id}
                  className={`cursor-pointer transition-colors ${
                    selectedDiscussion?.id === discussion.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => handleSelectDiscussion(discussion)}
                >
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm">{discussion.titre}</CardTitle>
                    <CardDescription className="text-xs">
                      <Badge variant="outline" className="mr-2">
                        {discussion.classes?.sous_code}
                      </Badge>
                      {format(new Date(discussion.created_at), "d MMM", { locale: fr })}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Zone de messages */}
      <div className="md:col-span-2">
        {selectedDiscussion ? (
          <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle>{selectedDiscussion.titre}</CardTitle>
              <CardDescription>
                {selectedDiscussion.classes?.sous_code} - {selectedDiscussion.classes?.nom}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1 pr-4 mb-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${
                        message.user_id === user?.id
                          ? "bg-primary text-primary-foreground ml-8"
                          : "bg-muted mr-8"
                      }`}
                    >
                      <p className="text-sm">{message.contenu}</p>
                      <p className={`text-xs mt-1 ${
                        message.user_id === user?.id
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}>
                        {format(new Date(message.created_at), "d MMM HH:mm", { locale: fr })}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex gap-2 flex-shrink-0">
                <Input
                  placeholder="Votre message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <Button onClick={handleSendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Sélectionnez une discussion pour voir les messages
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
