import { useState, useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Clock, CheckCircle, Users, AlertCircle, X, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Invitation {
  id: string;
  email: string;
  type: string;
  token: string;
  expire_at: string;
  utilisee: boolean;
  created_at: string;
  enseignants?: { nom: string; prenom: string } | null;
  stagiaires?: { nom: string; prenom: string } | null;
}

interface ParsedInvitation {
  nom: string;
  prenom: string;
  email: string;
  valid: boolean;
  error?: string;
}

export default function Invitations() {
  const { canEdit } = useUserRole();
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("single");
  
  // Single invitation form
  const [formData, setFormData] = useState({
    email: "",
    type: "enseignant" as "enseignant" | "stagiaire" | "chauffeur",
    firstName: "",
    lastName: "",
    entityId: "",
    customMessage: "",
  });

  // Bulk invitation form
  const [bulkData, setBulkData] = useState({
    rawText: "",
    type: "enseignant" as "enseignant" | "stagiaire" | "chauffeur",
    customMessage: "",
  });
  const [parsedInvitations, setParsedInvitations] = useState<ParsedInvitation[]>([]);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, total: 0 });

  useEffect(() => {
    loadInvitations();
  }, []);

  useEffect(() => {
    if (bulkData.rawText) {
      parseBulkText(bulkData.rawText);
    } else {
      setParsedInvitations([]);
    }
  }, [bulkData.rawText]);

  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select(`
          *,
          enseignants (nom, prenom),
          stagiaires (nom, prenom)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error("Error loading invitations:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les invitations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    return crypto.randomUUID();
  };

  const parseBulkText = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const parsed: ParsedInvitation[] = [];

    for (const line of lines) {
      // Support multiple separators: ; , or tab
      const parts = line.split(/[;\t,]/).map(p => p.trim()).filter(p => p);
      
      if (parts.length >= 3) {
        const [nom, prenom, email] = parts;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (emailRegex.test(email)) {
          parsed.push({ nom, prenom, email, valid: true });
        } else {
          parsed.push({ nom, prenom, email, valid: false, error: "Email invalide" });
        }
      } else if (parts.length > 0) {
        parsed.push({ 
          nom: parts[0] || "", 
          prenom: parts[1] || "", 
          email: parts[2] || "",
          valid: false, 
          error: "Format incorrect (Nom ; Prénom ; Email)" 
        });
      }
    }

    setParsedInvitations(parsed);
  };

  // Check if email already exists in auth system
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      // Check in profiles table which is linked to auth.users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profiles) return true;

      // Also check in enseignants and stagiaires tables for existing entries with user_id
      const { data: enseignant } = await supabase
        .from("enseignants")
        .select("id, user_id")
        .eq("email", email)
        .not("user_id", "is", null)
        .maybeSingle();

      if (enseignant) return true;

      const { data: stagiaire } = await supabase
        .from("stagiaires")
        .select("id, user_id")
        .eq("email", email)
        .not("user_id", "is", null)
        .maybeSingle();

      if (stagiaire) return true;

      return false;
    } catch (error) {
      console.error("Error checking email:", error);
      return false;
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      // Check if email already exists
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        toast({
          title: "Email déjà utilisé",
          description: `Un compte existe déjà avec l'adresse ${formData.email}. L'utilisateur peut se connecter directement.`,
          variant: "destructive",
        });
        setSending(false);
        return;
      }

      // Check if there's already a pending invitation for this email
      const { data: existingInvitation } = await supabase
        .from("invitations")
        .select("id, utilisee, expire_at")
        .eq("email", formData.email)
        .eq("utilisee", false)
        .gte("expire_at", new Date().toISOString())
        .maybeSingle();

      if (existingInvitation) {
        toast({
          title: "Invitation en attente",
          description: `Une invitation est déjà en attente pour ${formData.email}. Veuillez attendre son expiration ou la supprimer.`,
          variant: "destructive",
        });
        setSending(false);
        return;
      }

      const token = generateToken();
      const expireAt = new Date();
      expireAt.setDate(expireAt.getDate() + 7);

      const invitationData: any = {
        email: formData.email,
        type: formData.type,
        token,
        expire_at: expireAt.toISOString(),
      };

      if (formData.type === "enseignant" && formData.entityId) {
        invitationData.enseignant_id = formData.entityId;
      } else if (formData.type === "stagiaire" && formData.entityId) {
        invitationData.stagiaire_id = formData.entityId;
      } else if (formData.type === "chauffeur" && formData.entityId) {
        invitationData.chauffeur_id = formData.entityId;
      }

      const { error: dbError } = await supabase
        .from("invitations")
        .insert([invitationData]);

      if (dbError) throw dbError;

      const { error: emailError } = await supabase.functions.invoke("send-invitation", {
        body: {
          email: formData.email,
          type: formData.type,
          firstName: formData.firstName,
          lastName: formData.lastName,
          token,
          customMessage: formData.customMessage,
        },
      });

      if (emailError) throw emailError;

      toast({
        title: "Invitation envoyée",
        description: `L'invitation a été envoyée à ${formData.email}`,
      });

      setIsDialogOpen(false);
      setFormData({
        email: "",
        type: "enseignant",
        firstName: "",
        lastName: "",
        entityId: "",
        customMessage: "",
      });
      loadInvitations();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'invitation",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleBulkSend = async () => {
    const validInvitations = parsedInvitations.filter(inv => inv.valid);
    if (validInvitations.length === 0) {
      toast({
        title: "Aucune invitation valide",
        description: "Veuillez vérifier le format des données",
        variant: "destructive",
      });
      return;
    }

    setBulkSending(true);
    setBulkProgress({ sent: 0, total: validInvitations.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < validInvitations.length; i++) {
      const inv = validInvitations[i];
      try {
        const token = generateToken();
        const expireAt = new Date();
        expireAt.setDate(expireAt.getDate() + 7);

        const { error: dbError } = await supabase
          .from("invitations")
          .insert([{
            email: inv.email,
            type: bulkData.type,
            token,
            expire_at: expireAt.toISOString(),
          }]);

        if (dbError) throw dbError;

        const { error: emailError } = await supabase.functions.invoke("send-invitation", {
          body: {
            email: inv.email,
            type: bulkData.type,
            firstName: inv.prenom,
            lastName: inv.nom,
            token,
            customMessage: bulkData.customMessage,
          },
        });

        if (emailError) throw emailError;
        successCount++;
      } catch (error) {
        console.error(`Error sending invitation to ${inv.email}:`, error);
        errorCount++;
      }

      setBulkProgress({ sent: i + 1, total: validInvitations.length });
    }

    setBulkSending(false);
    
    toast({
      title: "Invitations envoyées",
      description: `${successCount} envoyée(s) avec succès, ${errorCount} erreur(s)`,
      variant: errorCount > 0 ? "destructive" : "default",
    });

    if (successCount > 0) {
      setBulkData({ rawText: "", type: "enseignant", customMessage: "" });
      setParsedInvitations([]);
      setIsDialogOpen(false);
      loadInvitations();
    }
  };

  const removeInvalidEntry = (index: number) => {
    const lines = bulkData.rawText.split('\n').filter(line => line.trim());
    lines.splice(index, 1);
    setBulkData(prev => ({ ...prev, rawText: lines.join('\n') }));
  };

  if (!canEdit()) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Vous n'avez pas les permissions nécessaires</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validCount = parsedInvitations.filter(inv => inv.valid).length;
  const invalidCount = parsedInvitations.filter(inv => !inv.valid).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Invitations</h1>
          <p className="text-muted-foreground">
            Gérez les invitations pour les enseignants et stagiaires
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="w-4 h-4 mr-2" />
              Nouvelle invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Envoyer une invitation</DialogTitle>
              <DialogDescription>
                Invitez un ou plusieurs enseignants/stagiaires à rejoindre la plateforme
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Invitation unique
                </TabsTrigger>
                <TabsTrigger value="bulk" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Invitation massive
                </TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="flex-1 overflow-y-auto mt-4">
                <form onSubmit={handleSendInvitation} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: "enseignant" | "stagiaire" | "chauffeur") => 
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enseignant">Enseignant</SelectItem>
                        <SelectItem value="stagiaire">Stagiaire</SelectItem>
                        <SelectItem value="chauffeur">Chauffeur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customMessage" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Message personnalisé (optionnel)
                    </Label>
                    <Textarea
                      id="customMessage"
                      value={formData.customMessage}
                      onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                      placeholder="Ajoutez un message personnalisé qui sera inclus dans l'email d'invitation..."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" disabled={sending}>
                      {sending ? "Envoi..." : "Envoyer"}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="bulk" className="flex-1 overflow-y-auto mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkType">Type *</Label>
                  <Select
                    value={bulkData.type}
                    onValueChange={(value: "enseignant" | "stagiaire" | "chauffeur") => 
                      setBulkData({ ...bulkData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enseignant">Enseignant</SelectItem>
                      <SelectItem value="stagiaire">Stagiaire</SelectItem>
                      <SelectItem value="chauffeur">Chauffeur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulkText" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Liste des invitations *
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Format: <code className="bg-muted px-1 rounded">Nom ; Prénom ; Email</code> (un par ligne)
                  </p>
                  <Textarea
                    id="bulkText"
                    value={bulkData.rawText}
                    onChange={(e) => setBulkData({ ...bulkData, rawText: e.target.value })}
                    placeholder={`Dupont ; Jean ; jean.dupont@email.com\nMartin ; Marie ; marie.martin@email.com\nBernard ; Pierre ; pierre.bernard@email.com`}
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>

                {parsedInvitations.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Aperçu</Label>
                      <Badge variant="secondary">{validCount} valide(s)</Badge>
                      {invalidCount > 0 && (
                        <Badge variant="destructive">{invalidCount} invalide(s)</Badge>
                      )}
                    </div>
                    <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                      {parsedInvitations.map((inv, index) => (
                        <div 
                          key={index} 
                          className={`flex items-center justify-between p-2 text-sm border-b last:border-b-0 ${
                            inv.valid ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {inv.valid ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span>{inv.prenom} {inv.nom}</span>
                            <span className="text-muted-foreground">({inv.email})</span>
                            {inv.error && (
                              <span className="text-red-600 text-xs">- {inv.error}</span>
                            )}
                          </div>
                          {!inv.valid && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeInvalidEntry(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="bulkCustomMessage" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Message personnalisé (optionnel)
                  </Label>
                  <Textarea
                    id="bulkCustomMessage"
                    value={bulkData.customMessage}
                    onChange={(e) => setBulkData({ ...bulkData, customMessage: e.target.value })}
                    placeholder="Ajoutez un message personnalisé qui sera inclus dans tous les emails d'invitation..."
                    rows={3}
                  />
                </div>

                {bulkSending && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Envoi en cours...</span>
                      <span>{bulkProgress.sent} / {bulkProgress.total}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(bulkProgress.sent / bulkProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleBulkSend} 
                    disabled={bulkSending || validCount === 0}
                  >
                    {bulkSending ? "Envoi..." : `Envoyer ${validCount} invitation(s)`}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : invitations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Aucune invitation envoyée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {invitations.map((invitation) => (
            <Card key={invitation.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {invitation.enseignants 
                        ? `${invitation.enseignants.prenom} ${invitation.enseignants.nom}`
                        : invitation.stagiaires
                        ? `${invitation.stagiaires.prenom} ${invitation.stagiaires.nom}`
                        : invitation.email}
                    </CardTitle>
                    <CardDescription>{invitation.email}</CardDescription>
                  </div>
                  {invitation.utilisee ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Acceptée</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-orange-600">
                      <Clock className="w-5 h-5" />
                      <span className="text-sm font-medium">En attente</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                      {invitation.type === "enseignant" ? "Enseignant" : "Stagiaire"}
                    </span>
                    <span className="text-muted-foreground">
                      Envoyée le {format(new Date(invitation.created_at), "d MMM yyyy", { locale: fr })}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    Expire le {format(new Date(invitation.expire_at), "d MMM yyyy", { locale: fr })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
