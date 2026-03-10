import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UtensilsCrossed, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface OffreRestauration {
  id: string;
  nature_restauration: string;
  formule_restauration: string;
  prix_unitaire: number;
  devise: "EUR" | "MAD";
}

interface EtatRestauration {
  id: string;
  module_id: string;
  offre_restauration_id: string | null;
  nombre_total_unites: number | null;
  nombre_invites: number | null;
  notes: string | null;
  offres_restauration?: OffreRestauration;
}

interface ModuleRestaurationSectionProps {
  moduleId: string;
  onUpdate?: () => void;
}

export const ModuleRestaurationSection = ({ moduleId, onUpdate }: ModuleRestaurationSectionProps) => {
  const { user } = useAuth();
  const [offres, setOffres] = useState<OffreRestauration[]>([]);
  const [etat, setEtat] = useState<EtatRestauration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    offre_restauration_id: "",
    nombre_total_unites: "",
    nombre_invites: "",
    notes: ""
  });

  useEffect(() => {
    loadData();
  }, [moduleId]);

  const loadData = async () => {
    try {
      const [offresResult, etatResult] = await Promise.all([
        supabase.from("offres_restauration").select("*").order("nature_restauration"),
        supabase
          .from("etats_restauration")
          .select("*, offres_restauration(*)")
          .eq("module_id", moduleId)
          .maybeSingle()
      ]);

      if (offresResult.data) setOffres(offresResult.data);
      if (etatResult.data) {
        setEtat(etatResult.data);
        setFormData({
          offre_restauration_id: etatResult.data.offre_restauration_id || "",
          nombre_total_unites: etatResult.data.nombre_total_unites?.toString() || "",
          nombre_invites: etatResult.data.nombre_invites?.toString() || "",
          notes: etatResult.data.notes || ""
        });
        setShowForm(true);
      }
    } catch (error) {
      console.error("Erreur chargement restauration:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.offre_restauration_id || !formData.nombre_total_unites) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    setSaving(true);
    try {
      const data = {
        module_id: moduleId,
        offre_restauration_id: formData.offre_restauration_id,
        nombre_total_unites: parseInt(formData.nombre_total_unites),
        nombre_invites: formData.nombre_invites ? parseInt(formData.nombre_invites) : 0,
        notes: formData.notes || null,
        created_by: user?.id
      };

      if (etat) {
        const { error } = await supabase
          .from("etats_restauration")
          .update(data)
          .eq("id", etat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("etats_restauration")
          .insert(data);
        if (error) throw error;
      }

      toast.success("Restauration enregistrée");
      loadData();
      onUpdate?.();
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!etat) return;
    if (!confirm("Supprimer les informations de restauration pour ce module ?")) return;

    try {
      const { error } = await supabase
        .from("etats_restauration")
        .delete()
        .eq("id", etat.id);
      if (error) throw error;

      setEtat(null);
      setFormData({
        offre_restauration_id: "",
        nombre_total_unites: "",
        nombre_invites: "",
        notes: ""
      });
      setShowForm(false);
      toast.success("Restauration supprimée");
      onUpdate?.();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const selectedOffre = offres.find(o => o.id === formData.offre_restauration_id);
  const coutTotal = selectedOffre && formData.nombre_total_unites
    ? selectedOffre.prix_unitaire * parseInt(formData.nombre_total_unites)
    : 0;
  const deviseSymbol = selectedOffre?.devise === "MAD" ? "MAD" : "€";

  if (loading) {
    return <div className="text-sm text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <UtensilsCrossed className="h-4 w-4" />
          Restauration
        </div>
        {!showForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        )}
      </div>

      {showForm && (
        <div className="space-y-4 p-4 rounded-lg border bg-muted/20">
          <div className="space-y-2">
            <Label>Offre de restauration *</Label>
            <Select
              value={formData.offre_restauration_id}
              onValueChange={(value) => setFormData({ ...formData, offre_restauration_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir une offre..." />
              </SelectTrigger>
              <SelectContent>
                {offres.map((offre) => (
                  <SelectItem key={offre.id} value={offre.id}>
                    {offre.nature_restauration} - {offre.formule_restauration} ({offre.prix_unitaire.toFixed(2)} {offre.devise === "MAD" ? "MAD" : "€"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre d'unités *</Label>
              <Input
                type="number"
                min="1"
                value={formData.nombre_total_unites}
                onChange={(e) => setFormData({ ...formData, nombre_total_unites: e.target.value })}
                placeholder="Ex: 25"
              />
            </div>
            <div className="space-y-2">
              <Label>Dont invités</Label>
              <Input
                type="number"
                min="0"
                value={formData.nombre_invites}
                onChange={(e) => setFormData({ ...formData, nombre_invites: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Allergies, préférences..."
              rows={2}
            />
          </div>

          {coutTotal > 0 && (
            <div className="p-3 rounded-lg bg-primary/10 text-sm">
              <span className="font-medium">Coût estimé :</span>{" "}
              <span className="text-primary font-bold">{coutTotal.toFixed(2)} {deviseSymbol}</span>
              <span className="text-muted-foreground ml-2">
                ({selectedOffre?.prix_unitaire.toFixed(2)} {deviseSymbol} × {formData.nombre_total_unites})
              </span>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            {etat && (
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                Supprimer
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (!etat) {
                  setShowForm(false);
                  setFormData({
                    offre_restauration_id: "",
                    nombre_total_unites: "",
                    nombre_invites: "",
                    notes: ""
                  });
                }
              }}
              disabled={!!etat}
            >
              Annuler
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : etat ? "Modifier" : "Enregistrer"}
            </Button>
          </div>
        </div>
      )}

      {etat && !showForm && (
        <div className="p-3 rounded-lg border bg-muted/20">
          <div className="text-sm">
            <p className="font-medium">{etat.offres_restauration?.nature_restauration} - {etat.offres_restauration?.formule_restauration}</p>
            <p className="text-muted-foreground">
              {etat.nombre_total_unites} unités ({etat.nombre_invites || 0} invités)
            </p>
            {etat.notes && <p className="text-muted-foreground mt-1">{etat.notes}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
