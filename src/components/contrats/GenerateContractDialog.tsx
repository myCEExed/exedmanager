import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Calculator, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ChampVariable {
  nom: string;
  placeholder: string;
  source: string;
}

interface ModeleContrat {
  id: string;
  nom: string;
  description: string | null;
  type_contrat: string;
  template_url: string | null;
  champs_variables: ChampVariable[];
}

interface Enseignant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  pays_residence: string | null;
  adresse_residence: string | null;
  raison_sociale: string | null;
  numero_identification: string | null;
  mode_remuneration: string | null;
}

interface Programme {
  id: string;
  titre: string;
  code: string;
}

interface ModuleInfo {
  id: string;
  code: string;
  titre: string;
  duree_heures: number | null;
  date_debut: string | null;
  date_fin: string | null;
  classe_nom: string;
  programme_titre: string;
  programme_id: string;
}

interface GenerateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enseignant: Enseignant;
  onSuccess: () => void;
}

export function GenerateContractDialog({
  open,
  onOpenChange,
  enseignant,
  onSuccess,
}: GenerateContractDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currency } = useCurrency();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modeles, setModeles] = useState<ModeleContrat[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    modele_contrat_id: "",
    programme_id: "",
    date_debut: format(new Date(), "yyyy-MM-dd"),
    date_fin: format(new Date(), "yyyy-MM-dd"),
    objet: "",
    unite: "heure" as "heure" | "jour",
    quantite: 0,
    prix_unitaire: 0,
    manualFields: {} as Record<string, string>,
  });

  useEffect(() => {
    if (open) {
      loadData();
      setStep(1);
    }
  }, [open, enseignant]);

  const loadData = async () => {
    try {
      // Load templates matching enseignant's remuneration mode
      const typeContrat = enseignant.mode_remuneration === "prestation_service" 
        ? "prestation_service" 
        : "vacation";

      const { data: modelesData, error: modelesError } = await supabase
        .from("modeles_contrat")
        .select("*")
        .eq("type_contrat", typeContrat);

      if (modelesError) throw modelesError;
      setModeles((modelesData || []).map((m: any) => ({
        ...m,
        champs_variables: m.champs_variables || []
      })));

      // Load modules assigned to this teacher
      const { data: affectations, error: affError } = await supabase
        .from("affectations")
        .select(`
          modules(
            id,
            code,
            titre,
            duree_heures,
            date_debut,
            date_fin,
            classes(
              id,
              nom,
              programmes(id, titre, code)
            )
          )
        `)
        .eq("enseignant_id", enseignant.id);

      if (affError) throw affError;

      const modulesInfo: ModuleInfo[] = [];
      const programmesMap = new Map<string, Programme>();

      affectations?.forEach((aff: any) => {
        if (aff.modules?.classes?.programmes) {
          const mod = aff.modules;
          const classe = mod.classes;
          const prog = classe.programmes;

          modulesInfo.push({
            id: mod.id,
            code: mod.code,
            titre: mod.titre,
            duree_heures: mod.duree_heures,
            date_debut: mod.date_debut,
            date_fin: mod.date_fin,
            classe_nom: classe.nom,
            programme_titre: prog.titre,
            programme_id: prog.id,
          });

          if (!programmesMap.has(prog.id)) {
            programmesMap.set(prog.id, {
              id: prog.id,
              titre: prog.titre,
              code: prog.code,
            });
          }
        }
      });

      setModules(modulesInfo);
      setProgrammes(Array.from(programmesMap.values()));
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredModules = formData.programme_id
    ? modules.filter((m) => m.programme_id === formData.programme_id)
    : modules;

  const selectedModules = modules.filter((m) => selectedModuleIds.includes(m.id));

  const calculateTotals = () => {
    const totalHeures = selectedModules.reduce((sum, m) => sum + (m.duree_heures || 0), 0);
    return {
      totalHeures,
      montantTotal: formData.quantite * formData.prix_unitaire,
    };
  };

  const generateObjet = () => {
    if (selectedModules.length === 0) return "";
    
    const moduleNames = selectedModules.map((m) => m.titre).join(", ");
    const programme = programmes.find((p) => p.id === formData.programme_id);
    
    return `Animation des modules : ${moduleNames}${programme ? ` - Programme ${programme.titre}` : ""}`;
  };

  const handleProgrammeChange = (programmeId: string) => {
    setFormData({ ...formData, programme_id: programmeId });
    setSelectedModuleIds([]);
  };

  const toggleModuleSelection = (moduleId: string) => {
    setSelectedModuleIds((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const selectAllModules = () => {
    if (selectedModuleIds.length === filteredModules.length) {
      setSelectedModuleIds([]);
    } else {
      setSelectedModuleIds(filteredModules.map((m) => m.id));
    }
  };

  const handleNext = () => {
    if (step === 1 && !formData.modele_contrat_id) {
      toast({
        title: "Sélection requise",
        description: "Veuillez sélectionner un modèle de contrat",
        variant: "destructive",
      });
      return;
    }
    if (step === 2 && selectedModuleIds.length === 0) {
      toast({
        title: "Sélection requise",
        description: "Veuillez sélectionner au moins un module",
        variant: "destructive",
      });
      return;
    }
    
    if (step === 2) {
      // Auto-generate objet
      setFormData((prev) => ({ ...prev, objet: generateObjet() }));
      
      // Calculate dates from selected modules
      const dates = selectedModules
        .filter((m) => m.date_debut && m.date_fin)
        .flatMap((m) => [new Date(m.date_debut!), new Date(m.date_fin!)]);
      
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
        setFormData((prev) => ({
          ...prev,
          date_debut: format(minDate, "yyyy-MM-dd"),
          date_fin: format(maxDate, "yyyy-MM-dd"),
        }));
      }
    }
    
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { montantTotal } = calculateTotals();

      // Create the contract
      const { data: contrat, error: contratError } = await supabase
        .from("contrats_intervention")
        .insert({
          enseignant_id: enseignant.id,
          modele_contrat_id: formData.modele_contrat_id,
          programme_id: formData.programme_id || null,
          date_debut: formData.date_debut,
          date_fin: formData.date_fin,
          objet: formData.objet,
          unite: formData.unite,
          quantite: formData.quantite,
          prix_unitaire: formData.prix_unitaire,
          montant: montantTotal,
          devise: currency,
          statut_validation: "en_attente",
          created_by: user?.id,
        })
        .select()
        .single();

      if (contratError) throw contratError;

      // Create contract lines for each programme/module grouping
      if (contrat && selectedModuleIds.length > 0) {
        const { error: lignesError } = await supabase
          .from("contrats_lignes")
          .insert({
            contrat_id: contrat.id,
            programme_id: formData.programme_id || null,
            module_ids: selectedModuleIds,
            designation: formData.objet,
            unite: formData.unite,
            quantite: formData.quantite,
            prix_unitaire: formData.prix_unitaire,
            montant_total: montantTotal,
          });

        if (lignesError) throw lignesError;
      }

      toast({
        title: "Contrat créé avec succès",
        description: "Le contrat a été généré et enregistré",
      });

      onOpenChange(false);
      onSuccess();
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

  const selectedModele = modeles.find((m) => m.id === formData.modele_contrat_id);
  const manualFields = selectedModele?.champs_variables.filter((c) => c.source === "manuel") || [];
  const { montantTotal } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Générer un contrat - {enseignant.prenom} {enseignant.nom}
          </DialogTitle>
          <DialogDescription>
            Étape {step} sur 3 - {
              step === 1 ? "Choix du modèle" :
              step === 2 ? "Sélection des modules" :
              "Détails de la prestation"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Step 1: Select template */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Mode de rémunération :</strong>{" "}
                  <Badge variant="outline">
                    {enseignant.mode_remuneration === "prestation_service" 
                      ? "Prestation de service" 
                      : "Vacation"}
                  </Badge>
                </p>
              </div>

              {modeles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Aucun modèle de contrat disponible pour ce type de rémunération.</p>
                  <p className="text-sm mt-2">Veuillez d'abord créer un modèle dans l'onglet "Modèles".</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Sélectionner un modèle de contrat</Label>
                  <div className="grid gap-2">
                    {modeles.map((modele) => (
                      <Card
                        key={modele.id}
                        className={`cursor-pointer transition-colors ${
                          formData.modele_contrat_id === modele.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-muted-foreground/50"
                        }`}
                        onClick={() => setFormData({ ...formData, modele_contrat_id: modele.id })}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{modele.nom}</h4>
                              {modele.description && (
                                <p className="text-sm text-muted-foreground">{modele.description}</p>
                              )}
                            </div>
                            {modele.template_url && (
                              <Badge variant="secondary" className="text-xs">
                                Template Word
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select programme and modules */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Programme (optionnel)</Label>
                <Select
                  value={formData.programme_id || "__none__"}
                  onValueChange={(v) => handleProgrammeChange(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les programmes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Tous les programmes</SelectItem>
                    {programmes.map((prog) => (
                      <SelectItem key={prog.id} value={prog.id}>
                        {prog.code} - {prog.titre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Modules à inclure dans le contrat</Label>
                  <Button variant="outline" size="sm" onClick={selectAllModules}>
                    {selectedModuleIds.length === filteredModules.length 
                      ? "Désélectionner tout" 
                      : "Sélectionner tout"}
                  </Button>
                </div>
                
                {filteredModules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun module affecté à cet enseignant
                    {formData.programme_id && " pour ce programme"}.
                  </div>
                ) : (
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {filteredModules.map((module) => (
                      <div
                        key={module.id}
                        className={`flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 ${
                          selectedModuleIds.includes(module.id) ? "bg-primary/5" : ""
                        }`}
                        onClick={() => toggleModuleSelection(module.id)}
                      >
                        <Checkbox
                          checked={selectedModuleIds.includes(module.id)}
                          onCheckedChange={() => toggleModuleSelection(module.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{module.titre}</div>
                          <div className="text-sm text-muted-foreground">
                            {module.code} • {module.classe_nom}
                            {module.duree_heures && ` • ${module.duree_heures}h`}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {module.programme_titre}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedModuleIds.length > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>{selectedModuleIds.length}</strong> module(s) sélectionné(s)
                    {selectedModules.some((m) => m.duree_heures) && (
                      <> • Total: <strong>{calculateTotals().totalHeures}h</strong></>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Contract details */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Input
                    type="date"
                    value={formData.date_debut}
                    onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de fin</Label>
                  <Input
                    type="date"
                    value={formData.date_fin}
                    onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Objet de la prestation</Label>
                <Textarea
                  value={formData.objet}
                  onChange={(e) => setFormData({ ...formData, objet: e.target.value })}
                  placeholder="Description de l'objet du contrat..."
                  rows={3}
                />
              </div>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Rémunération
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Unité</Label>
                      <Select
                        value={formData.unite}
                        onValueChange={(v) => setFormData({ ...formData, unite: v as "heure" | "jour" })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="heure">Heure</SelectItem>
                          <SelectItem value="jour">Jour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantité</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.quantite}
                        onChange={(e) => setFormData({ ...formData, quantite: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Prix unitaire ({currency})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.prix_unitaire}
                        onChange={(e) => setFormData({ ...formData, prix_unitaire: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-primary/10 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Montant total</p>
                    <p className="text-2xl font-bold">
                      {montantTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {currency}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Manual fields from template */}
              {manualFields.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Champs à renseigner manuellement</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {manualFields.map((field) => (
                      <div key={field.placeholder} className="space-y-2">
                        <Label>{field.nom} ({field.placeholder})</Label>
                        <Input
                          value={formData.manualFields[field.placeholder] || ""}
                          onChange={(e) => setFormData({
                            ...formData,
                            manualFields: {
                              ...formData.manualFields,
                              [field.placeholder]: e.target.value,
                            },
                          })}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              <Card className="bg-muted">
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Récapitulatif
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>Intervenant :</strong> {enseignant.prenom} {enseignant.nom}</p>
                  <p><strong>Modules :</strong> {selectedModules.map((m) => m.titre).join(", ")}</p>
                  <p><strong>Période :</strong> Du {format(new Date(formData.date_debut), "d MMMM yyyy", { locale: fr })} au {format(new Date(formData.date_fin), "d MMMM yyyy", { locale: fr })}</p>
                  <p><strong>Rémunération :</strong> {formData.quantite} {formData.unite}(s) × {formData.prix_unitaire} {currency} = {montantTotal.toLocaleString("fr-FR")} {currency}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack}>
              Précédent
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={handleNext} disabled={step === 1 && modeles.length === 0}>
              Suivant
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Création..." : "Créer le contrat"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
