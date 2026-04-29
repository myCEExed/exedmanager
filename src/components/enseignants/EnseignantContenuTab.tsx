import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Video, Link as LinkIcon, Plus, Eye, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { normalizeYouTubeUrl } from "@/lib/utils";

interface Ressource {
  id: string;
  titre: string;
  description: string | null;
  type_ressource: string;
  url: string | null;
  fichier_url?: string | null;
  fichier_type?: string | null;
  module_id: string | null;
  classe_id: string | null;
  ordre: number;
  duree_minutes: number | null;
  obligatoire: boolean;
  created_at: string;
  modules?: { titre: string; code: string };
  classes?: { nom: string; sous_code: string };
}

interface AssignedModule {
  id: string;
  code: string;
  titre: string;
  classe_id: string;
  classes: {
    id: string;
    nom: string;
    sous_code: string;
  };
}

export function EnseignantContenuTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assignedModules, setAssignedModules] = useState<AssignedModule[]>([]);
  const [assignedClasseIds, setAssignedClasseIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    type_ressource: "document",
    url: "",
    file: null as File | null,
    module_id: "none",
    classe_id: "none",
    duree_minutes: "",
    obligatoire: true,
  });

  useEffect(() => {
    if (user) {
      loadAssignedModules();
    }
  }, [user]);

  useEffect(() => {
    if (assignedClasseIds.length > 0) {
      loadRessources();
    } else {
      setLoading(false);
    }
  }, [assignedClasseIds]);

  const loadAssignedModules = async () => {
    try {
      const { data: enseignant } = await supabase
        .from("enseignants")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!enseignant) {
        setLoading(false);
        return;
      }

      const { data: affectations } = await supabase
        .from("affectations")
        .select(`
          modules (
            id,
            code,
            titre,
            classe_id,
            classes (
              id,
              nom,
              sous_code
            )
          )
        `)
        .eq("enseignant_id", enseignant.id)
        .eq("confirmee", true);

      if (affectations) {
        const modules = affectations
          .filter(a => a.modules && a.modules.classes)
          .map(a => ({
            id: a.modules!.id,
            code: a.modules!.code,
            titre: a.modules!.titre,
            classe_id: a.modules!.classe_id!,
            classes: a.modules!.classes!
          }));
        
        setAssignedModules(modules);
        const classeIds = [...new Set(modules.map(m => m.classe_id))] as string[];
        setAssignedClasseIds(classeIds);
      }
    } catch (error) {
      console.error("Error loading assigned modules:", error);
      setLoading(false);
    }
  };

  const loadRessources = async () => {
    try {
      const moduleIds = assignedModules.map(m => m.id);
      
      const { data, error } = await supabase
        .from("ressources_pedagogiques")
        .select(`
          *,
          modules (titre, code),
          classes (nom, sous_code)
        `)
        .or(`classe_id.in.(${assignedClasseIds.join(",")}),module_id.in.(${moduleIds.join(",")})`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRessources(data || []);
    } catch (error: any) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les ressources",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUploading(true);

    try {
      let fichierUrl = null;
      let fichierType = null;

      if (formData.file) {
        const fileName = `${Date.now()}_${formData.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(fileName, formData.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("documents")
          .getPublicUrl(fileName);

        fichierUrl = publicUrl;
        fichierType = formData.file.type;
      }

      const normalizedUrl = formData.url && formData.url.trim()
        ? normalizeYouTubeUrl(formData.url.trim())
        : null;

      const { error } = await supabase.from("ressources_pedagogiques").insert({
        titre: formData.titre,
        description: formData.description || null,
        type_ressource: formData.type_ressource,
        url: normalizedUrl,
        fichier_url: fichierUrl,
        fichier_type: fichierType,
        duree_minutes: formData.duree_minutes ? parseInt(formData.duree_minutes) : null,
        module_id: formData.module_id === "none" ? null : formData.module_id,
        classe_id: formData.classe_id === "none" ? null : formData.classe_id,
        uploaded_by: user.id,
        obligatoire: formData.obligatoire,
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Ressource créée avec succès",
      });

      setIsDialogOpen(false);
      setFormData({
        titre: "",
        description: "",
        type_ressource: "document",
        url: "",
        file: null,
        module_id: "none",
        classe_id: "none",
        duree_minutes: "",
        obligatoire: true,
      });
      loadRessources();
    } catch (error: any) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-5 w-5" />;
      case "lien":
        return <LinkIcon className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      video: "Vidéo",
      pdf: "PDF",
      presentation: "Présentation",
      document: "Document",
      lien: "Lien",
      autre: "Autre",
    };
    return labels[type] || type;
  };

  const uniqueClasses = [...new Map(assignedModules.map(m => [m.classes.id, m.classes])).values()];

  if (loading) {
    return <div className="text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une ressource
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle ressource pédagogique</DialogTitle>
              <DialogDescription>
                Ajoutez du contenu pour vos classes et modules
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Titre *</Label>
                <Input
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Type de ressource *</Label>
                <Select
                  value={formData.type_ressource}
                  onValueChange={(value) => setFormData({ ...formData, type_ressource: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Vidéo</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="presentation">Présentation</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="lien">Lien externe</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>URL / Lien externe (optionnel)</Label>
                <Input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label>Ou télécharger un fichier</Label>
                <Input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFormData({ ...formData, file: e.target.files[0] });
                    }
                  }}
                  className="cursor-pointer"
                />
                {formData.file && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Fichier sélectionné: {formData.file.name}
                  </p>
                )}
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Module (optionnel)</Label>
                  <Select
                    value={formData.module_id}
                    onValueChange={(value) => setFormData({ ...formData, module_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {assignedModules.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.code} - {m.titre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Classe (optionnel)</Label>
                  <Select
                    value={formData.classe_id}
                    onValueChange={(value) => setFormData({ ...formData, classe_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {uniqueClasses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.sous_code} - {c.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Durée estimée (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duree_minutes}
                  onChange={(e) => setFormData({ ...formData, duree_minutes: e.target.value })}
                  placeholder="Ex: 30"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="obligatoire"
                  checked={formData.obligatoire}
                  onCheckedChange={(checked) => setFormData({ ...formData, obligatoire: checked as boolean })}
                />
                <Label htmlFor="obligatoire" className="cursor-pointer">
                  Ressource obligatoire
                </Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? "Upload..." : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {ressources.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune ressource pour vos classes</p>
            </CardContent>
          </Card>
        ) : (
          ressources.map((ressource) => (
            <Card key={ressource.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      {getTypeIcon(ressource.type_ressource)}
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {ressource.titre}
                        <Badge variant="outline">{getTypeBadge(ressource.type_ressource)}</Badge>
                        {ressource.obligatoire && (
                          <Badge variant="secondary">Obligatoire</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {ressource.description}
                      </CardDescription>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        {ressource.classes && (
                          <span>Classe: {ressource.classes.sous_code}</span>
                        )}
                        {ressource.modules && (
                          <span>Module: {ressource.modules.code}</span>
                        )}
                        {ressource.duree_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {ressource.duree_minutes} min
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {(ressource.url || ressource.fichier_url) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(ressource.url || ressource.fichier_url || "", "_blank")}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Voir
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
