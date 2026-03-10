import { useState, useEffect } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Trash2, Eye, Download, Music, Video, FileSpreadsheet, Presentation } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Document {
  id: string;
  titre: string;
  description: string | null;
  type_fichier: string | null;
  url: string;
  taille: number | null;
  created_at: string;
  classe_id: string | null;
  module_id: string | null;
  modules?: { titre: string; code: string } | null;
  classes?: { nom: string; sous_code: string } | null;
}

interface Class {
  id: string;
  nom: string;
  sous_code: string;
  programme_id: string;
}

interface Programme {
  id: string;
  titre: string;
  code: string;
}

interface Module {
  id: string;
  titre: string;
  code: string;
  classe_id: string | null;
}

export default function Documents() {
  const { canEditSection, role } = useUserRole();
  const canEdit = canEditSection("documents");
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [filteredModules, setFilteredModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Filtres
  const [filterProgrammeId, setFilterProgrammeId] = useState<string>("all");
  const [filterClasseId, setFilterClasseId] = useState<string>("all");
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  
  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    classe_id: "",
    module_id: "",
    file: null as File | null,
  });

  useEffect(() => {
    loadDocuments();
    loadProgrammes();
    loadClasses();
    loadModules();
  }, []);

  // Filtrer les classes selon le programme sélectionné (pour les filtres)
  useEffect(() => {
    if (filterProgrammeId && filterProgrammeId !== "all") {
      setFilteredClasses(classes.filter(c => c.programme_id === filterProgrammeId));
      // Reset classe filter if current class doesn't belong to selected programme
      if (filterClasseId !== "all") {
        const classeExists = classes.find(c => c.id === filterClasseId && c.programme_id === filterProgrammeId);
        if (!classeExists) {
          setFilterClasseId("all");
        }
      }
    } else {
      setFilteredClasses(classes);
    }
  }, [filterProgrammeId, classes]);

  // Filtrer les modules selon la classe sélectionnée (pour le formulaire)
  useEffect(() => {
    if (formData.classe_id) {
      setFilteredModules(modules.filter(m => m.classe_id === formData.classe_id));
      if (formData.module_id) {
        const moduleExists = modules.find(m => m.id === formData.module_id && m.classe_id === formData.classe_id);
        if (!moduleExists) {
          setFormData(prev => ({ ...prev, module_id: "" }));
        }
      }
    } else {
      setFilteredModules([]);
      setFormData(prev => ({ ...prev, module_id: "" }));
    }
  }, [formData.classe_id, modules]);

  const loadProgrammes = async () => {
    try {
      const { data, error } = await supabase
        .from("programmes")
        .select("id, titre, code")
        .order("code");

      if (error) throw error;
      setProgrammes(data || []);
    } catch (error) {
      console.error("Error loading programmes:", error);
    }
  };

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id, nom, sous_code, programme_id")
        .order("nom");

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error("Error loading classes:", error);
    }
  };

  const loadModules = async () => {
    try {
      const { data, error } = await supabase
        .from("modules")
        .select("id, titre, code, classe_id")
        .order("code");

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error("Error loading modules:", error);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          modules (titre, code),
          classes (nom, sous_code)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, file: e.target.files[0] });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier",
        variant: "destructive",
      });
      return;
    }

    if (!formData.classe_id) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une classe",
        variant: "destructive",
      });
      return;
    }

    if (!formData.module_id) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un module",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileName = `${Date.now()}_${formData.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, formData.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName);

      // Create document record
      const { error: dbError } = await supabase
        .from("documents")
        .insert([{
          titre: formData.titre,
          description: formData.description || null,
          type_fichier: formData.file.type,
          url: publicUrl,
          taille: formData.file.size,
          classe_id: formData.classe_id,
          module_id: formData.module_id,
          uploaded_by: user?.id,
        }]);

      if (dbError) throw dbError;

      toast({
        title: "Document ajouté",
        description: "Le document a été téléchargé avec succès",
      });

      setIsDialogOpen(false);
      setFormData({
        titre: "",
        description: "",
        classe_id: "",
        module_id: "",
        file: null,
      });
      loadDocuments();
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de télécharger le document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;

    try {
      // Extract filename from URL
      const fileName = url.split("/").pop();
      
      if (fileName) {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from("documents")
          .remove([fileName]);

        if (storageError) console.error("Storage deletion error:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé avec succès",
      });

      loadDocuments();
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <FileText className="w-8 h-8 text-muted-foreground" />;
    
    if (fileType.includes("pdf")) return <FileText className="w-8 h-8 text-red-500" />;
    if (fileType.includes("word") || fileType.includes("document")) return <FileText className="w-8 h-8 text-blue-500" />;
    if (fileType.includes("sheet") || fileType.includes("excel")) return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    if (fileType.includes("presentation") || fileType.includes("powerpoint")) return <Presentation className="w-8 h-8 text-orange-500" />;
    if (fileType.includes("audio")) return <Music className="w-8 h-8 text-purple-500" />;
    if (fileType.includes("video")) return <Video className="w-8 h-8 text-pink-500" />;
    
    return <FileText className="w-8 h-8 text-muted-foreground" />;
  };

  const extractStoragePath = (url: string): string => {
    if (!url.includes("http")) return url;
    const bucketIndex = url.indexOf("/storage/v1/object/public/documents/");
    if (bucketIndex !== -1) {
      return decodeURIComponent(url.substring(bucketIndex + "/storage/v1/object/public/documents/".length));
    }
    const parts = url.split("/");
    return parts[parts.length - 1];
  };

  const handleViewFile = async (doc: Document) => {
    try {
      const storagePath = extractStoragePath(doc.url);
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(storagePath, 3600);

      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      console.error("Error viewing file:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le fichier",
        variant: "destructive",
      });
    }
  };

  const handleDownloadFile = async (doc: Document) => {
    try {
      const storagePath = extractStoragePath(doc.url);
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(storagePath, 3600);

      if (error) throw error;
      
      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.titre || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Téléchargement démarré",
        description: `${doc.titre} est en cours de téléchargement`,
      });
    } catch (error: any) {
      console.error("Error downloading file:", error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le fichier",
        variant: "destructive",
      });
    }
  };

  // Documents filtrés selon les filtres sélectionnés
  const filteredDocuments = documents.filter(doc => {
    // Filtre par classe
    if (filterClasseId !== "all" && doc.classe_id !== filterClasseId) {
      return false;
    }
    // Filtre par programme (via la classe)
    if (filterProgrammeId !== "all" && filterClasseId === "all") {
      const docClasse = classes.find(c => c.id === doc.classe_id);
      if (!docClasse || docClasse.programme_id !== filterProgrammeId) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Gérez et partagez vos documents de formation
          </p>
        </div>
        {(canEdit || role === "enseignant") && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Nouveau document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Télécharger un document</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouveau document à partager
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="titre">Titre *</Label>
                  <Input
                    id="titre"
                    value={formData.titre}
                    onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classe_id">Classe *</Label>
                  <Select
                    value={formData.classe_id}
                    onValueChange={(value) => setFormData({ ...formData, classe_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une classe" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((classe) => (
                        <SelectItem key={classe.id} value={classe.id}>
                          {classe.sous_code} - {classe.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="module_id">Module *</Label>
                  <Select
                    value={formData.module_id}
                    onValueChange={(value) => setFormData({ ...formData, module_id: value })}
                    disabled={!formData.classe_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.classe_id ? "Sélectionner un module" : "Sélectionnez d'abord une classe"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredModules.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.code} - {module.titre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">Fichier *</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? "Téléchargement..." : "Télécharger"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-4">
        <div className="w-full sm:w-auto min-w-[200px]">
          <Label className="text-sm text-muted-foreground mb-1 block">Programme</Label>
          <Select value={filterProgrammeId} onValueChange={setFilterProgrammeId}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les programmes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les programmes</SelectItem>
              {programmes.map((prog) => (
                <SelectItem key={prog.id} value={prog.id}>
                  {prog.code} - {prog.titre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-auto min-w-[200px]">
          <Label className="text-sm text-muted-foreground mb-1 block">Classe</Label>
          <Select 
            value={filterClasseId} 
            onValueChange={setFilterClasseId}
            disabled={filterProgrammeId === "all"}
          >
            <SelectTrigger>
              <SelectValue placeholder={filterProgrammeId === "all" ? "Sélectionnez un programme" : "Toutes les classes"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les classes</SelectItem>
              {filteredClasses.map((classe) => (
                <SelectItem key={classe.id} value={classe.id}>
                  {classe.sous_code} - {classe.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Aucun document disponible</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{doc.titre}</CardTitle>
                    {doc.description && (
                      <CardDescription className="mt-1 text-xs line-clamp-2">{doc.description}</CardDescription>
                    )}
                  </div>
                  <button
                    onClick={() => handleViewFile(doc)}
                    className="p-2 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer flex-shrink-0"
                    title="Cliquer pour visualiser"
                  >
                    {getFileIcon(doc.type_fichier)}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Classe</span>
                    <span className="truncate max-w-[120px]">{doc.classes?.sous_code || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Module</span>
                    <span className="truncate max-w-[120px]">{doc.modules?.code || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Taille</span>
                    <span>{formatFileSize(doc.taille)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Ajouté le</span>
                    <span>{format(new Date(doc.created_at), "d MMM yyyy", { locale: fr })}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-0 text-xs px-2"
                      onClick={() => handleViewFile(doc)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                      <span className="truncate">Voir</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-0 text-xs px-2"
                      onClick={() => handleDownloadFile(doc)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                      <span className="truncate">Télécharger</span>
                    </Button>
                    {(canEdit || role === "enseignant") && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="px-2"
                        onClick={() => handleDelete(doc.id, doc.url)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
