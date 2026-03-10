import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Video, Link as LinkIcon, Plus, Trash2, Eye, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FileViewer, extractStoragePath } from "@/components/FileViewer";
import { normalizeYouTubeUrl } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface Programme {
  id: string;
  titre: string;
  code: string;
}

interface Classe {
  id: string;
  nom: string;
  sous_code: string;
  programme_id: string;
}

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

export default function ContenuPedagogique() {
  const { user } = useAuth();
  const { canEditSection } = useUserRole();
  const canEdit = canEditSection("contenu_pedagogique");
  const { toast } = useToast();
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRessource, setEditingRessource] = useState<Ressource | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);

  // Filters
  const [filterProgrammeId, setFilterProgrammeId] = useState<string>("all");
  const [filterClasseId, setFilterClasseId] = useState<string>("all");
  const [filteredClasses, setFilteredClasses] = useState<Classe[]>([]);

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

  const [editFormData, setEditFormData] = useState({
    titre: "",
    description: "",
    type_ressource: "document",
    url: "",
    module_id: "none",
    classe_id: "none",
    duree_minutes: "",
    obligatoire: true,
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchRessources();
    fetchModules();
    fetchClasses();
    fetchProgrammes();
  }, []);

  // Filter classes when programme changes
  useEffect(() => {
    if (filterProgrammeId === "all") {
      setFilteredClasses(classes);
    } else {
      setFilteredClasses(classes.filter((c) => c.programme_id === filterProgrammeId));
    }
    setFilterClasseId("all");
  }, [filterProgrammeId, classes]);

  const fetchRessources = async () => {
    try {
      const { data, error } = await supabase
        .from("ressources_pedagogiques")
        .select(`
          *,
          modules (titre, code),
          classes (nom, sous_code)
        `)
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

  const fetchModules = async () => {
    const { data } = await supabase.from("modules").select("id, titre, code, classe_id").order("code");
    if (data) setModules(data);
  };

  const fetchClasses = async () => {
    const { data } = await supabase.from("classes").select("id, nom, sous_code, programme_id").order("sous_code");
    if (data) setClasses(data);
  };

  const fetchProgrammes = async () => {
    const { data } = await supabase.from("programmes").select("id, titre, code").order("code");
    if (data) setProgrammes(data);
  };

  // Filtered ressources based on programme and classe filters
  const getFilteredRessources = () => {
    let filtered = ressources;

    if (filterClasseId !== "all") {
      filtered = filtered.filter((r) => r.classe_id === filterClasseId);
    } else if (filterProgrammeId !== "all") {
      const classeIdsInProgramme = classes
        .filter((c) => c.programme_id === filterProgrammeId)
        .map((c) => c.id);
      filtered = filtered.filter((r) => r.classe_id && classeIdsInProgramme.includes(r.classe_id));
    }

    return filtered;
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
      fetchRessources();
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

  const handleEdit = (ressource: Ressource) => {
    setEditingRessource(ressource);
    setEditFormData({
      titre: ressource.titre,
      description: ressource.description || "",
      type_ressource: ressource.type_ressource,
      url: ressource.url || "",
      module_id: ressource.module_id || "none",
      classe_id: ressource.classe_id || "none",
      duree_minutes: ressource.duree_minutes?.toString() || "",
      obligatoire: ressource.obligatoire,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRessource) return;

    setUploading(true);

    try {
      const normalizedUrl = editFormData.url && editFormData.url.trim()
        ? normalizeYouTubeUrl(editFormData.url.trim())
        : null;

      const { error } = await supabase
        .from("ressources_pedagogiques")
        .update({
          titre: editFormData.titre,
          description: editFormData.description || null,
          type_ressource: editFormData.type_ressource,
          url: normalizedUrl,
          duree_minutes: editFormData.duree_minutes ? parseInt(editFormData.duree_minutes) : null,
          module_id: editFormData.module_id === "none" ? null : editFormData.module_id,
          classe_id: editFormData.classe_id === "none" ? null : editFormData.classe_id,
          obligatoire: editFormData.obligatoire,
        })
        .eq("id", editingRessource.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Ressource modifiée avec succès",
      });

      setIsEditDialogOpen(false);
      setEditingRessource(null);
      fetchRessources();
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

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette ressource ?")) return;

    try {
      const { error } = await supabase.from("ressources_pedagogiques").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Succès",
        description: "Ressource supprimée",
      });
      fetchRessources();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
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

  const filteredRessources = getFilteredRessources();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contenu Pédagogique</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les ressources de formation
          </p>
        </div>
        {canEdit && (
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
                        {modules.map((m) => (
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
                        {classes.map((c) => (
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

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="obligatoire"
                    checked={formData.obligatoire}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, obligatoire: checked as boolean })
                    }
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
                    {uploading ? "Téléchargement..." : "Créer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="w-64">
          <Label>Filtrer par Programme</Label>
          <Select value={filterProgrammeId} onValueChange={setFilterProgrammeId}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les programmes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les programmes</SelectItem>
              {programmes.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.code} - {p.titre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-64">
          <Label>Filtrer par Classe</Label>
          <Select value={filterClasseId} onValueChange={setFilterClasseId}>
            <SelectTrigger>
              <SelectValue placeholder="Toutes les classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les classes</SelectItem>
              {filteredClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.sous_code} - {c.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la ressource</DialogTitle>
            <DialogDescription>
              Modifiez les informations de cette ressource
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input
                value={editFormData.titre}
                onChange={(e) => setEditFormData({ ...editFormData, titre: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Type de ressource *</Label>
              <Select
                value={editFormData.type_ressource}
                onValueChange={(value) => setEditFormData({ ...editFormData, type_ressource: value })}
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
              <Label>URL / Lien externe</Label>
              <Input
                type="url"
                value={editFormData.url}
                onChange={(e) => setEditFormData({ ...editFormData, url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Module (optionnel)</Label>
                <Select
                  value={editFormData.module_id}
                  onValueChange={(value) => setEditFormData({ ...editFormData, module_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {modules.map((m) => (
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
                  value={editFormData.classe_id}
                  onValueChange={(value) => setEditFormData({ ...editFormData, classe_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {classes.map((c) => (
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
                value={editFormData.duree_minutes}
                onChange={(e) => setEditFormData({ ...editFormData, duree_minutes: e.target.value })}
                placeholder="Ex: 30"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-obligatoire"
                checked={editFormData.obligatoire}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, obligatoire: checked as boolean })
                }
              />
              <Label htmlFor="edit-obligatoire" className="cursor-pointer">
                Ressource obligatoire
              </Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {filteredRessources.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune ressource disponible</p>
            </CardContent>
          </Card>
        ) : (
          filteredRessources.map((ressource) => (
            <Card key={ressource.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {getTypeIcon(ressource.type_ressource)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        {ressource.titre}
                        <Badge variant="secondary">{getTypeBadge(ressource.type_ressource)}</Badge>
                        {ressource.obligatoire && (
                          <Badge variant="destructive">Obligatoire</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {ressource.description}
                      </CardDescription>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                        {ressource.modules && (
                          <span>Module: {ressource.modules.code}</span>
                        )}
                        {ressource.classes && (
                          <span>Classe: {ressource.classes.sous_code}</span>
                        )}
                        {ressource.duree_minutes && (
                          <span>Durée: {ressource.duree_minutes} min</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {ressource.fichier_url ? (
                      <FileViewer
                        fileName={ressource.titre}
                        fileType={ressource.fichier_type || null}
                        storageBucket="documents"
                        storagePath={extractStoragePath(ressource.fichier_url, "documents")}
                        title={ressource.titre}
                      />
                    ) : ressource.url ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(normalizeYouTubeUrl(ressource.url!), "_blank", "noopener,noreferrer")}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Accéder
                      </Button>
                    ) : null}
                    {canEdit && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(ressource)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(ressource.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
