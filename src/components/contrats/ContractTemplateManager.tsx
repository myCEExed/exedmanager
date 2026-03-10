import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, FileText, Trash2, Edit, X, Save } from "lucide-react";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ChampVariable {
  nom: string;
  placeholder: string;
  source: string; // champ de la table enseignants ou 'manuel'
}

interface ModeleContrat {
  id: string;
  nom: string;
  description: string | null;
  type_contrat: string;
  template_url: string | null;
  champs_variables: ChampVariable[];
  created_at: string;
}

const ENSEIGNANT_FIELDS = [
  { value: "prenom", label: "Prénom" },
  { value: "nom", label: "Nom" },
  { value: "email", label: "Email" },
  { value: "telephone", label: "Téléphone" },
  { value: "pays_residence", label: "Pays de résidence" },
  { value: "adresse_residence", label: "Adresse de résidence" },
  { value: "raison_sociale", label: "Raison sociale" },
  { value: "numero_identification", label: "N° d'identification (SIRET, etc.)" },
  { value: "mode_remuneration", label: "Mode de rémunération" },
];

export function ContractTemplateManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [modeles, setModeles] = useState<ModeleContrat[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModele, setEditingModele] = useState<ModeleContrat | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    nom: "",
    description: "",
    type_contrat: "vacation" as "vacation" | "prestation_service",
    template_url: "",
    champs_variables: [] as ChampVariable[],
  });

  const [newChamp, setNewChamp] = useState<ChampVariable>({
    nom: "",
    placeholder: "",
    source: "",
  });

  useEffect(() => {
    loadModeles();
  }, []);

  const loadModeles = async () => {
    try {
      const { data, error } = await supabase
        .from("modeles_contrat")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setModeles((data || []).map((m: any) => ({
        ...m,
        champs_variables: m.champs_variables || []
      })));
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (Word documents)
    const validTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Format non supporté",
        description: "Veuillez uploader un fichier Word (.doc ou .docx)",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_template.${fileExt}`;
      const filePath = `contract-templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setFormData({ ...formData, template_url: urlData.publicUrl });
      toast({
        title: "Succès",
        description: "Modèle uploadé avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur d'upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const addChampVariable = () => {
    if (!newChamp.nom || !newChamp.placeholder || !newChamp.source) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }
    
    setFormData({
      ...formData,
      champs_variables: [...formData.champs_variables, newChamp]
    });
    setNewChamp({ nom: "", placeholder: "", source: "" });
  };

  const removeChampVariable = (index: number) => {
    const updated = formData.champs_variables.filter((_, i) => i !== index);
    setFormData({ ...formData, champs_variables: updated });
  };

  const handleSubmit = async () => {
    if (!formData.nom || !formData.type_contrat) {
      toast({
        title: "Champs requis",
        description: "Le nom et le type de contrat sont obligatoires",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingModele) {
        const { error } = await supabase
          .from("modeles_contrat")
          .update({
            nom: formData.nom,
            description: formData.description || null,
            type_contrat: formData.type_contrat,
            template_url: formData.template_url || null,
            champs_variables: formData.champs_variables as any,
          })
          .eq("id", editingModele.id);

        if (error) throw error;
        toast({ title: "Modèle mis à jour avec succès" });
      } else {
        const { error } = await supabase
          .from("modeles_contrat")
          .insert({
            nom: formData.nom,
            description: formData.description || null,
            type_contrat: formData.type_contrat,
            template_url: formData.template_url || null,
            champs_variables: formData.champs_variables as any,
            created_by: user?.id,
          } as any);

        if (error) throw error;
        toast({ title: "Modèle créé avec succès" });
      }

      setDialogOpen(false);
      resetForm();
      loadModeles();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (modele: ModeleContrat) => {
    setEditingModele(modele);
    setFormData({
      nom: modele.nom,
      description: modele.description || "",
      type_contrat: modele.type_contrat as "vacation" | "prestation_service",
      template_url: modele.template_url || "",
      champs_variables: modele.champs_variables || [],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?")) return;

    try {
      const { error } = await supabase
        .from("modeles_contrat")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Modèle supprimé avec succès" });
      loadModeles();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nom: "",
      description: "",
      type_contrat: "vacation",
      template_url: "",
      champs_variables: [],
    });
    setEditingModele(null);
    setNewChamp({ nom: "", placeholder: "", source: "" });
  };

  const getTypeContratLabel = (type: string) => {
    switch (type) {
      case "vacation": return "Vacation";
      case "prestation_service": return "Prestation de service";
      default: return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Modèles de contrats
            </CardTitle>
            <CardDescription>
              Gérez les modèles de contrats pour la génération automatique
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau modèle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingModele ? "Modifier le modèle" : "Créer un nouveau modèle"}
                </DialogTitle>
                <DialogDescription>
                  Uploadez un modèle Word et définissez les champs variables à remplacer
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom du modèle *</Label>
                    <Input
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      placeholder="Ex: Contrat de vacation standard"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type de contrat *</Label>
                    <Select
                      value={formData.type_contrat}
                      onValueChange={(v) => setFormData({ ...formData, type_contrat: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vacation">Vacation</SelectItem>
                        <SelectItem value="prestation_service">Prestation de service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description du modèle..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fichier modèle (Word .docx)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".doc,.docx"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    {uploading && <span className="text-sm text-muted-foreground">Upload...</span>}
                  </div>
                  {formData.template_url && (
                    <p className="text-sm text-green-600">✓ Fichier uploadé</p>
                  )}
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div>
                    <Label className="text-base font-semibold">Champs variables</Label>
                    <p className="text-sm text-muted-foreground">
                      Définissez les placeholders dans votre document (ex: {"{{NOM}}"}) et leur source
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nom du champ</Label>
                      <Input
                        value={newChamp.nom}
                        onChange={(e) => setNewChamp({ ...newChamp, nom: e.target.value })}
                        placeholder="Ex: Nom intervenant"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Placeholder dans le doc</Label>
                      <Input
                        value={newChamp.placeholder}
                        onChange={(e) => setNewChamp({ ...newChamp, placeholder: e.target.value })}
                        placeholder="Ex: {{NOM}}"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Source (fiche enseignant)</Label>
                      <Select
                        value={newChamp.source}
                        onValueChange={(v) => setNewChamp({ ...newChamp, source: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ENSEIGNANT_FIELDS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                          <SelectItem value="manuel">Saisie manuelle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addChampVariable}>
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter ce champ
                  </Button>

                  {formData.champs_variables.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Champs configurés :</Label>
                      <div className="flex flex-wrap gap-2">
                        {formData.champs_variables.map((champ, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            <span>{champ.nom}: {champ.placeholder} → {champ.source}</span>
                            <button
                              type="button"
                              onClick={() => removeChampVariable(index)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSubmit}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingModele ? "Mettre à jour" : "Créer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : modeles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun modèle de contrat. Créez-en un pour commencer.
          </div>
        ) : (
          <ResponsiveTable>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Champs variables</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modeles.map((modele) => (
                <TableRow key={modele.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{modele.nom}</div>
                      {modele.description && (
                        <div className="text-sm text-muted-foreground">{modele.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={modele.type_contrat === "vacation" ? "default" : "secondary"}>
                      {getTypeContratLabel(modele.type_contrat)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {modele.champs_variables.slice(0, 3).map((c, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {c.placeholder}
                        </Badge>
                      ))}
                      {modele.champs_variables.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{modele.champs_variables.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(modele)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(modele.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ResponsiveTable>
        )}
      </CardContent>
    </Card>
  );
}
