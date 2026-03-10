import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, Video, Link as LinkIcon, User, Calendar, BookOpen, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { normalizeYouTubeUrl } from "@/lib/utils";

interface Document {
  id: string;
  titre: string;
  description: string | null;
  type_fichier: string | null;
  url: string;
  created_at: string;
  uploaded_by: string;
  module_id: string | null;
  classe_id: string | null;
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
  uploaded_by: string;
  duree_minutes: number | null;
  obligatoire: boolean;
  module_id: string | null;
  classe_id: string | null;
  profiles?: { first_name: string | null; last_name: string | null; email: string } | null;
}

interface ModuleWithContent {
  id: string;
  titre: string;
  code: string;
  classe_id: string;
  classe_nom: string;
  documents: Document[];
  ressources: Ressource[];
}

interface ProgrammeContenuManagerProps {
  programmeId: string;
}

export function ProgrammeContenuManager({ programmeId }: ProgrammeContenuManagerProps) {
  const [modulesWithContent, setModulesWithContent] = useState<ModuleWithContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "documents" | "ressources">("all");

  useEffect(() => {
    if (programmeId) {
      loadContent();
    }
  }, [programmeId]);

  const loadContent = async () => {
    setLoading(true);
    try {
      // Charger les classes du programme
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("id, nom, sous_code")
        .eq("programme_id", programmeId);

      if (classesError) throw classesError;

      if (!classesData || classesData.length === 0) {
        setModulesWithContent([]);
        setLoading(false);
        return;
      }

      const classIds = classesData.map(c => c.id);
      const classesMap = Object.fromEntries(classesData.map(c => [c.id, c]));

      // Charger les modules des classes
      const { data: modulesData, error: modulesError } = await supabase
        .from("modules")
        .select("id, titre, code, classe_id")
        .in("classe_id", classIds)
        .order("date_debut", { ascending: true });

      if (modulesError) throw modulesError;

      if (!modulesData || modulesData.length === 0) {
        setModulesWithContent([]);
        setLoading(false);
        return;
      }

      const moduleIds = modulesData.map(m => m.id);

      // Charger documents et ressources en parallèle
      const [docsResult, ressResult] = await Promise.all([
        supabase
          .from("documents")
          .select("id, titre, description, type_fichier, url, created_at, uploaded_by, module_id, classe_id")
          .in("module_id", moduleIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("ressources_pedagogiques")
          .select("id, titre, description, type_ressource, url, fichier_url, created_at, uploaded_by, duree_minutes, obligatoire, module_id, classe_id")
          .in("module_id", moduleIds)
          .order("created_at", { ascending: false })
      ]);

      const docsData = docsResult.data || [];
      const ressData = ressResult.data || [];

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

      // Ajouter les profils aux documents et ressources
      const docsWithProfiles = docsData.map(doc => ({
        ...doc,
        profiles: profilesMap[doc.uploaded_by] || null
      }));

      const ressWithProfiles = ressData.map(res => ({
        ...res,
        profiles: profilesMap[res.uploaded_by] || null
      }));

      // Organiser par module
      const modulesContentMap: Record<string, ModuleWithContent> = {};
      
      modulesData.forEach(module => {
        const classe = classesMap[module.classe_id!];
        modulesContentMap[module.id] = {
          id: module.id,
          titre: module.titre,
          code: module.code,
          classe_id: module.classe_id!,
          classe_nom: classe ? `${classe.sous_code} - ${classe.nom}` : "Classe inconnue",
          documents: [],
          ressources: []
        };
      });

      docsWithProfiles.forEach(doc => {
        if (doc.module_id && modulesContentMap[doc.module_id]) {
          modulesContentMap[doc.module_id].documents.push(doc);
        }
      });

      ressWithProfiles.forEach(res => {
        if (res.module_id && modulesContentMap[res.module_id]) {
          modulesContentMap[res.module_id].ressources.push(res);
        }
      });

      // Filtrer les modules qui ont du contenu
      const modulesWithContentArray = Object.values(modulesContentMap).filter(
        m => m.documents.length > 0 || m.ressources.length > 0
      );

      setModulesWithContent(modulesWithContentArray);
    } catch (error) {
      console.error("Error loading programme content:", error);
    } finally {
      setLoading(false);
    }
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

  const formatUploader = (profile: { first_name: string | null; last_name: string | null; email: string } | null) => {
    if (!profile) return "Inconnu";
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    return profile.email;
  };

  const handleOpenResource = (url: string | null) => {
    if (!url) return;
    const normalizedUrl = normalizeYouTubeUrl(url);
    window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
  };

  const totalDocuments = modulesWithContent.reduce((sum, m) => sum + m.documents.length, 0);
  const totalRessources = modulesWithContent.reduce((sum, m) => sum + m.ressources.length, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (modulesWithContent.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contenu pédagogique
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Aucun document ou ressource pédagogique associé aux modules de ce programme</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contenu pédagogique
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {totalDocuments} document{totalDocuments > 1 ? "s" : ""}
            </Badge>
            <Badge variant="secondary">
              {totalRessources} ressource{totalRessources > 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all">Tout</TabsTrigger>
            <TabsTrigger value="documents">Documents ({totalDocuments})</TabsTrigger>
            <TabsTrigger value="ressources">Ressources ({totalRessources})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Accordion type="multiple" className="w-full">
              {modulesWithContent.map((module) => (
                <AccordionItem key={module.id} value={module.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <div>
                        <span className="font-medium">{module.titre}</span>
                        <span className="text-sm text-muted-foreground ml-2">({module.code})</span>
                        <div className="text-xs text-muted-foreground">{module.classe_nom}</div>
                      </div>
                      <div className="flex gap-2 ml-auto mr-4">
                        <Badge variant="outline" className="text-xs">
                          {module.documents.length} doc{module.documents.length > 1 ? "s" : ""}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {module.ressources.length} res.
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {module.documents.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Documents
                          </h4>
                          <div className="space-y-2">
                            {module.documents.map((doc) => (
                              <DocumentCard 
                                key={doc.id} 
                                doc={doc} 
                                formatUploader={formatUploader}
                                onOpen={handleOpenResource}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {module.ressources.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            Ressources pédagogiques
                          </h4>
                          <div className="space-y-2">
                            {module.ressources.map((res) => (
                              <RessourceCard 
                                key={res.id} 
                                res={res} 
                                formatUploader={formatUploader}
                                getTypeIcon={getTypeIcon}
                                onOpen={handleOpenResource}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>

          <TabsContent value="documents">
            <Accordion type="multiple" className="w-full">
              {modulesWithContent
                .filter(m => m.documents.length > 0)
                .map((module) => (
                  <AccordionItem key={module.id} value={module.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <div>
                          <span className="font-medium">{module.titre}</span>
                          <span className="text-sm text-muted-foreground ml-2">({module.code})</span>
                          <div className="text-xs text-muted-foreground">{module.classe_nom}</div>
                        </div>
                        <Badge variant="outline" className="text-xs ml-auto mr-4">
                          {module.documents.length} document{module.documents.length > 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {module.documents.map((doc) => (
                          <DocumentCard 
                            key={doc.id} 
                            doc={doc} 
                            formatUploader={formatUploader}
                            onOpen={handleOpenResource}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          </TabsContent>

          <TabsContent value="ressources">
            <Accordion type="multiple" className="w-full">
              {modulesWithContent
                .filter(m => m.ressources.length > 0)
                .map((module) => (
                  <AccordionItem key={module.id} value={module.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <div>
                          <span className="font-medium">{module.titre}</span>
                          <span className="text-sm text-muted-foreground ml-2">({module.code})</span>
                          <div className="text-xs text-muted-foreground">{module.classe_nom}</div>
                        </div>
                        <Badge variant="outline" className="text-xs ml-auto mr-4">
                          {module.ressources.length} ressource{module.ressources.length > 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {module.ressources.map((res) => (
                          <RessourceCard 
                            key={res.id} 
                            res={res} 
                            formatUploader={formatUploader}
                            getTypeIcon={getTypeIcon}
                            onOpen={handleOpenResource}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Sous-composant pour l'affichage d'un document
function DocumentCard({ 
  doc, 
  formatUploader,
  onOpen
}: { 
  doc: Document; 
  formatUploader: (profile: { first_name: string | null; last_name: string | null; email: string } | null) => string;
  onOpen: (url: string | null) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <h5 className="font-medium text-sm">{doc.titre}</h5>
          {doc.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{doc.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
        <Button variant="ghost" size="sm" onClick={() => onOpen(doc.url)}>
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Sous-composant pour l'affichage d'une ressource
function RessourceCard({ 
  res, 
  formatUploader,
  getTypeIcon,
  onOpen
}: { 
  res: Ressource; 
  formatUploader: (profile: { first_name: string | null; last_name: string | null; email: string } | null) => string;
  getTypeIcon: (type: string) => JSX.Element;
  onOpen: (url: string | null) => void;
}) {
  const resourceUrl = res.url || res.fichier_url;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          {getTypeIcon(res.type_ressource)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h5 className="font-medium text-sm">{res.titre}</h5>
            {res.obligatoire && (
              <Badge variant="destructive" className="text-xs">
                Obligatoire
              </Badge>
            )}
          </div>
          {res.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{res.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
        {resourceUrl && (
          <Button variant="ghost" size="sm" onClick={() => onOpen(resourceUrl)}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
