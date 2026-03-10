import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
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
}

interface Class {
  id: string;
  nom: string;
}

interface Utilisateur {
  id: string;
  email: string;
}

export default function Messages() {
  const { user } = useAuth();
  const { canEditSection, role } = useUserRole();
  const canEdit = canEditSection("messages");
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
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
    loadMessages();
    loadClasses();
    loadUtilisateurs();
  }, []);

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id, nom")
        .order("nom");

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error("Error loading classes:", error);
    }
  };

  const loadUtilisateurs = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email");

      if (error) throw error;
      setUtilisateurs(data || []);
    } catch (error) {
      console.error("Error loading utilisateurs:", error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
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
      } else {
        messageData.destinataire_id = formData.destinataire_id;
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

  const canSendMessages = canEdit || role === "enseignant" || role === "stagiaire";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">
            Communiquez avec les enseignants et stagiaires
          </p>
        </div>
        {canSendMessages && (
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
                  Communiquez avec une classe ou un utilisateur
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div className="space-y-2">
                  <Label>Type de destinataire</Label>
                  <RadioGroup
                    value={formData.type_destinataire}
                    onValueChange={(value: "collectif" | "individuel") =>
                      setFormData({ ...formData, type_destinataire: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="collectif" id="collectif" />
                      <Label htmlFor="collectif" className="font-normal cursor-pointer">
                        Message collectif (classe)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="individuel" id="individuel" />
                      <Label htmlFor="individuel" className="font-normal cursor-pointer">
                        Message individuel
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {formData.type_destinataire === "collectif" ? (
                  <div className="space-y-2">
                    <Label htmlFor="classe_id">Classe *</Label>
                    <Select
                      value={formData.classe_id}
                      onValueChange={(value) => setFormData({ ...formData, classe_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((classe) => (
                          <SelectItem key={classe.id} value={classe.id}>
                            {classe.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="destinataire_id">Destinataire *</Label>
                    <Select
                      value={formData.destinataire_id}
                      onValueChange={(value) => setFormData({ ...formData, destinataire_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un destinataire" />
                      </SelectTrigger>
                      <SelectContent>
                        {utilisateurs.map((utilisateur) => (
                          <SelectItem key={utilisateur.id} value={utilisateur.id}>
                            {utilisateur.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Aucun message</p>
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
