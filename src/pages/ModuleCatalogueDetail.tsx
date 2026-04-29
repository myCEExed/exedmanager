import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  ArrowLeft, BookOpen, Users, FileText, Video, GraduationCap, 
  Calendar, User, ExternalLink, Clock, Link as LinkIcon, Building
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { SignedPhotoImg } from "@/components/SignedPhotoImg";
import { fr } from "date-fns/locale";
import { normalizeYouTubeUrl } from "@/lib/utils";

interface Enseignant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  photo_url: string | null;
  pays_residence: string | null;
  thematiques: string[] | null;
}

interface ClasseWithModule {
  classe_id: string;
  classe_nom: string;
  classe_code: string;
  programme_titre: string;
  programme_code: string;
  module_id: string;
  module_code: string;
  date_debut: string | null;
  date_fin: string | null;
}

interface Document {
  id: string;
  titre: string;
  description: string | null;
  type_fichier: string | null;
  url: string;
  created_at: string;
  module_id: string;
  module_code?: string;
  classe_nom?: string;
  profiles?: { first_name: string | null; last_name: string | null; email: string } | null;
}

interface Ressource {
  id: string;
  titre: string;
  description: string | null;
  type_ressource: string;
  url: string | null;
  fichier_url: string | null;
  created_at: string;
  duree_minutes: number | null;
  obligatoire: boolean;
  module_id: string;
  module_code?: string;
  classe_nom?: string;
  profiles?: { first_name: string | null; last_name: string | null; email: string } | null;
}

const ModuleCatalogueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [module, setModule] = useState<any>(null);
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [classes, setClasses] = useState<ClasseWithModule[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadModuleDetails();
    }
  }, [id]);

  const loadModuleDetails = async () => {
    setLoading(true);
    try {
      // Charger le module du catalogue avec ses enseignants
      const { data: moduleData, error: moduleError } = await supabase
        .from("module_catalogue")
        .select(`
          *,
          module_enseignants (
            enseignant_id,
            enseignants (
              id,
              nom,
              prenom,
              email,
              photo_url,
              pays_residence,
              thematiques
            )
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (moduleError) throw moduleError;
      
      if (!moduleData) {
        setModule(null);
        setLoading(false);
        return;
      }
      
      setModule(moduleData);
      
      // Extraire les enseignants
      const enseignantsData = moduleData.module_enseignants?.map((me: any) => me.enseignants).filter(Boolean) || [];
      setEnseignants(enseignantsData);

      // Charger les programme_modules qui utilisent ce module catalogue
      const { data: programmeModulesData, error: pmError } = await supabase
        .from("programme_modules")
        .select(`
          id,
          programme_id,
          programmes (
            id,
            titre,
            code
          )
        `)
        .eq("module_catalogue_id", id);

      if (pmError) throw pmError;

      const programmeModuleIds = programmeModulesData?.map(pm => pm.id) || [];

      if (programmeModuleIds.length === 0) {
        setClasses([]);
        setDocuments([]);
        setRessources([]);
        setLoading(false);
        return;
      }

      // Charger les modules (instances) liés à ces programme_modules
      const { data: modulesData, error: modulesError } = await supabase
        .from("modules")
        .select(`
          id,
          code,
          titre,
          date_debut,
          date_fin,
          classe_id,
          programme_module_id,
          classes (
            id,
            nom,
            sous_code,
            programme_id,
            programmes (
              id,
              titre,
              code
            )
          )
        `)
        .in("programme_module_id", programmeModuleIds);

      if (modulesError) throw modulesError;

      // Transformer en classes avec modules
      const classesWithModules: ClasseWithModule[] = (modulesData || []).map(m => ({
        classe_id: m.classes?.id || "",
        classe_nom: m.classes?.nom || "",
        classe_code: m.classes?.sous_code || "",
        programme_titre: m.classes?.programmes?.titre || "",
        programme_code: m.classes?.programmes?.code || "",
        module_id: m.id,
        module_code: m.code,
        date_debut: m.date_debut,
        date_fin: m.date_fin
      }));

      setClasses(classesWithModules);

      const moduleIds = modulesData?.map(m => m.id) || [];

      if (moduleIds.length === 0) {
        setDocuments([]);
        setRessources([]);
        setLoading(false);
        return;
      }

      // Charger documents et ressources en parallèle
      const [docsResult, ressResult] = await Promise.all([
        supabase
          .from("documents")
          .select("id, titre, description, type_fichier, url, created_at, uploaded_by, module_id")
          .in("module_id", moduleIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("ressources_pedagogiques")
          .select("id, titre, description, type_ressource, url, fichier_url, created_at, uploaded_by, duree_minutes, obligatoire, module_id")
          .in("module_id", moduleIds)
          .order("created_at", { ascending: false })
      ]);

      const docsData = docsResult.data || [];
      const ressData = ressResult.data || [];

      // Créer une map pour les infos de modules
      const modulesInfoMap = Object.fromEntries(
        (modulesData || []).map(m => [m.id, {
          code: m.code,
          classe_nom: m.classes?.nom || ""
        }])
      );

      // Récupérer tous les user_ids uniques pour les profils
      const allUploaderIds = [
        ...new Set([
          ...docsData.map(d => d.uploaded_by),
          ...ressData.map(r => r.uploaded_by)
        ])
      ].filter(Boolean);

      // Charger les profils
      let profilesMap: Record<string, { first_name: string | null; last_name: string | null; email: string }> = {};
      if (allUploaderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", allUploaderIds);

        if (profilesData) {
          profilesMap = Object.fromEntries(
            profilesData.map(p => [p.id, { first_name: p.first_name, last_name: p.last_name, email: p.email }])
          );
        }
      }

      // Enrichir les documents
      const enrichedDocs = docsData.map(doc => ({
        ...doc,
        module_code: modulesInfoMap[doc.module_id]?.code,
        classe_nom: modulesInfoMap[doc.module_id]?.classe_nom,
        profiles: profilesMap[doc.uploaded_by] || null
      }));

      // Enrichir les ressources
      const enrichedRess = ressData.map(res => ({
        ...res,
        module_code: modulesInfoMap[res.module_id]?.code,
        classe_nom: modulesInfoMap[res.module_id]?.classe_nom,
        profiles: profilesMap[res.uploaded_by] || null
      }));

      setDocuments(enrichedDocs);
      setRessources(enrichedRess);

    } catch (error: any) {
      console.error("Error loading module details:", error);
      toast.error("Erreur lors du chargement des détails du module");
    } finally {
      setLoading(false);
    }
  };

  const formatUploader = (profile: { first_name: string | null; last_name: string | null; email: string } | null) => {
    if (!profile) return "Inconnu";
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    return profile.email;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "lien":
        return <LinkIcon className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleOpenResource = (url: string | null) => {
    if (!url) return;
    const normalizedUrl = normalizeYouTubeUrl(url);
    window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate("/modules-catalogue")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <div className="text-center text-muted-foreground py-8">Chargement...</div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate("/modules-catalogue")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Module non trouvé</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate("/modules-catalogue")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
      </div>

      {/* Informations principales */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">{module.titre}</CardTitle>
              {module.descriptif && (
                <p className="text-muted-foreground mt-2">{module.descriptif}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{enseignants.length} enseignant{enseignants.length > 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span>{classes.length} classe{classes.length > 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{documents.length} document{documents.length > 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              <span>{ressources.length} ressource{ressources.length > 1 ? "s" : ""}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets */}
      <Tabs defaultValue="enseignants" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="enseignants">
            <Users className="mr-2 h-4 w-4" />
            Enseignants
          </TabsTrigger>
          <TabsTrigger value="classes">
            <GraduationCap className="mr-2 h-4 w-4" />
            Classes
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="mr-2 h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="ressources">
            <Video className="mr-2 h-4 w-4" />
            Ressources
          </TabsTrigger>
        </TabsList>

        {/* Enseignants */}
        <TabsContent value="enseignants" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Enseignants associés
              </CardTitle>
            </CardHeader>
            <CardContent>
              {enseignants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Aucun enseignant associé à ce module</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {enseignants.map((ens) => (
                    <Card key={ens.id} className="hover:border-primary/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                            <SignedPhotoImg
                              photoUrl={ens.photo_url}
                              fallbackBucket="enseignant-photos"
                              alt=""
                              className="h-full w-full object-cover"
                              fallback={<User className="h-6 w-6 text-primary" />}
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{ens.prenom} {ens.nom}</h4>
                            <p className="text-sm text-muted-foreground">{ens.email}</p>
                            {ens.pays_residence && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Building className="h-3 w-3" />
                                {ens.pays_residence}
                              </div>
                            )}
                            {ens.thematiques && ens.thematiques.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {ens.thematiques.slice(0, 3).map((theme, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {theme}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/enseignants/${ens.id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Classes */}
        <TabsContent value="classes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Classes utilisant ce module
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Aucune classe n'utilise ce module</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {classes.map((cls) => (
                    <div 
                      key={cls.module_id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <GraduationCap className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{cls.classe_nom}</h4>
                            <Badge variant="outline" className="text-xs">{cls.classe_code}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {cls.programme_titre} ({cls.programme_code})
                          </p>
                          {cls.date_debut && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(cls.date_debut), "d MMM yyyy", { locale: fr })}
                              {cls.date_fin && ` - ${format(new Date(cls.date_fin), "d MMM yyyy", { locale: fr })}`}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/classes/${cls.classe_id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Aucun document associé à ce module</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{doc.titre}</h4>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{doc.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {doc.classe_nom}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {formatUploader(doc.profiles)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(doc.created_at), "d MMM yyyy", { locale: fr })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.type_fichier && (
                          <Badge variant="secondary" className="text-xs">
                            {doc.type_fichier.split("/").pop()?.toUpperCase()}
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleOpenResource(doc.url)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ressources */}
        <TabsContent value="ressources" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Ressources pédagogiques
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ressources.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Aucune ressource pédagogique associée à ce module</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ressources.map((res) => (
                    <div 
                      key={res.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {getTypeIcon(res.type_ressource)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{res.titre}</h4>
                            {res.obligatoire && (
                              <Badge variant="destructive" className="text-xs">Obligatoire</Badge>
                            )}
                          </div>
                          {res.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{res.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {res.classe_nom}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {formatUploader(res.profiles)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(res.created_at), "d MMM yyyy", { locale: fr })}
                            </span>
                            {res.duree_minutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {res.duree_minutes} min
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {res.type_ressource}
                        </Badge>
                        {(res.url || res.fichier_url) && (
                          <Button variant="ghost" size="sm" onClick={() => handleOpenResource(res.url || res.fichier_url)}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModuleCatalogueDetail;
