import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Send, Mail, User, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Message {
  id: string;
  sujet: string;
  contenu: string;
  type_destinataire: string;
  lu: boolean;
  created_at: string;
  expediteur_id: string;
  destinataire_id: string | null;
  classe_id: string | null;
}

interface AssignedClasse {
  id: string;
  nom: string;
  sous_code: string;
}

export function EnseignantMessagesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<AssignedClasse[]>([]);
  const [assignedClasseIds, setAssignedClasseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    sujet: "",
    contenu: "",
    classe_id: "",
    type_destinataire: "collectif" as "collectif" | "individuel",
    destinataire_id: "",
  });

  useEffect(() => {
    if (user) {
      loadAssignedClasses();
    }
  }, [user]);

  // Load messages only after we have assigned classes
  useEffect(() => {
    if (assignedClasseIds.length > 0) {
      loadMessages();
    } else if (assignedClasses.length === 0 && !loading) {
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
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading assigned classes:", error);
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      // Only load messages that the teacher sent OR messages for their assigned classes
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`expediteur_id.eq.${user?.id},classe_id.in.(${assignedClasseIds.join(",")})`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const messageData: any = {
        sujet: formData.sujet,
        contenu: formData.contenu,
        type_destinataire: formData.type_destinataire,
        expediteur_id: user?.id,
      };

      if (formData.type_destinataire === "collectif") {
        messageData.classe_id = formData.classe_id;
      }

      const { error } = await supabase
        .from("messages")
        .insert([messageData]);

      if (error) throw error;

      toast({
        title: "Message envoyé",
        description: "Votre message a été envoyé avec succès",
      });

      setIsDialogOpen(false);
      setFormData({
        sujet: "",
        contenu: "",
        classe_id: "",
        type_destinataire: "collectif",
        destinataire_id: "",
      });
      loadMessages();
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="w-4 h-4 mr-2" />
              Nouveau message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Envoyer un message</DialogTitle>
              <DialogDescription>
                Communiquez avec vos classes
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="space-y-2">
                <Label>Classe destinataire</Label>
                <Select
                  value={formData.classe_id}
                  onValueChange={(value) => setFormData({ ...formData, classe_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une classe" />
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
                <Label htmlFor="sujet">Sujet *</Label>
                <Input
                  id="sujet"
                  value={formData.sujet}
                  onChange={(e) => setFormData({ ...formData, sujet: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contenu">Message *</Label>
                <Textarea
                  id="contenu"
                  value={formData.contenu}
                  onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
                  required
                  rows={6}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">Envoyer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun message</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {messages.map((message) => (
            <Card key={message.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{message.sujet}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      {message.type_destinataire === "collectif" ? (
                        <>
                          <Users className="w-4 h-4" />
                          <span>Message collectif</span>
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4" />
                          <span>Message individuel</span>
                        </>
                      )}
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(new Date(message.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                      </span>
                      {message.expediteur_id === user?.id && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Envoyé</span>
                      )}
                    </CardDescription>
                  </div>
                  {!message.lu && message.destinataire_id === user?.id && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{message.contenu}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
