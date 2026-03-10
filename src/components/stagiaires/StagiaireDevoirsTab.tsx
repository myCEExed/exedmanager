import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Calendar, CheckCircle, Upload, FileText, Loader2, Download, Trash2 } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { fr } from "date-fns/locale";

interface Devoir {
  id: string;
  titre: string;
  description: string | null;
  instructions: string | null;
  date_ouverture: string;
  date_limite: string;
  type_devoir: string;
  coefficient: number;
  points_max: number | null;
  accepte_fichiers: boolean | null;
  formats_acceptes: string[] | null;
  taille_max_mb: number | null;
  classe: {
    nom: string;
    programme: {
      titre: string;
    };
  } | null;
  module: {
    titre: string;
  } | null;
  soumission: {
    id: string;
    date_soumission: string;
    fichier_url: string | null;
    fichier_nom: string | null;
    commentaire_stagiaire: string | null;
    statut: string | null;
    note: number | null;
    commentaire_enseignant: string | null;
  } | null;
}

export function StagiaireDevoirsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [devoirs, setDevoirs] = useState<Devoir[]>([]);
  const [loading, setLoading] = useState(true);
  const [stagiaireId, setStagiaireId] = useState<string | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedDevoir, setSelectedDevoir] = useState<Devoir | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadDevoirs();
    }
  }, [user]);

  const loadDevoirs = async () => {
    try {
      const { data: stagiaire } = await supabase
        .from("stagiaires")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!stagiaire) {
        setLoading(false);
        return;
      }

      setStagiaireId(stagiaire.id);

      // Get enrolled classes
      const { data: inscriptions } = await supabase
        .from("inscriptions")
        .select("classe_id")
        .eq("stagiaire_id", stagiaire.id);

      if (!inscriptions || inscriptions.length === 0) {
        setLoading(false);
        return;
      }

      const classeIds = inscriptions.map(i => i.classe_id);

      // Get devoirs for enrolled classes
      const { data, error } = await supabase
        .from("devoirs")
        .select(`
          id,
          titre,
          description,
          instructions,
          date_ouverture,
          date_limite,
          type_devoir,
          coefficient,
          points_max,
          accepte_fichiers,
          formats_acceptes,
          taille_max_mb,
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
        .order("date_limite", { ascending: true });

      if (error) throw error;

      // Get soumissions for these devoirs
      const devoirIds = data?.map(d => d.id) || [];
      const { data: soumissions } = await supabase
        .from("soumissions_devoirs")
        .select("id, devoir_id, date_soumission, fichier_url, fichier_nom, commentaire_stagiaire, statut, commentaire_enseignant")
        .eq("stagiaire_id", stagiaire.id)
        .in("devoir_id", devoirIds);

      // Get notes for soumissions
      const soumissionIds = soumissions?.map(s => s.id) || [];
      const { data: notes } = await supabase
        .from("notes_stagiaires")
        .select("soumission_devoir_id, note")
        .in("soumission_devoir_id", soumissionIds);

      if (data) {
        const devoirsWithSoumissions = data.map(devoir => {
          const soumission = soumissions?.find(s => s.devoir_id === devoir.id);
          const note = notes?.find(n => n.soumission_devoir_id === soumission?.id);
          
          return {
            id: devoir.id,
            titre: devoir.titre,
            description: devoir.description,
            instructions: devoir.instructions,
            date_ouverture: devoir.date_ouverture,
            date_limite: devoir.date_limite,
            type_devoir: devoir.type_devoir,
            coefficient: devoir.coefficient,
            points_max: devoir.points_max,
            accepte_fichiers: devoir.accepte_fichiers,
            formats_acceptes: devoir.formats_acceptes,
            taille_max_mb: devoir.taille_max_mb,
            classe: devoir.classes ? {
              nom: devoir.classes.nom,
              programme: {
                titre: devoir.classes.programmes?.titre || "Programme"
              }
            } : null,
            module: devoir.modules ? { titre: devoir.modules.titre } : null,
            soumission: soumission ? {
              id: soumission.id,
              date_soumission: soumission.date_soumission,
              fichier_url: soumission.fichier_url,
              fichier_nom: soumission.fichier_nom,
              commentaire_stagiaire: soumission.commentaire_stagiaire,
              statut: soumission.statut,
              note: note?.note || null,
              commentaire_enseignant: soumission.commentaire_enseignant
            } : null
          };
        });
        setDevoirs(devoirsWithSoumissions);
      }
    } catch (error) {
      console.error("Error loading devoirs:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les devoirs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatut = (devoir: Devoir) => {
    if (devoir.soumission) {
      if (devoir.soumission.note !== null) {
        return { label: "Noté", variant: "default" as const, className: "bg-green-600" };
      }
      if (devoir.soumission.statut === "corrige") {
        return { label: "Corrigé", variant: "secondary" as const, className: "" };
      }
      if (devoir.soumission.statut === "refuse") {
        return { label: "Refusé", variant: "destructive" as const, className: "" };
      }
      return { label: "Rendu", variant: "secondary" as const, className: "" };
    }
    if (isPast(new Date(devoir.date_limite))) {
      return { label: "En retard", variant: "destructive" as const, className: "" };
    }
    if (isFuture(new Date(devoir.date_ouverture))) {
      return { label: "À venir", variant: "outline" as const, className: "" };
    }
    return { label: "À rendre", variant: "outline" as const, className: "text-orange-600 border-orange-600" };
  };

  const canSubmit = (devoir: Devoir) => {
    const now = new Date();
    const dateOuverture = new Date(devoir.date_ouverture);
    const dateLimite = new Date(devoir.date_limite);
    
    // Can submit if within the submission window and not already submitted (or submission was refused)
    return now >= dateOuverture && now <= dateLimite && 
           (!devoir.soumission || devoir.soumission.statut === "refuse");
  };

  const handleOpenSubmitDialog = (devoir: Devoir) => {
    setSelectedDevoir(devoir);
    setSelectedFile(null);
    setCommentaire(devoir.soumission?.commentaire_stagiaire || "");
    setSubmitDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDevoir) return;

    // Check file size
    const maxSizeMB = selectedDevoir.taille_max_mb || 20;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: `La taille maximale est de ${maxSizeMB} Mo`,
        variant: "destructive",
      });
      return;
    }

    // Check file format if restrictions exist
    if (selectedDevoir.formats_acceptes && selectedDevoir.formats_acceptes.length > 0) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension && !selectedDevoir.formats_acceptes.includes(`.${extension}`)) {
        toast({
          title: "Format non accepté",
          description: `Formats acceptés: ${selectedDevoir.formats_acceptes.join(", ")}`,
          variant: "destructive",
        });
        return;
      }
    }

    setSelectedFile(file);
  };

  const handleSubmitDevoir = async () => {
    if (!selectedDevoir || !stagiaireId || !user) return;

    setUploading(true);
    try {
      let fichierUrl: string | null = null;
      let fichierNom: string | null = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${user.id}/${selectedDevoir.id}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("soumissions-devoirs")
          .upload(fileName, selectedFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        fichierUrl = fileName;
        fichierNom = selectedFile.name;
      }

      // Create or update soumission
      if (selectedDevoir.soumission) {
        // Update existing submission
        const { error } = await supabase
          .from("soumissions_devoirs")
          .update({
            fichier_url: fichierUrl || selectedDevoir.soumission.fichier_url,
            fichier_nom: fichierNom || selectedDevoir.soumission.fichier_nom,
            commentaire_stagiaire: commentaire || null,
            date_soumission: new Date().toISOString(),
            statut: "soumis",
            updated_at: new Date().toISOString()
          })
          .eq("id", selectedDevoir.soumission.id);

        if (error) throw error;
      } else {
        // Create new submission
        const { error } = await supabase
          .from("soumissions_devoirs")
          .insert({
            devoir_id: selectedDevoir.id,
            stagiaire_id: stagiaireId,
            fichier_url: fichierUrl,
            fichier_nom: fichierNom,
            commentaire_stagiaire: commentaire || null,
            statut: "soumis"
          });

        if (error) throw error;
      }

      toast({
        title: "Devoir soumis",
        description: "Votre devoir a été déposé avec succès",
      });

      setSubmitDialogOpen(false);
      loadDevoirs();
    } catch (error: any) {
      console.error("Error submitting devoir:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de soumettre le devoir",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadFile = async (devoir: Devoir) => {
    if (!devoir.soumission?.fichier_url) return;

    try {
      const { data, error } = await supabase.storage
        .from("soumissions-devoirs")
        .download(devoir.soumission.fichier_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = devoir.soumission.fichier_nom || "devoir";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le fichier",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  if (devoirs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucun devoir assigné</p>
          <p className="text-sm text-muted-foreground mt-2">
            Les devoirs apparaîtront ici lorsque vos formateurs en créeront
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {devoirs.map((devoir) => {
          const statut = getStatut(devoir);
          const canSubmitDevoir = canSubmit(devoir);
          
          return (
            <Card key={devoir.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {devoir.titre}
                      <Badge variant={statut.variant} className={statut.className}>
                        {statut.label}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {devoir.classe && (
                        <span>{devoir.classe.programme.titre} - {devoir.classe.nom}</span>
                      )}
                      {devoir.module && <span> • {devoir.module.titre}</span>}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{devoir.type_devoir}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {devoir.description && (
                  <p className="text-sm text-muted-foreground">{devoir.description}</p>
                )}
                
                {devoir.instructions && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium mb-1">Instructions:</p>
                    <p className="text-sm">{devoir.instructions}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Date limite: {format(new Date(devoir.date_limite), "d MMMM yyyy à HH:mm", { locale: fr })}
                    </span>
                  </div>
                  {devoir.points_max && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Points max:</span>
                      <span>{devoir.points_max}</span>
                    </div>
                  )}
                  {devoir.soumission?.note !== null && devoir.soumission?.note !== undefined && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">
                        Note: {devoir.soumission.note}/{devoir.points_max || 20}
                      </span>
                    </div>
                  )}
                </div>

                {/* Soumission info */}
                {devoir.soumission && (
                  <div className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Votre soumission</p>
                      <p className="text-xs text-muted-foreground">
                        Déposé le {format(new Date(devoir.soumission.date_soumission), "d MMM yyyy à HH:mm", { locale: fr })}
                      </p>
                    </div>
                    
                    {devoir.soumission.fichier_nom && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{devoir.soumission.fichier_nom}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadFile(devoir)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {devoir.soumission.commentaire_stagiaire && (
                      <p className="text-sm text-muted-foreground">
                        Commentaire: {devoir.soumission.commentaire_stagiaire}
                      </p>
                    )}

                    {devoir.soumission.commentaire_enseignant && (
                      <div className="mt-2 p-2 rounded bg-muted">
                        <p className="text-sm font-medium">Retour du formateur:</p>
                        <p className="text-sm">{devoir.soumission.commentaire_enseignant}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit button */}
                {canSubmitDevoir && (
                  <Button onClick={() => handleOpenSubmitDialog(devoir)} className="gap-2">
                    <Upload className="h-4 w-4" />
                    {devoir.soumission ? "Modifier ma soumission" : "Déposer mon devoir"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Déposer mon devoir</DialogTitle>
            <DialogDescription>
              {selectedDevoir?.titre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fichier</label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept={selectedDevoir?.formats_acceptes?.join(",") || undefined}
                  className="flex-1"
                />
              </div>
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{selectedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {selectedDevoir?.formats_acceptes && selectedDevoir.formats_acceptes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Formats acceptés: {selectedDevoir.formats_acceptes.join(", ")}
                </p>
              )}
              {selectedDevoir?.taille_max_mb && (
                <p className="text-xs text-muted-foreground">
                  Taille maximale: {selectedDevoir.taille_max_mb} Mo
                </p>
              )}
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Commentaire (optionnel)</label>
              <Textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Ajoutez un commentaire à votre soumission..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmitDevoir} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Déposer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}