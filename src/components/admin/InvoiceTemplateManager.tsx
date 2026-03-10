import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileText, Star } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { InvoiceTemplatePreview } from "./InvoiceTemplatePreview";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ModeleFacture {
  id: string;
  nom: string;
  description: string | null;
  logo_url: string | null;
  en_tete_html: string | null;
  pied_page_html: string | null;
  couleur_principale: string;
  afficher_logo: boolean;
  afficher_conditions: boolean;
  conditions_paiement: string | null;
  mentions_legales: string | null;
  prefixe_numero: string;
  prochain_numero: number;
  format_numero: string;
  is_default: boolean;
  created_at: string;
  logo_position?: string;
  logo_size?: string;
  header_alignment?: string;
  footer_alignment?: string;
}

export function InvoiceTemplateManager() {
  const [modeles, setModeles] = useState<ModeleFacture[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModele, setEditingModele] = useState<ModeleFacture | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nom: "",
    description: "",
    logo_url: "",
    en_tete_html: "",
    pied_page_html: "",
    couleur_principale: "#3b82f6",
    afficher_logo: true,
    afficher_conditions: true,
    conditions_paiement: "",
    mentions_legales: "",
    prefixe_numero: "FAC",
    prochain_numero: 1,
    format_numero: "{prefixe}-{annee}{mois}-{numero}",
    is_default: false,
    logo_position: "left",
    logo_size: "medium",
    header_alignment: "left",
    footer_alignment: "center",
  });

  useEffect(() => {
    fetchModeles();
  }, []);

  const fetchModeles = async () => {
    try {
      const { data, error } = await supabase
        .from("modeles_facture")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setModeles(data || []);
    } catch (error: any) {
      console.error("Error fetching modeles:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les modèles de facture",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nom: "",
      description: "",
      logo_url: "",
      en_tete_html: "",
      pied_page_html: "",
      couleur_principale: "#3b82f6",
      afficher_logo: true,
      afficher_conditions: true,
      conditions_paiement: "",
      mentions_legales: "",
      prefixe_numero: "FAC",
      prochain_numero: 1,
      format_numero: "{prefixe}-{annee}{mois}-{numero}",
      is_default: false,
      logo_position: "left",
      logo_size: "medium",
      header_alignment: "left",
      footer_alignment: "center",
    });
    setEditingModele(null);
  };

  const openEditDialog = (modele: ModeleFacture) => {
    setEditingModele(modele);
    setFormData({
      nom: modele.nom,
      description: modele.description || "",
      logo_url: modele.logo_url || "",
      en_tete_html: modele.en_tete_html || "",
      pied_page_html: modele.pied_page_html || "",
      couleur_principale: modele.couleur_principale,
      afficher_logo: modele.afficher_logo,
      afficher_conditions: modele.afficher_conditions,
      conditions_paiement: modele.conditions_paiement || "",
      mentions_legales: modele.mentions_legales || "",
      prefixe_numero: modele.prefixe_numero,
      prochain_numero: modele.prochain_numero,
      format_numero: modele.format_numero,
      is_default: modele.is_default,
      logo_position: modele.logo_position || "left",
      logo_size: modele.logo_size || "medium",
      header_alignment: modele.header_alignment || "left",
      footer_alignment: modele.footer_alignment || "center",
    });
    setDialogOpen(true);
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Si ce modèle devient par défaut, retirer le défaut des autres
      if (formData.is_default) {
        await supabase
          .from("modeles_facture")
          .update({ is_default: false })
          .neq("id", editingModele?.id || "");
      }

      const dataToSave = {
        nom: formData.nom,
        description: formData.description || null,
        logo_url: formData.logo_url || null,
        en_tete_html: formData.en_tete_html || null,
        pied_page_html: formData.pied_page_html || null,
        couleur_principale: formData.couleur_principale,
        afficher_logo: formData.afficher_logo,
        afficher_conditions: formData.afficher_conditions,
        conditions_paiement: formData.conditions_paiement || null,
        mentions_legales: formData.mentions_legales || null,
        prefixe_numero: formData.prefixe_numero,
        prochain_numero: formData.prochain_numero,
        format_numero: formData.format_numero,
        is_default: formData.is_default,
      };

      if (editingModele) {
        const { error } = await supabase
          .from("modeles_facture")
          .update(dataToSave)
          .eq("id", editingModele.id);

        if (error) throw error;
        toast({
          title: "Succès",
          description: "Modèle de facture mis à jour",
        });
      } else {
        const { error } = await supabase
          .from("modeles_facture")
          .insert([{ ...dataToSave, created_by: user.id }]);

        if (error) throw error;
        toast({
          title: "Succès",
          description: "Modèle de facture créé",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchModeles();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("modeles_facture")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Modèle supprimé",
      });
      fetchModeles();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const setAsDefault = async (id: string) => {
    try {
      // Retirer le défaut de tous les modèles
      await supabase
        .from("modeles_facture")
        .update({ is_default: false })
        .neq("id", id);

      // Définir ce modèle comme défaut
      const { error } = await supabase
        .from("modeles_facture")
        .update({ is_default: true })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Modèle défini par défaut",
      });
      fetchModeles();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Modèles de Facture
            </CardTitle>
            <CardDescription>
              Gérez les modèles et la mise en forme des factures
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Modèle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[95vh]">
              <DialogHeader>
                <DialogTitle>
                  {editingModele ? "Modifier le modèle" : "Créer un modèle de facture"}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(95vh-100px)]">
                <form onSubmit={handleSubmit} className="space-y-6 pr-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left column - Form fields */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nom du modèle *</Label>
                          <Input
                            value={formData.nom}
                            onChange={(e) => handleFormChange("nom", e.target.value)}
                            placeholder="Ex: Modèle Standard"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Couleur principale</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={formData.couleur_principale}
                              onChange={(e) => handleFormChange("couleur_principale", e.target.value)}
                              className="w-14 h-10 p-1"
                            />
                            <Input
                              value={formData.couleur_principale}
                              onChange={(e) => handleFormChange("couleur_principale", e.target.value)}
                              placeholder="#3b82f6"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 space-y-4">
                        <h4 className="font-medium">Numérotation</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Préfixe</Label>
                            <Input
                              value={formData.prefixe_numero}
                              onChange={(e) => handleFormChange("prefixe_numero", e.target.value)}
                              placeholder="FAC"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Prochain N°</Label>
                            <Input
                              type="number"
                              min="1"
                              value={formData.prochain_numero}
                              onChange={(e) => handleFormChange("prochain_numero", parseInt(e.target.value) || 1)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Format</Label>
                            <Input
                              value={formData.format_numero}
                              onChange={(e) => handleFormChange("format_numero", e.target.value)}
                              placeholder="{prefixe}-{annee}{mois}-{numero}"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Variables: {"{prefixe}"}, {"{annee}"}, {"{mois}"}, {"{numero}"}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 pt-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="afficher_logo">Afficher le logo</Label>
                          <Switch
                            id="afficher_logo"
                            checked={formData.afficher_logo}
                            onCheckedChange={(checked) => handleFormChange("afficher_logo", checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="afficher_conditions">Afficher les conditions</Label>
                          <Switch
                            id="afficher_conditions"
                            checked={formData.afficher_conditions}
                            onCheckedChange={(checked) => handleFormChange("afficher_conditions", checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="is_default">Modèle par défaut</Label>
                          <Switch
                            id="is_default"
                            checked={formData.is_default}
                            onCheckedChange={(checked) => handleFormChange("is_default", checked)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right column - Preview */}
                    <div>
                      <InvoiceTemplatePreview
                        formData={formData}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}>
                      Annuler
                    </Button>
                    <Button type="submit">
                      {editingModele ? "Mettre à jour" : "Créer le modèle"}
                    </Button>
                  </div>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {modeles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun modèle de facture</p>
            <p className="text-sm">Créez votre premier modèle pour personnaliser vos factures</p>
          </div>
        ) : (
          <div className="space-y-3">
            {modeles.map((modele) => (
              <div
                key={modele.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {modele.logo_url ? (
                    <img
                      src={modele.logo_url}
                      alt="Logo"
                      className="h-10 w-10 object-contain rounded border"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded flex items-center justify-center"
                      style={{ backgroundColor: modele.couleur_principale }}
                    >
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {modele.nom}
                      {modele.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Par défaut
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Préfixe: {modele.prefixe_numero} • Prochain: {modele.prochain_numero}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!modele.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAsDefault(modele.id)}
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(modele)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Le modèle "{modele.nom}" sera définitivement supprimé.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(modele.id)}>
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}