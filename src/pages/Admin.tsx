import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ExchangeRateManager } from "@/components/ExchangeRateManager";
import { InvoiceTemplateManager } from "@/components/admin/InvoiceTemplateManager";
import { UserManagement } from "@/components/admin/UserManagement";
import { Shield, Send, Mail, Clock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UserWithRole {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  role_id?: string;
}

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

const Admin = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [inviteFormData, setInviteFormData] = useState({
    email: "",
    role: "collaborateur" as string,
    firstName: "",
    lastName: "",
  });

useEffect(() => {
  console.log("🛡️ Admin page: authLoading =", authLoading, "| roleLoading =", roleLoading, "| isAdmin =", isAdmin());
  if (authLoading || roleLoading) return;
  if (!isAdmin()) {
    console.log("❌ Admin page: Access denied, redirecting to home");
    toast({
      title: "Accès refusé",
      description: "Vous n'avez pas les permissions pour accéder à cette page.",
      variant: "destructive",
    });
    navigate("/");
  } else {
    console.log("✅ Admin page: Access granted");
  }
}, [isAdmin, roleLoading, authLoading, navigate, toast]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*");

      if (profilesError) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les utilisateurs.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      }

      const usersWithRoles = profiles.map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          role: userRole?.role,
          role_id: userRole?.id,
        };
      });

      setUsers(usersWithRoles);
      setLoading(false);
    };

    if (!authLoading && !roleLoading && isAdmin()) {
      fetchUsers();
      loadInvitations();
    }
  }, [authLoading, roleLoading, isAdmin, toast]);

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
    }
  };

  const generateToken = () => {
    return crypto.randomUUID();
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      const token = generateToken();
      const expireAt = new Date();
      expireAt.setDate(expireAt.getDate() + 7);

      // Create invitation
      const invitationData: any = {
        email: inviteFormData.email,
        type: inviteFormData.role === "enseignant" ? "enseignant" : inviteFormData.role === "stagiaire" ? "stagiaire" : "admin",
        token,
        expire_at: expireAt.toISOString(),
      };

      const { error: dbError } = await supabase
        .from("invitations")
        .insert([invitationData]);

      if (dbError) throw dbError;

      // Send email via edge function
      await supabase.functions.invoke("send-invitation", {
        body: {
          email: inviteFormData.email,
          type: invitationData.type,
          firstName: inviteFormData.firstName,
          lastName: inviteFormData.lastName,
          role: inviteFormData.role,
          token,
        },
      });

      toast({
        title: "Invitation envoyée",
        description: `L'invitation a été envoyée à ${inviteFormData.email}`,
      });

      setIsInviteDialogOpen(false);
      setInviteFormData({
        email: "",
        role: "collaborateur",
        firstName: "",
        lastName: "",
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

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "proprietaire":
        return "Propriétaire";
      case "administrateur":
        return "Administrateur";
      case "responsable_scolarite":
        return "Responsable de Scolarité";
      case "gestionnaire_scolarite":
        return "Gestionnaire de Scolarité";
      case "direction_financiere":
        return "Direction Financière";
      case "financier":
        return "Financier";
      case "commercial":
        return "Commercial";
      case "collaborateur":
        return "Collaborateur";
      case "enseignant":
        return "Enseignant";
      case "stagiaire":
        return "Stagiaire";
      case "chauffeur":
        return "Chauffeur";
      default:
        return "Aucun rôle";
    }
  };

  if (authLoading || roleLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Administration</h1>
            <p className="text-muted-foreground">Gérez les utilisateurs et leurs permissions</p>
          </div>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="w-4 h-4 mr-2" />
              Inviter un utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inviter un utilisateur</DialogTitle>
              <DialogDescription>
                Envoyez une invitation pour créer un compte avec un rôle spécifique
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Rôle *</Label>
                <Select
                  value={inviteFormData.role}
                  onValueChange={(value) => 
                    setInviteFormData({ ...inviteFormData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proprietaire">Propriétaire</SelectItem>
                    <SelectItem value="administrateur">Administrateur</SelectItem>
                    <SelectItem value="responsable_scolarite">Responsable de Scolarité</SelectItem>
                    <SelectItem value="gestionnaire_scolarite">Gestionnaire de Scolarité</SelectItem>
                    <SelectItem value="direction_financiere">Direction Financière</SelectItem>
                    <SelectItem value="financier">Financier</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="collaborateur">Collaborateur</SelectItem>
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
                    value={inviteFormData.firstName}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    value={inviteFormData.lastName}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteFormData.email}
                  onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={sending}>
                  {sending ? "Envoi..." : "Envoyer l'invitation"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <UserManagement users={users} onUsersChange={setUsers} />

      <Card>
        <CardHeader>
          <CardTitle>Informations sur les rôles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Badge>Propriétaire</Badge>
            <p className="text-sm text-muted-foreground">
              Accès complet et contrôle total : peut gérer tous les aspects de la plateforme incluant les finances, la scolarité et l'administration
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge>Administrateur</Badge>
            <p className="text-sm text-muted-foreground">
              Accès complet : peut créer, modifier et supprimer tous les éléments, gérer les utilisateurs et leurs rôles
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge>Responsable de Scolarité</Badge>
            <p className="text-sm text-muted-foreground">
              Supervise la scolarité : peut gérer les programmes, classes, enseignants et stagiaires. Donne les droits de modification aux gestionnaires de scolarité. Accès au reste de la plateforme.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="secondary">Gestionnaire de Scolarité</Badge>
            <p className="text-sm text-muted-foreground">
              Accès en modification uniquement aux programmes qui lui sont attribués. Accès CRM en modification. Accès Transferts en modification. Pas d'accès aux sections Factures, Recouvrement, Performance Financière et Contrats.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="secondary">Direction Financière</Badge>
            <p className="text-sm text-muted-foreground">
              Accès en consultation et export : Tableau de bord, Performance Financière, Factures, Recouvrements. Aucun droit de modification.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="secondary">Financier</Badge>
            <p className="text-sm text-muted-foreground">
              Accès en modification : Factures, Contrats, CRM, Restauration. Consultation pour le reste des sections accessibles.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="secondary">Commercial</Badge>
            <p className="text-sm text-muted-foreground">
              Accès complet au CRM (modification). Consultation uniquement : Programmes, Modules, Planning, Clients.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline">Collaborateur</Badge>
            <p className="text-sm text-muted-foreground">
              Accès en lecture seule : peut uniquement consulter les données du tableau de bord, documentation et contenu pédagogique
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline">Enseignant</Badge>
            <p className="text-sm text-muted-foreground">
              Peut voir ses classes et stagiaires, gérer les documents de ses cours, noter les devoirs et gérer l'assiduité
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline">Stagiaire</Badge>
            <p className="text-sm text-muted-foreground">
              Peut consulter ses inscriptions, factures (programmes INTER uniquement), documents de cours et son parcours
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline">Chauffeur</Badge>
            <p className="text-sm text-muted-foreground">
              Accès au portail chauffeur pour consulter ses missions de transfert
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitations envoyées</CardTitle>
          <CardDescription>
            Liste des invitations en attente et acceptées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune invitation envoyée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {invitation.enseignants 
                        ? `${invitation.enseignants.prenom} ${invitation.enseignants.nom}`
                        : invitation.stagiaires
                        ? `${invitation.stagiaires.prenom} ${invitation.stagiaires.nom}`
                        : invitation.email}
                    </div>
                    <div className="text-sm text-muted-foreground">{invitation.email}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                        {invitation.type === "enseignant" ? "Enseignant" : invitation.type === "stagiaire" ? "Stagiaire" : "Administratif"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Envoyée le {format(new Date(invitation.created_at), "d MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <InvoiceTemplateManager />

      <ExchangeRateManager />
    </div>
  );
};

export default Admin;
