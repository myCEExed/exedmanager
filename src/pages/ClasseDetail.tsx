import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignedAvatarImage } from "@/components/SignedAvatarImage";
import { 
  ArrowLeft, 
  GraduationCap, 
  Users, 
  Calendar, 
  BookOpen, 
  User,
  Mail,
  Phone,
  Clock,
  MapPin
} from "lucide-react";

interface Classe {
  id: string;
  nom: string;
  sous_code: string;
  date_debut: string | null;
  date_fin: string | null;
  programme_id: string;
  programmes: {
    id: string;
    titre: string;
    code: string;
    type: string;
    date_debut: string | null;
    date_fin: string | null;
    clients?: {
      nom: string;
    } | null;
  } | null;
}

interface Inscription {
  id: string;
  stagiaire_id: string;
  statut: string | null;
  date_inscription: string;
  stagiaires: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone: string | null;
    photo_url: string | null;
  } | null;
}

interface Module {
  id: string;
  titre: string;
  code: string;
  date_debut: string | null;
  date_fin: string | null;
  duree_heures: number | null;
  salle: string | null;
  type_lieu: string | null;
  lieu_hors_site: string | null;
  affectations: {
    id: string;
    confirmee: boolean | null;
    enseignants: {
      id: string;
      nom: string;
      prenom: string;
      email: string;
      photo_url: string | null;
    } | null;
  }[];
}

