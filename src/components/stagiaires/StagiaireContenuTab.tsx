import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, ExternalLink, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Document {
  id: string;
  titre: string;
  description: string | null;
  url: string;
  type_fichier: string | null;
  created_at: string;
  classe: {
    nom: string;
    programme: {
      titre: string;
    };
  } | null;
  module: {
    titre: string;
  } | null;
}

export function StagiaireContenuTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    try {
      // Get stagiaire's enrolled classes
      const { data: stagiaire } = await supabase
        .from("stagiaires")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!stagiaire) {
        setLoading(false);
        return;
      }

      // Get inscriptions to find enrolled classes
      const { data: inscriptions } = await supabase
        .from("inscriptions")
        .select("classe_id")
        .eq("stagiaire_id", stagiaire.id);

      if (!inscriptions || inscriptions.length === 0) {
        setLoading(false);
        return;
      }

      const classeIds = inscriptions.map(i => i.classe_id);

      // Get documents for enrolled classes
      const { data, error } = await supabase
        .from("documents")
        .select(`
          id,
          titre,
          description,
          url,
          type_fichier,
          created_at,
          classes (
            nom,
            programmes (
              titre
            )
          ),
          modules (
            titre
          )
        `)
        .in("classe_id", classeIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const validDocuments = data.map(doc => ({
          id: doc.id,
          titre: doc.titre,
          description: doc.description,
          url: doc.url,
          type_fichier: doc.type_fichier,
          created_at: doc.created_at,
          classe: doc.classes ? {
            nom: doc.classes.nom,
            programme: {
              titre: doc.classes.programmes?.titre || "Programme"
            }
          } : null,
          module: doc.modules ? { titre: doc.modules.titre } : null
        }));
        setDocuments(validDocuments);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type: string | null) => {
    return <FileText className="h-8 w-8 text-primary" />;
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucun contenu pédagogique disponible</p>
          <p className="text-sm text-muted-foreground mt-2">
            Les documents seront disponibles ici lorsque vos formateurs les partageront
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id}>
          <CardHeader className="flex flex-row items-start gap-4 pb-2">
            <div className="flex-shrink-0">{getFileIcon(doc.type_fichier)}</div>
            <div className="flex-1">
              <CardTitle className="text-lg">{doc.titre}</CardTitle>
              <CardDescription>
                {doc.classe && (
                  <span>{doc.classe.programme.titre} - {doc.classe.nom}</span>
                )}
                {doc.module && <span> • {doc.module.titre}</span>}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {doc.description && (
              <p className="text-sm text-muted-foreground mb-4">{doc.description}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Ajouté le {format(new Date(doc.created_at), "d MMMM yyyy", { locale: fr })}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ouvrir
                  </a>
                </Button>
                <Button variant="default" size="sm" asChild>
                  <a href={doc.url} download>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
