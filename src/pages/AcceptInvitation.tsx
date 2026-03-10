import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { translateAuthError, isUserAlreadyExistsError } from "@/lib/authErrors";

const passwordSchema = z.object({
  password: z.string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(128, "Mot de passe trop long")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
    .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [existingUserError, setExistingUserError] = useState(false);

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select(`
          *,
          enseignants (nom, prenom),
          stagiaires (nom, prenom)
        `)
        .eq("token", token)
        .eq("utilisee", false)
        .single();

      if (error) throw error;

      if (new Date(data.expire_at) < new Date()) {
        toast({
          title: "Invitation expirée",
          description: "Cette invitation n'est plus valide",
          variant: "destructive",
        });
        return;
      }

      setInvitation(data);
    } catch (error) {
      console.error("Error validating token:", error);
      toast({
        title: "Invitation invalide",
        description: "Cette invitation n'existe pas ou a déjà été utilisée",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (values: z.infer<typeof passwordSchema>) => {
    setProcessing(true);
    setExistingUserError(false);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) {
        // Check if user already exists
        if (isUserAlreadyExistsError(authError.message)) {
          setExistingUserError(true);
          setProcessing(false);
          return;
        }
        throw authError;
      }

      if (invitation.type === "enseignant" && invitation.enseignant_id) {
        const { error: updateError } = await supabase
          .from("enseignants")
          .update({ user_id: authData.user?.id })
          .eq("id", invitation.enseignant_id);

        if (updateError) throw updateError;

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert([{
            user_id: authData.user?.id,
            role: "enseignant",
          }]);

        if (roleError) throw roleError;
      } else if (invitation.type === "stagiaire" && invitation.stagiaire_id) {
        const { error: updateError } = await supabase
          .from("stagiaires")
          .update({ user_id: authData.user?.id })
          .eq("id", invitation.stagiaire_id);

        if (updateError) throw updateError;

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert([{
            user_id: authData.user?.id,
            role: "stagiaire",
          }]);

        if (roleError) throw roleError;
      }

      const { error: invitationError } = await supabase
        .from("invitations")
        .update({ utilisee: true })
        .eq("id", invitation.id);

      if (invitationError) throw invitationError;

      toast({
        title: "Compte créé avec succès",
        description: "Vous allez être redirigé vers la page de connexion",
      });

      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast({
        title: "Erreur",
        description: translateAuthError(error.message) || "Impossible de créer le compte",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Vérification de l'invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-2xl font-bold mb-2">Invitation invalide</h2>
            <p className="text-muted-foreground text-center mb-4">
              Cette invitation n'existe pas ou a déjà été utilisée
            </p>
            <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Accepter l'invitation</CardTitle>
          <CardDescription>
            Créez votre compte pour accéder à EXED Manager 365
          </CardDescription>
        </CardHeader>
        <CardContent>
          {existingUserError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-3">
                <span>Un compte existe déjà avec cette adresse email.</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-fit"
                  asChild
                >
                  <Link to="/auth">Se connecter</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="mb-6 p-4 bg-primary/5 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Vous êtes invité(e) en tant que</p>
            <p className="text-lg font-semibold">
              {invitation.type === "enseignant" ? "Enseignant" : invitation.type === "stagiaire" ? "Stagiaire" : "Chauffeur"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">{invitation.email}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAcceptInvitation)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Au moins 8 caractères" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création du compte...
                  </>
                ) : (
                  "Créer mon compte"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}