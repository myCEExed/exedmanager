import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, User, Users, Trash2, Plus } from "lucide-react";
import { ModulePlanning } from "@/hooks/usePlanningConflicts";
import { cn } from "@/lib/utils";
import { ModuleRestaurationSection } from "./ModuleRestaurationSection";

interface ModuleEditDialogProps {
  module: ModulePlanning | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

interface Enseignant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  photo_url: string | null;
}

export const ModuleEditDialog = ({ module, open, onOpenChange, onSave }: ModuleEditDialogProps) => {
  const [formData, setFormData] = useState({
    date_debut: "",
    date_fin: "",
    duree_heures: "",
    salle: "",
    type_lieu: "sur_site" as "sur_site" | "hors_site",
    lieu_hors_site: "",
    commentaire_lieu: ""
  });
  const [saving, setSaving] = useState(false);
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [selectedEnseignants, setSelectedEnseignants] = useState<string[]>([]);
  const [showEnseignantSelector, setShowEnseignantSelector] = useState(false);

  useEffect(() => {
    if (module) {
      setFormData({
        date_debut: module.date_debut 
          ? format(new Date(module.date_debut), "yyyy-MM-dd'T'HH:mm")
          : "",
        date_fin: module.date_fin 
          ? format(new Date(module.date_fin), "yyyy-MM-dd'T'HH:mm")
          : "",
        duree_heures: module.duree_heures?.toString() || "",
        salle: module.salle || "",
        type_lieu: (module.type_lieu as "sur_site" | "hors_site") || "sur_site",
        lieu_hors_site: module.lieu_hors_site || "",
        commentaire_lieu: ""
      });
      setSelectedEnseignants(
        module.affectations
          .filter((a) => a.enseignants)
          .map((a) => a.enseignant_id)
      );
    }
  }, [module]);

  useEffect(() => {
    loadEnseignants();
  }, []);

  const loadEnseignants = async () => {
    const { data, error } = await supabase
      .from("enseignants")
      .select("id, nom, prenom, email, photo_url")
      .order("nom");
    
    if (!error && data) {
      setEnseignants(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!module) return;

    setSaving(true);
    try {
      // Update module
      const { error: moduleError } = await supabase
        .from("modules")
        .update({
          date_debut: formData.date_debut ? new Date(formData.date_debut).toISOString() : null,
          date_fin: formData.date_fin ? new Date(formData.date_fin).toISOString() : null,
          duree_heures: formData.duree_heures ? parseFloat(formData.duree_heures) : null,
          salle: formData.type_lieu === "sur_site" ? formData.salle : null,
          type_lieu: formData.type_lieu,
          lieu_hors_site: formData.type_lieu === "hors_site" ? formData.lieu_hors_site : null,
          commentaire_lieu: formData.commentaire_lieu || null
        })
        .eq("id", module.id);

      if (moduleError) throw moduleError;

      // Update affectations
      // First, remove existing affectations
      await supabase
        .from("affectations")
        .delete()
        .eq("module_id", module.id);

      // Then add new affectations
      if (selectedEnseignants.length > 0) {
        const affectationsToInsert = selectedEnseignants.map((enseignantId) => ({
          module_id: module.id,
          enseignant_id: enseignantId,
          confirmee: false
        }));

        const { error: affError } = await supabase
          .from("affectations")
          .insert(affectationsToInsert);

        if (affError) throw affError;
      }

      toast.success("Module mis à jour avec succès");
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la mise à jour du module");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnseignant = (enseignantId: string) => {
    setSelectedEnseignants((prev) =>
      prev.includes(enseignantId)
        ? prev.filter((id) => id !== enseignantId)
        : [...prev, enseignantId]
    );
  };

  const getInitials = (nom: string, prenom: string) => {
    return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
  };

  if (!module) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Modifier la planification</DialogTitle>
          <DialogDescription>
            {module.titre} - {module.classe?.nom}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-150px)]">
          <form onSubmit={handleSubmit} className="space-y-6 pr-4">
            {/* Programme Info */}
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{module.code}</Badge>
                <span className="text-muted-foreground">
                  {module.classe?.programmes?.titre}
                </span>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Dates et horaires
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date_debut">Date et heure de début</Label>
                  <Input
                    id="date_debut"
                    type="datetime-local"
                    value={formData.date_debut}
                    onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_fin">Date et heure de fin</Label>
                  <Input
                    id="date_fin"
                    type="datetime-local"
                    value={formData.date_fin}
                    onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duree_heures">Durée (heures)</Label>
                <Input
                  id="duree_heures"
                  type="number"
                  step="0.5"
                  value={formData.duree_heures}
                  onChange={(e) => setFormData({ ...formData, duree_heures: e.target.value })}
                  className="w-32"
                />
              </div>
            </div>

            {/* Lieu */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                Lieu
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type_lieu"
                    value="sur_site"
                    checked={formData.type_lieu === "sur_site"}
                    onChange={() => setFormData({ ...formData, type_lieu: "sur_site" })}
                    className="accent-primary"
                  />
                  <span className="text-sm">Sur site</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type_lieu"
                    value="hors_site"
                    checked={formData.type_lieu === "hors_site"}
                    onChange={() => setFormData({ ...formData, type_lieu: "hors_site" })}
                    className="accent-primary"
                  />
                  <span className="text-sm">Hors site</span>
                </label>
              </div>
              {formData.type_lieu === "sur_site" ? (
                <div className="space-y-2">
                  <Label htmlFor="salle">Salle</Label>
                  <Input
                    id="salle"
                    value={formData.salle}
                    onChange={(e) => setFormData({ ...formData, salle: e.target.value })}
                    placeholder="Ex: Salle 101"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="lieu_hors_site">Adresse du lieu</Label>
                  <Textarea
                    id="lieu_hors_site"
                    value={formData.lieu_hors_site}
                    onChange={(e) => setFormData({ ...formData, lieu_hors_site: e.target.value })}
                    placeholder="Adresse complète du lieu"
                    rows={2}
                  />
                </div>
              )}
            </div>

            {/* Enseignants */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  Intervenants ({selectedEnseignants.length})
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEnseignantSelector(!showEnseignantSelector)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {showEnseignantSelector ? "Fermer" : "Ajouter"}
                </Button>
              </div>

              {/* Selected Enseignants */}
              {selectedEnseignants.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedEnseignants.map((id) => {
                    const ens = enseignants.find((e) => e.id === id);
                    if (!ens) return null;
                    return (
                      <Badge key={id} variant="secondary" className="gap-1 pr-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={ens.photo_url || ""} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(ens.nom, ens.prenom)}
                          </AvatarFallback>
                        </Avatar>
                        {ens.prenom} {ens.nom}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 ml-1"
                          onClick={() => toggleEnseignant(id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Enseignant Selector */}
              {showEnseignantSelector && (
                <div className="rounded-lg border p-3 max-h-[200px] overflow-y-auto">
                  <div className="space-y-2">
                    {enseignants.map((ens) => (
                      <label
                        key={ens.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                          selectedEnseignants.includes(ens.id)
                            ? "bg-primary/10"
                            : "hover:bg-muted"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEnseignants.includes(ens.id)}
                          onChange={() => toggleEnseignant(ens.id)}
                          className="accent-primary"
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={ens.photo_url || ""} />
                          <AvatarFallback>
                            {getInitials(ens.nom, ens.prenom)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {ens.prenom} {ens.nom}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {ens.email}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Restauration */}
            <ModuleRestaurationSection moduleId={module.id} onUpdate={onSave} />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