export default function ClasseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEditSection } = useUserRole();
  const canEdit = canEditSection("classes");
  const [classe, setClasse] = useState<Classe | null>(null);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadClasseData();
    }
  }, [id]);

  const loadClasseData = async () => {
    setLoading(true);
    try {
      // Load classe with programme
      const { data: classeData, error: classeError } = await supabase
        .from("classes")
        .select(`
          *,
          programmes (
            id,
            titre,
            code,
            type,
            date_debut,
            date_fin,
            clients (
              nom
            )
          )
        `)
        .eq("id", id)
        .single();

      if (classeError) throw classeError;
      setClasse(classeData);

      // Load inscriptions with stagiaires
      const { data: inscriptionsData, error: inscriptionsError } = await supabase
        .from("inscriptions")
        .select(`
          id,
          stagiaire_id,
          statut,
          date_inscription,
          stagiaires (
            id,
            nom,
            prenom,
            email,
            telephone,
            photo_url
          )
        `)
        .eq("classe_id", id)
        .order("date_inscription", { ascending: false });

      if (inscriptionsError) throw inscriptionsError;
      setInscriptions(inscriptionsData || []);

      // Load modules with enseignants (via affectations)
      const { data: modulesData, error: modulesError } = await supabase
        .from("modules")
        .select(`
          id,
          titre,
          code,
          date_debut,
          date_fin,
          duree_heures,
          salle,
          type_lieu,
          lieu_hors_site,
          affectations (
            id,
            confirmee,
            enseignants (
              id,
              nom,
              prenom,
              email,
              photo_url
            )
          )
        `)
        .eq("classe_id", id)
        .order("date_debut", { ascending: true });

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Non définie";
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return "Non défini";
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getInitials = (nom: string, prenom: string) => {
    return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
  };

  const getProgrammeTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      diplome: { label: "Diplôme", variant: "default" },
      certificat: { label: "Certificat", variant: "secondary" },
      seminaire: { label: "Séminaire", variant: "outline" },
    };
    const config = types[type] || { label: type, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getLieuDisplay = (module: Module) => {
    if (module.type_lieu === "hors_site" && module.lieu_hors_site) {
      return module.lieu_hors_site;
    }
    return module.salle || "Non défini";
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement de la classe...</p>
        </div>
      </div>
    );
  }

  if (!classe) {
    return (
      <div className="text-center py-12">
        <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Classe introuvable</h2>
        <p className="text-muted-foreground mb-4">Cette classe n'existe pas ou a été supprimée.</p>
        <Button onClick={() => navigate("/classes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux classes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/classes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{classe.nom}</h1>
            <p className="text-muted-foreground">
              Code: {classe.sous_code}
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button onClick={() => navigate(`/modules?classe=${classe.id}`)}>
              <Calendar className="mr-2 h-4 w-4" />
              Planifier les modules
            </Button>
          </div>
        )}
      </div>

      {/* Programme Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Programme associé</CardTitle>
                <CardDescription>Informations sur le programme de formation</CardDescription>
              </div>
            </div>
            {classe.programmes && (
              <Link to={`/programmes/${classe.programmes.id}`}>
                <Button variant="outline" size="sm">Voir le programme</Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {classe.programmes ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Titre</p>
                <p className="font-medium">{classe.programmes.titre}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Code</p>
                <p className="font-medium">{classe.programmes.code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                {getProgrammeTypeBadge(classe.programmes.type)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-medium">{classe.programmes.clients?.nom || "Non défini"}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Aucun programme associé</p>
          )}
        </CardContent>
      </Card>

      {/* Période de la classe */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Période de formation</CardTitle>
              <CardDescription>Dates de début et de fin de la classe</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Date de début</p>
              <p className="font-medium">{formatDate(classe.date_debut)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date de fin</p>
              <p className="font-medium">{formatDate(classe.date_fin)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="stagiaires" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stagiaires" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Stagiaires ({inscriptions.length})
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Modules ({modules.length})
          </TabsTrigger>
        </TabsList>

        {/* Stagiaires Tab */}
        <TabsContent value="stagiaires">
          <Card>
            <CardHeader>
              <CardTitle>Stagiaires inscrits</CardTitle>
              <CardDescription>
                Liste des stagiaires inscrits à cette classe
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun stagiaire inscrit à cette classe</p>
                  {canEdit && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate("/classes")}
                    >
                      Inscrire des stagiaires
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stagiaire</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date d'inscription</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inscriptions.map((inscription) => (
                        <TableRow 
                          key={inscription.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => inscription.stagiaires && navigate(`/stagiaires/${inscription.stagiaires.id}`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <SignedAvatarImage photoUrl={inscription.stagiaires?.photo_url} fallbackBucket="stagiaire-photos" />
                                <AvatarFallback>
                                  {inscription.stagiaires 
                                    ? getInitials(inscription.stagiaires.nom, inscription.stagiaires.prenom)
                                    : "??"
                                  }
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {inscription.stagiaires?.prenom} {inscription.stagiaires?.nom}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              {inscription.stagiaires?.email || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              {inscription.stagiaires?.telephone || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={inscription.statut === "inscrit" ? "default" : "secondary"}>
                              {inscription.statut || "inscrit"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDate(inscription.date_inscription)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Planification des modules</CardTitle>
                  <CardDescription>
                    Modules programmés pour cette classe avec leurs intervenants
                  </CardDescription>
                </div>
                {canEdit && (
                  <Button onClick={() => navigate(`/modules?classe=${classe.id}`)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Planifier les modules
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {modules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun module planifié pour cette classe</p>
                  {canEdit ? (
                    <p className="text-sm mt-1">
                      Utilisez le bouton "Planifier les modules" pour ajouter les modules du programme
                    </p>
                  ) : (
                    <p className="text-sm mt-1">
                      Aucun module n'a encore été planifié pour cette classe
                    </p>
                  )}
                  {canEdit && (
                    <Button 
                      className="mt-4"
                      onClick={() => navigate(`/modules?classe=${classe.id}`)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Planifier les modules
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {modules.map((module) => (
                    <Card key={module.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          {/* Module Info */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <BookOpen className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-semibold">{module.titre}</h4>
                                <p className="text-sm text-muted-foreground">Code: {module.code}</p>
                              </div>
                            </div>
                            
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {module.date_debut 
                                    ? `${formatDateTime(module.date_debut)}${module.date_fin ? ` - ${formatDateTime(module.date_fin)}` : ""}`
                                    : "Dates non définies"
                                  }
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{module.duree_heures ? `${module.duree_heures}h` : "Durée non définie"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{getLieuDisplay(module)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Intervenants */}
                          <div className="lg:w-72 lg:border-l lg:pl-4">
                            <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Intervenant(s)
                            </p>
                            {module.affectations.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">Aucun intervenant affecté</p>
                            ) : (
                              <div className="space-y-2">
                                {module.affectations.map((affectation) => (
                                  affectation.enseignants && (
                                    <div 
                                      key={affectation.id} 
                                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted"
                                      onClick={() => navigate(`/enseignants/${affectation.enseignants!.id}`)}
                                    >
                                      <Avatar className="h-8 w-8">
                                        <SignedAvatarImage photoUrl={affectation.enseignants.photo_url} fallbackBucket="enseignant-photos" />
                                        <AvatarFallback className="text-xs">
                                          {getInitials(affectation.enseignants.nom, affectation.enseignants.prenom)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">
                                          {affectation.enseignants.prenom} {affectation.enseignants.nom}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {affectation.enseignants.email}
                                        </p>
                                      </div>
                                      {affectation.confirmee && (
                                        <Badge variant="outline" className="text-xs shrink-0">Confirmé</Badge>
                                      )}
                                    </div>
                                  )
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
