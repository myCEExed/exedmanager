import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Video, Link as LinkIcon, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Document {
  id: string;
  titre: string;
  description: string | null;
  type_fichier: string | null;
  url: string;
  created_at: string;
  uploaded_by: string;
  profiles?: { first_name: string | null; last_name: string | null; email: string } | null;
}

interface Ressource {
  id: string;
  titre: string;
  description: string | null;
  type_ressource: string;
  url: string | null;
  created_at: string;
  uploaded_by: string;
  duree_minutes: number | null;
  obligatoire: boolean;
  profiles?: { first_name: string | null; last_name: string | null; email: string } | null;
}

interface ModuleResourcesHistoryProps {
  moduleId: string;
}

export function ModuleResourcesHistory({ moduleId }: ModuleResourcesHistoryProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (moduleId) {
      loadHistory();
    }
  }, [moduleId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Charger les documents du module
      const { data: docsData, error: docsError } = await supabase
        .from("documents")
        .select(`
          id,
          titre,
          description,
          type_fichier,
          url,
          created_at,
          uploaded_by
        `)
        .eq("module_id", moduleId)
        .order("created_at", { ascending: false });

      if (docsError) throw docsError;

      // Charger les ressources pédagogiques du module
      const { data: ressData, error: ressError } = await supabase
        .from("ressources_pedagogiques")
        .select(`
          id,
          titre,
          description,
          type_ressource,
          url,
          created_at,
          uploaded_by,
          duree_minutes,
          obligatoire
        `)
        .eq("module_id", moduleId)
        .order("created_at", { ascending: false });

      if (ressError) throw ressError;

      // Récupérer tous les user_ids uniques pour les profils
      const allUploaderIds = [
        ...new Set([
          ...(docsData || []).map(d => d.uploaded_by),
          ...(ressData || []).map(r => r.uploaded_by)
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

      // Ajouter les profils aux données
      setDocuments((docsData || []).map(doc => ({
        ...doc,
        profiles: profilesMap[doc.uploaded_by] || null
      })));

      setRessources((ressData || []).map(res => ({
        ...res,
        profiles: profilesMap[res.uploaded_by] || null
      })));
    } catch (error) {
      console.error("Error loading module history:", error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="documents" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="documents">
          Documents ({documents.length})
        </TabsTrigger>
        <TabsTrigger value="ressources">
          Ressources pédagogiques ({ressources.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="documents" className="mt-4">
        {documents.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Aucun document associé à ce module
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-medium">{doc.titre}</h4>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {formatUploader(doc.profiles)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(doc.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {doc.type_fichier && (
                      <Badge variant="secondary" className="text-xs">
                        {doc.type_fichier.split("/").pop()?.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="ressources" className="mt-4">
        {ressources.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Aucune ressource pédagogique associée à ce module
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {ressources.map((res) => (
              <Card key={res.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {getTypeIcon(res.type_ressource)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{res.titre}</h4>
                          {res.obligatoire && (
                            <Badge variant="destructive" className="text-xs">
                              Obligatoire
                            </Badge>
                          )}
                        </div>
                        {res.description && (
                          <p className="text-sm text-muted-foreground mt-1">{res.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {formatUploader(res.profiles)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(res.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                          </span>
                          {res.duree_minutes && (
                            <span>{res.duree_minutes} min</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {res.type_ressource}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}