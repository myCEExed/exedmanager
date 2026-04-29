import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom"; 
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Copy, Check, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import logo from "@/assets/logo-sm.jpg";
import { translateAuthError, isUserAlreadyExistsError } from "@/lib/authErrors";

const signInSchema = z.object({
  email: z.string().email("Email invalide").max(255, "Email trop long"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").max(128, "Mot de passe trop long"),
});

const signUpSchema = z.object({
  email: z.string().email("Email invalide").max(255, "Email trop long"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").max(128, "Mot de passe trop long"),
  firstName: z.string().trim().min(1, "Le prénom est requis").max(100, "Prénom trop long"),
  lastName: z.string().trim().min(1, "Le nom est requis").max(100, "Nom trop long"),
});

type DemoRole = 'proprietaire' | 'responsable_scolarite' | 'gestionnaire_scolarite' | 
  'direction_financiere' | 'financier' | 'commercial' | 'collaborateur' | 
  'enseignant' | 'stagiaire' | 'chauffeur';

const DEMO_ACCOUNTS: { role: DemoRole; label: string; email: string; icon: string; description: string }[] = [
  { role: 'proprietaire', label: 'Propriétaire', email: 'demo.proprietaire@exed.demo', icon: '👑', description: 'Accès complet à toutes les fonctionnalités' },
  { role: 'responsable_scolarite', label: 'Resp. Scolarité', email: 'demo.resp.scolarite@exed.demo', icon: '📋', description: 'Supervise la scolarité, gère les programmes' },
  { role: 'gestionnaire_scolarite', label: 'Gest. Scolarité', email: 'demo.gest.scolarite@exed.demo', icon: '📝', description: 'Gère les programmes attribués' },
  { role: 'direction_financiere', label: 'Dir. Financière', email: 'demo.dir.financiere@exed.demo', icon: '📊', description: 'Consultation finances et exports' },
  { role: 'financier', label: 'Financier', email: 'demo.financier@exed.demo', icon: '💰', description: 'Gère factures, contrats, CRM' },
  { role: 'commercial', label: 'Commercial', email: 'demo.commercial@exed.demo', icon: '🤝', description: 'Accès complet au CRM' },
  { role: 'collaborateur', label: 'Collaborateur', email: 'demo.collaborateur@exed.demo', icon: '👤', description: 'Accès standard aux fonctionnalités' },
  { role: 'enseignant', label: 'Enseignant', email: 'demo.enseignant@exed.demo', icon: '👨‍🏫', description: 'Portail enseignant dédié' },
  { role: 'stagiaire', label: 'Stagiaire', email: 'demo.stagiaire@exed.demo', icon: '👨‍🎓', description: 'Portail stagiaire dédié' },
  { role: 'chauffeur', label: 'Chauffeur', email: 'demo.chauffeur@exed.demo', icon: '🚗', description: 'Portail chauffeur dédié' },
];

const DEMO_PASSWORD = 'DemoExed2025!';

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState<DemoRole | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [signUpError, setSignUpError] = useState<{ message: string; isExistingUser: boolean } | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Vérifier si c'est un stagiaire
        const { data: stagiaire } = await supabase
          .from("stagiaires")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        if (stagiaire) {
          navigate("/portail-stagiaire");
          return;
        }

        // Vérifier si c'est un enseignant
        const { data: enseignant } = await supabase
          .from("enseignants")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        if (enseignant) {
          navigate("/portail-enseignant");
          return;
        }

        // Vérifier si c'est un chauffeur
        const { data: chauffeur } = await supabase
          .from("chauffeurs")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        if (chauffeur) {
          navigate("/portail-chauffeur");
          return;
        }

        navigate("/");
      }
    };
    
    checkSessionAndRedirect();
  }, [navigate]);

  const redirectBasedOnRole = async (userId: string) => {
    // Vérifier si c'est un stagiaire
    const { data: stagiaire } = await supabase
      .from("stagiaires")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (stagiaire) {
      navigate("/portail-stagiaire");
      return;
    }

    // Vérifier si c'est un enseignant
    const { data: enseignant } = await supabase
      .from("enseignants")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (enseignant) {
      navigate("/portail-enseignant");
      return;
    }

    // Vérifier si c'est un chauffeur
    const { data: chauffeur } = await supabase
      .from("chauffeurs")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (chauffeur) {
      navigate("/portail-chauffeur");
      return;
    }

    // Par défaut, aller au dashboard
    navigate("/");
  };

  const handleSignIn = async (values: z.infer<typeof signInSchema>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        toast.error(translateAuthError(error.message));
      } else {
        toast.success("Connexion réussie !");
        await redirectBasedOnRole(data.user.id);
      }
    } catch (err: any) {
      console.error("SignIn network error:", err);
      toast.error(
        "Impossible de contacter le serveur d'authentification. Vérifiez votre connexion réseau et la configuration du serveur (CORS, HTTPS)."
      );
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast.error("Veuillez entrer votre adresse email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotPasswordEmail)) {
      toast.error("Veuillez entrer une adresse email valide");
      return;
    }

    setSendingResetEmail(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setResetEmailSent(true);
      toast.success("Email de réinitialisation envoyé !");
    } catch (error: any) {
      toast.error(translateAuthError(error.message));
    } finally {
      setSendingResetEmail(false);
    }
  };
  const handleSignUp = async (values: z.infer<typeof signUpSchema>) => {
    setLoading(true);
    setSignUpError(null);
    
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            first_name: values.firstName,
            last_name: values.lastName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        const translatedMessage = translateAuthError(error.message);
        const isExisting = isUserAlreadyExistsError(error.message);
        
        if (isExisting) {
          setSignUpError({ message: translatedMessage, isExistingUser: true });
        } else {
          toast.error(translatedMessage);
        }
      } else {
        toast.success("Compte créé avec succès ! Vérifiez votre email pour confirmer votre inscription.");
      }
    } catch (err: any) {
      console.error("Signup network error:", err);
      toast.error(
        "Impossible de contacter le serveur d'authentification. Vérifiez votre connexion réseau et la configuration du serveur (CORS, HTTPS)."
      );
    }
    setLoading(false);
  };

  const handleDemoLogin = async (role: DemoRole) => {
    setLoadingRole(role);
    try {
      // Appeler l'Edge Function pour créer/récupérer le compte démo
      const { data: demoData, error: demoError } = await supabase.functions.invoke('create-demo-account', {
        body: { role }
      });

      if (demoError) throw demoError;

      // Se connecter avec les credentials retournés
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: demoData.email,
        password: demoData.password,
      });

      if (signInError) throw signInError;

      toast.success(`Connexion en mode démo (${role}) réussie !`);
      
      // Rediriger selon le rôle
      if (role === 'enseignant') {
        navigate('/portail-enseignant');
      } else if (role === 'stagiaire') {
        navigate('/portail-stagiaire');
      } else if (role === 'chauffeur') {
        navigate('/portail-chauffeur');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la connexion en mode démo');
    }
    setLoadingRole(null);
  };

  const copyToClipboard = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center mb-2">
            <img 
              src={logo} 
              alt="CentraleSupélec EXED Campus Casablanca" 
              width={240}
              height={190}
              loading="eager"
              decoding="async"
              className="h-20 w-auto object-contain"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">EXED Manager 365</CardTitle>
          <CardDescription>Gestion des formations continues</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <Form {...signInForm}>
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <FormField
                    control={signInForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="votre@email.com" {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signInForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showSignInPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                              disabled={loading}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowSignInPassword(!showSignInPassword)}
                              disabled={loading}
                            >
                              {showSignInPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connexion...
                      </>
                    ) : (
                      "Se connecter"
                    )}
                  </Button>
                  <div className="text-center">
                    <Button 
                      type="button" 
                      variant="link" 
                      className="text-sm text-muted-foreground hover:text-primary"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Mot de passe oublié ?
                    </Button>
                  </div>
                </form>
              </Form>
              
              {/* Forgot Password Dialog */}
              {showForgotPassword && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="w-full max-w-md">
                    <CardHeader>
                      <CardTitle className="text-xl">Réinitialiser le mot de passe</CardTitle>
                      <CardDescription>
                        {resetEmailSent 
                          ? "Un email vous a été envoyé avec les instructions pour réinitialiser votre mot de passe."
                          : "Entrez votre adresse email pour recevoir un lien de réinitialisation."
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {resetEmailSent ? (
                        <div className="text-center space-y-4">
                          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <Check className="w-8 h-8 text-green-600" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Vérifiez votre boîte mail (et vos spams) pour trouver le lien de réinitialisation.
                          </p>
                          <Button 
                            onClick={() => {
                              setShowForgotPassword(false);
                              setResetEmailSent(false);
                              setForgotPasswordEmail("");
                            }}
                            className="w-full"
                          >
                            Retour à la connexion
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <label htmlFor="reset-email" className="text-sm font-medium">
                              Adresse email
                            </label>
                            <Input
                              id="reset-email"
                              type="email"
                              placeholder="votre@email.com"
                              value={forgotPasswordEmail}
                              onChange={(e) => setForgotPasswordEmail(e.target.value)}
                              disabled={sendingResetEmail}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setShowForgotPassword(false);
                                setForgotPasswordEmail("");
                              }}
                              className="flex-1"
                              disabled={sendingResetEmail}
                            >
                              Annuler
                            </Button>
                            <Button 
                              onClick={handleForgotPassword}
                              className="flex-1"
                              disabled={sendingResetEmail}
                            >
                              {sendingResetEmail ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Envoi...
                                </>
                              ) : (
                                "Envoyer"
                              )}
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="signup">
              {signUpError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex flex-col gap-2">
                    <span>{signUpError.message}</span>
                    {signUpError.isExistingUser && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-fit"
                        onClick={() => {
                          setSignUpError(null);
                          const tabs = document.querySelector('[value="signin"]') as HTMLElement;
                          tabs?.click();
                        }}
                      >
                        Se connecter
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              <Form {...signUpForm}>
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={signUpForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom</FormLabel>
                          <FormControl>
                            <Input placeholder="Jean" {...field} disabled={loading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom</FormLabel>
                          <FormControl>
                            <Input placeholder="Dupont" {...field} disabled={loading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={signUpForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="votre@email.com" {...field} disabled={loading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showSignUpPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                              disabled={loading}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                              disabled={loading}
                            >
                              {showSignUpPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                      "Créer un compte"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
