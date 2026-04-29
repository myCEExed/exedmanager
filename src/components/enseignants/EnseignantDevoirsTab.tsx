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
import { ClipboardList, Plus, Calendar, Clock, Upload, Check, X, Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Devoir {
  id: string;
  titre: string;
  description: string | null;
  instructions: string | null;
  date_ouverture: string;
  date_limite: string;
  points_max: number;
  type_devoir: string;
  module_id: string | null;
  classe_id: string | null;
  modules?: { titre: string; code: string };
  classes?: { nom: string; sous_code: string };
}

interface Soumission {
  id: string;
  devoir_id: string;
  stagiaire_id: string;
  fichier_url: string | null;
  fichier_nom: string | null;
  commentaire_stagiaire: string | null;
  date_soumission: string;
  note: number | null;
  commentaire_enseignant: string | null;
  statut: string;
  stagiaires?: {
    nom: string;
    prenom: string;
    email: string;
  };
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

export function EnseignantDevoirsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [devoirs, setDevoirs] = useState<Devoir[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assignedModules, setAssignedModules] = useState<AssignedModule[]>([]);
  const [assignedClasseIds, setAssignedClasseIds] = useState<string[]>([]);
  const [selectedDevoir, setSelectedDevoir] = useState<string | null>(null);
  const [soumissions, setSoumissions] = useState<Soumission[]>([]);

  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    instructions: "",
    date_ouverture: "",
    date_limite: "",
    points_max: "100",
    coefficient: "1",
    type_devoir: "individuel",
    module_id: "none",
    classe_id: "",
  });

  useEffect(() => {
    if (user) {
      loadAssignedModules();
    }
  }, [user]);

  useEffect(() => {
    if (assignedClasseIds.length > 0) {
      loadDevoirs();
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

  const loadDevoirs = async () => {
    try {
      const moduleIds = assignedModules.map(m => m.id);
      
      const { data, error } = await supabase
        .from("devoirs")
        .select(`
          *,
          modules (titre, code),
          classes (nom, sous_code)
        `)
        .or(`classe_id.in.(${assignedClasseIds.join(",")}),module_id.in.(${moduleIds.join(",")})`)
        .order("date_limite", { ascending: true });

      if (error) throw error;
      setDevoirs(data || []);
    } catch (error: any) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les devoirs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSoumissions = async (devoirId: string) => {
    try {
      const { data, error } = await supabase
        .from("soumissions_devoirs")
        .select(`
          *,
          stagiaires (nom, prenom, email)
        `)
        .eq("devoir_id", devoirId);

      if (error) throw error;
      setSoumissions(data || []);
    } catch (error: any) {
      console.error("Erreur:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from("devoirs").insert({
        titre: formData.titre,
        description: formData.description || null,
        instructions: formData.instructions || null,
        date_ouverture: formData.date_ouverture,
        date_limite: formData.date_limite,
        points_max: parseFloat(formData.points_max),
        coefficient: parseFloat(formData.coefficient),
        type_devoir: formData.type_devoir,
        module_id: formData.module_id === "none" ? null : formData.module_id,
        classe_id: formData.classe_id || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Devoir créé avec succès",
      });

      setIsDialogOpen(false);
      setFormData({
        titre: "",
        description: "",
        instructions: "",
        date_ouverture: "",
        date_limite: "",
        points_max: "100",
        coefficient: "1",
        type_devoir: "individuel",
        module_id: "none",
        classe_id: "",
      });
      loadDevoirs();
    } catch (error: any) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCorrection = async (soumissionId: string, note: number, commentaire: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("soumissions_devoirs")
        .update({
          note,
          commentaire_enseignant: commentaire,
          statut: "corrige",
          corrige_par: user.id,
          date_correction: new Date().toISOString(),
        })
        .eq("id", soumissionId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Note enregistrée",
      });

      if (selectedDevoir) {
        fetchSoumissions(selectedDevoir);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatutBadge = (statut: string) => {
    const configs: Record<string, { variant: "secondary" | "default" | "destructive"; label: string }> = {
      soumis: { variant: "secondary", label: "Soumis" },
      en_correction: { variant: "default", label: "En correction" },
      corrige: { variant: "default", label: "Corrigé" },
      refuse: { variant: "destructive", label: "Refusé" },
    };
    const config = configs[statut] || configs.soumis;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isOverdue = (dateLimite: string) => {
    return new Date(dateLimite) < new Date();
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
              Créer un devoir
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau devoir</DialogTitle>
              <DialogDescription>
                Créez un travail à soumettre pour vos stagiaires
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
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <Label>Instructions détaillées</Label>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={4}
                  placeholder="Décrivez précisément ce qui est attendu..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date d'ouverture *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.date_ouverture}
                    onChange={(e) => setFormData({ ...formData, date_ouverture: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>Date limite *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.date_limite}
                    onChange={(e) => setFormData({ ...formData, date_limite: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Type de devoir *</Label>
                  <Select
                    value={formData.type_devoir}
                    onValueChange={(value) => setFormData({ ...formData, type_devoir: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individuel">Individuel</SelectItem>
                      <SelectItem value="groupe">En groupe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Points maximum</Label>
                  <Input
                    type="number"
                    value={formData.points_max}
                    onChange={(e) => setFormData({ ...formData, points_max: e.target.value })}
                    step="0.5"
                  />
                </div>

                <div>
                  <Label>Coefficient</Label>
                  <Input
                    type="number"
                    value={formData.coefficient}
                    onChange={(e) => setFormData({ ...formData, coefficient: e.target.value })}
                    step="0.5"
                    min="0.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Module</Label>
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
                  <Label>Classe *</Label>
                  <Select
                    value={formData.classe_id}
                    onValueChange={(value) => setFormData({ ...formData, classe_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueClasses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.sous_code} - {c.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {devoirs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun devoir pour vos classes</p>
            </CardContent>
          </Card>
        ) : (
          devoirs.map((devoir) => (
            <Card key={devoir.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {devoir.titre}
                      <Badge variant="outline">{devoir.type_devoir}</Badge>
                      {isOverdue(devoir.date_limite) && (
                        <Badge variant="destructive">Expiré</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {devoir.description}
                    </CardDescription>
                    <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                      {devoir.classes && (
                        <span>Classe: {devoir.classes.sous_code}</span>
                      )}
                      {devoir.modules && (
                        <span>Module: {devoir.modules.code}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(devoir.date_limite), "dd MMM yyyy HH:mm", { locale: fr })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {devoir.points_max} points
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDevoir(devoir.id);
                      fetchSoumissions(devoir.id);
                    }}
                  >
                    Voir les soumissions
                  </Button>
                </div>
              </CardHeader>
              {selectedDevoir === devoir.id && soumissions.length > 0 && (
                <CardContent>
                  <div className="space-y-3">
                    <h4 className="font-semibold">Soumissions ({soumissions.length})</h4>
                    {soumissions.map((soumission) => (
                      <div
                        key={soumission.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">
                            {soumission.stagiaires?.prenom} {soumission.stagiaires?.nom}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Soumis le {format(new Date(soumission.date_soumission), "dd MMM yyyy HH:mm", { locale: fr })}
                          </p>
                          {soumission.fichier_nom && soumission.fichier_url && (
                            <div className="flex items-center gap-2 mt-1">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{soumission.fichier_nom}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={async () => {
                                  try {
                                    const { data, error } = await supabase.storage
                                      .from('soumissions-devoirs')
                                      .download(soumission.fichier_url!.replace(/.*soumissions-devoirs\//, ''));
                                    
                                    if (error) throw error;
                                    
                                    const url = URL.createObjectURL(data);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = soumission.fichier_nom || 'fichier';
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  } catch (error: any) {
                                    toast({
                                      title: "Erreur",
                                      description: "Impossible de télécharger le fichier",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Télécharger
                              </Button>
                            </div>
                          )}
                          {soumission.commentaire_stagiaire && (
                            <p className="text-sm text-muted-foreground italic mt-1">
                              "{soumission.commentaire_stagiaire}"
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatutBadge(soumission.statut)}
                          {soumission.note !== null && (
                            <Badge variant="secondary">{soumission.note}/{devoir.points_max}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
