import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { CurrencySwitch } from "@/components/CurrencySwitch";
import { formatCurrency } from "@/lib/utils";
import { Plus, TrendingUp, TrendingDown, DollarSign, Loader2, Pencil, Trash2, FileSpreadsheet, Filter, X, BookOpen } from "lucide-react";
import ProgrammeDescriptifTab from "@/components/performance/ProgrammeDescriptifTab";
import StatCard from "@/components/StatCard";
import { Textarea } from "@/components/ui/textarea";
import { useExcelExport } from "@/hooks/useExcelExport";

interface BudgetItem {
  id: string;
  type: "charge" | "produit";
  categorie: string;
  description: string | null;
  montant_prevu: number;
  montant_realise: number;
  programme_id: string | null;
  classe_id: string | null;
}

interface KPIGlobal {
  charges_prevues: number;
  charges_realisees: number;
  produits_prevus: number;
  produits_realises: number;
  marge_prevue: number;
  marge_realisee: number;
}

interface KPIProgramme extends KPIGlobal {
  programme_id: string;
  programme_code: string;
  programme_titre: string;
}

interface KPIClasse extends KPIGlobal {
  classe_id: string;
  classe_nom: string;
  classe_code: string;
  programme_id: string;
  programme_titre: string;
}

interface Programme {
  id: string;
  code: string;
  titre: string;
}

interface Classe {
  id: string;
  nom: string;
  sous_code: string;
  programme_id: string;
}

const CATEGORIES_CHARGE = [
  "Honoraires enseignants",
  "Frais de déplacement",
  "Hébergement",
  "Restauration",
  "Location de salle",
  "Matériel pédagogique",
  "Frais administratifs",
  "Autre"
];

const CATEGORIES_PRODUIT = [
  "Frais de formation",
  "Subventions",
  "Sponsoring",
  "Autre"
];

const PerformanceFinanciere = () => {
  const { toast } = useToast();
  const { isAdmin, canManageFinances, loading: roleLoading } = useUserRole();
  const { formatAmount } = useCurrency();
  const { exportToExcel } = useExcelExport();
  const [loading, setLoading] = useState(true);
  const [kpiGlobal, setKpiGlobal] = useState<KPIGlobal | null>(null);
  const [kpiProgrammes, setKpiProgrammes] = useState<KPIProgramme[]>([]);
  const [kpiClasses, setKpiClasses] = useState<KPIClasse[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  
  // Filtres pour les vues Programme et Classe
  const [filterProgrammeId, setFilterProgrammeId] = useState<string>("");
  const [filterClasseProgrammeId, setFilterClasseProgrammeId] = useState<string>("");
  
  const [newItem, setNewItem] = useState({
    type: "charge" as "charge" | "produit",
    categorie: "",
    description: "",
    montant_prevu: "",
    montant_realise: "",
    scope: "global" as "global" | "programme" | "classe",
    programme_id: "",
    classe_id: ""
  });

  // Données filtrées
  const filteredKpiProgrammes = useMemo(() => {
    if (!filterProgrammeId) return kpiProgrammes;
    return kpiProgrammes.filter(kpi => kpi.programme_id === filterProgrammeId);
  }, [kpiProgrammes, filterProgrammeId]);

  const filteredKpiClasses = useMemo(() => {
    if (!filterClasseProgrammeId) return kpiClasses;
    return kpiClasses.filter(kpi => kpi.programme_id === filterClasseProgrammeId);
  }, [kpiClasses, filterClasseProgrammeId]);

  // Fonctions d'export Excel
  const exportGlobalToExcel = () => {
    if (!kpiGlobal) return;
    const data = [{
      "Produits Prévus": kpiGlobal.produits_prevus,
      "Produits Réalisés": kpiGlobal.produits_realises,
      "Charges Prévues": kpiGlobal.charges_prevues,
      "Charges Réalisées": kpiGlobal.charges_realisees,
      "Marge Prévue": kpiGlobal.marge_prevue,
      "Marge Réalisée": kpiGlobal.marge_realisee
    }];
    exportToExcel(data, "performance_globale", "Vue Globale");
    toast({ title: "Export réussi", description: "Les données globales ont été exportées." });
  };

  const exportProgrammesToExcel = () => {
    const data = filteredKpiProgrammes.map(kpi => ({
      "Code Programme": kpi.programme_code,
      "Titre Programme": kpi.programme_titre,
      "Produits Prévus": kpi.produits_prevus,
      "Produits Réalisés": kpi.produits_realises,
      "Charges Prévues": kpi.charges_prevues,
      "Charges Réalisées": kpi.charges_realisees,
      "Marge Prévue": kpi.marge_prevue,
      "Marge Réalisée": kpi.marge_realisee
    }));
    exportToExcel(data, "performance_programmes", "Par Programme");
    toast({ title: "Export réussi", description: "Les données par programme ont été exportées." });
  };

  const exportClassesToExcel = () => {
    const data = filteredKpiClasses.map(kpi => ({
      "Code Classe": kpi.classe_code,
      "Nom Classe": kpi.classe_nom,
      "Programme": kpi.programme_titre,
      "Produits Prévus": kpi.produits_prevus,
      "Produits Réalisés": kpi.produits_realises,
      "Charges Prévues": kpi.charges_prevues,
      "Charges Réalisées": kpi.charges_realisees,
      "Marge Prévue": kpi.marge_prevue,
      "Marge Réalisée": kpi.marge_realisee
    }));
    exportToExcel(data, "performance_classes", "Par Classe");
    toast({ title: "Export réussi", description: "Les données par classe ont été exportées." });
  };

  const exportBudgetToExcel = () => {
    const data = budgetItems.map(item => {
      const perimetre = item.programme_id 
        ? programmes.find(p => p.id === item.programme_id)?.code || "Programme"
        : item.classe_id
        ? classes.find(c => c.id === item.classe_id)?.sous_code || "Classe"
        : "Global";
      return {
        "Type": item.type === "charge" ? "Charge" : "Produit",
        "Catégorie": item.categorie,
        "Description": item.description || "-",
        "Périmètre": perimetre,
        "Montant Prévu": item.montant_prevu,
        "Montant Réalisé": item.montant_realise
      };
    });
    exportToExcel(data, "details_budget", "Détails Budget");
    toast({ title: "Export réussi", description: "Les détails budgétaires ont été exportés." });
  };

  useEffect(() => {
    if (!roleLoading && !canManageFinances()) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les droits pour accéder à cette page.",
        variant: "destructive",
      });
      return;
    }
    
    if (!roleLoading) {
      fetchData();
    }
  }, [roleLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch KPI global
      const { data: globalData, error: globalError } = await supabase
        .from("kpis_financiers_globaux")
        .select("*")
        .single();

      if (globalError) throw globalError;
      setKpiGlobal(globalData);

      // Fetch KPI programmes
      const { data: programmesData, error: programmesError } = await supabase
        .from("kpis_financiers_programme")
        .select("*")
        .order("programme_titre");

      if (programmesError) throw programmesError;
      setKpiProgrammes(programmesData || []);

      // Fetch KPI classes
      const { data: classesData, error: classesError } = await supabase
        .from("kpis_financiers_classe")
        .select("*")
        .order("classe_nom");

      if (classesError) throw classesError;
      setKpiClasses(classesData || []);

      // Fetch budget items
      const { data: itemsData, error: itemsError } = await supabase
        .from("budget_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (itemsError) throw itemsError;
      setBudgetItems((itemsData || []).map(item => ({
        ...item,
        type: item.type as "charge" | "produit"
      })));

      // Fetch programmes list
      const { data: progList, error: progError } = await supabase
        .from("programmes")
        .select("id, code, titre")
        .order("titre");

      if (progError) throw progError;
      setProgrammes(progList || []);

      // Fetch classes list
      const { data: classList, error: classError } = await supabase
        .from("classes")
        .select("id, nom, sous_code, programme_id")
        .order("nom");

      if (classError) throw classError;
      setClasses(classList || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données financières.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin()) {
      toast({
        title: "Accès refusé",
        description: "Seuls les administrateurs peuvent modifier le budget.",
        variant: "destructive",
      });
      return;
    }

    try {
      const itemData: any = {
        type: newItem.type,
        categorie: newItem.categorie,
        description: newItem.description || null,
        montant_prevu: parseFloat(newItem.montant_prevu),
        montant_realise: parseFloat(newItem.montant_realise),
        programme_id: null,
        classe_id: null,
      };

      if (newItem.scope === "programme") {
        itemData.programme_id = newItem.programme_id;
      } else if (newItem.scope === "classe") {
        itemData.classe_id = newItem.classe_id;
      }

      if (editingItem) {
        const { error } = await supabase
          .from("budget_items")
          .update(itemData)
          .eq("id", editingItem.id);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Ligne budgétaire modifiée avec succès.",
        });
      } else {
        const { error } = await supabase
          .from("budget_items")
          .insert([itemData]);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Ligne budgétaire ajoutée avec succès.",
        });
      }

      setDialogOpen(false);
      setEditingItem(null);
      setNewItem({
        type: "charge",
        categorie: "",
        description: "",
        montant_prevu: "",
        montant_realise: "",
        scope: "global",
        programme_id: "",
        classe_id: ""
      });
      fetchData();
    } catch (error: any) {
      console.error("Error saving budget item:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder la ligne budgétaire.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: BudgetItem) => {
    setEditingItem(item);
    setNewItem({
      type: item.type,
      categorie: item.categorie,
      description: item.description || "",
      montant_prevu: item.montant_prevu.toString(),
      montant_realise: item.montant_realise.toString(),
      scope: item.programme_id ? "programme" : item.classe_id ? "classe" : "global",
      programme_id: item.programme_id || "",
      classe_id: item.classe_id || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin()) {
      toast({
        title: "Accès refusé",
        description: "Seuls les administrateurs peuvent supprimer une ligne budgétaire.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Êtes-vous sûr de vouloir supprimer cette ligne budgétaire ?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("budget_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Ligne budgétaire supprimée avec succès.",
      });
      fetchData();
    } catch (error: any) {
      console.error("Error deleting budget item:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la ligne budgétaire.",
        variant: "destructive",
      });
    }
  };

  const renderKPICards = (kpi: KPIGlobal) => {
    const tauxRealisationProduits = kpi.produits_prevus > 0 
      ? (kpi.produits_realises / kpi.produits_prevus) * 100 
      : 0;
    const tauxRealisationCharges = kpi.charges_prevues > 0 
      ? (kpi.charges_realisees / kpi.charges_prevues) * 100 
      : 0;

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Produits Prévus"
          value={formatCurrency(kpi.produits_prevus)}
          icon={DollarSign}
          className="bg-card"
        />
        <StatCard
          title="Produits Réalisés"
          value={formatCurrency(kpi.produits_realises)}
          icon={TrendingUp}
          trend={{
            value: `${tauxRealisationProduits.toFixed(1)}% du prévu`,
            positive: tauxRealisationProduits >= 90
          }}
          className="bg-card"
        />
        <StatCard
          title="Charges Prévues"
          value={formatCurrency(kpi.charges_prevues)}
          icon={DollarSign}
          className="bg-card"
        />
        <StatCard
          title="Charges Réalisées"
          value={formatCurrency(kpi.charges_realisees)}
          icon={TrendingDown}
          trend={{
            value: `${tauxRealisationCharges.toFixed(1)}% du prévu`,
            positive: tauxRealisationCharges <= 100
          }}
          className="bg-card"
        />
        <StatCard
          title="Marge Prévue"
          value={formatCurrency(kpi.marge_prevue)}
          icon={TrendingUp}
          trend={{
            value: kpi.marge_prevue >= 0 ? "Positif" : "Négatif",
            positive: kpi.marge_prevue >= 0
          }}
          className="col-span-2 bg-card"
        />
        <StatCard
          title="Marge Réalisée"
          value={formatCurrency(kpi.marge_realisee)}
          icon={TrendingUp}
          trend={{
            value: kpi.marge_realisee >= 0 ? "Positif" : "Négatif",
            positive: kpi.marge_realisee >= 0
          }}
          className="col-span-2 bg-card"
        />
      </div>
    );
  };

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManageFinances()) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Accès refusé</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Vous n'avez pas les droits pour accéder à cette page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Performance Financière</h1>
          <p className="text-muted-foreground mt-1">Suivi budgétaire et analyse de performance</p>
        </div>
        <div className="flex gap-2 items-center">
          <CurrencySwitch />
          {isAdmin() && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingItem(null);
              setNewItem({
                type: "charge",
                categorie: "",
                description: "",
                montant_prevu: "",
                montant_realise: "",
                scope: "global",
                programme_id: "",
                classe_id: ""
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une ligne budgétaire
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Modifier" : "Ajouter"} une ligne budgétaire
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select
                      value={newItem.type}
                      onValueChange={(value: "charge" | "produit") =>
                        setNewItem({ ...newItem, type: value, categorie: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="charge">Charge</SelectItem>
                        <SelectItem value="produit">Produit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categorie">Catégorie *</Label>
                    <Select
                      value={newItem.categorie}
                      onValueChange={(value) =>
                        setNewItem({ ...newItem, categorie: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(newItem.type === "charge" ? CATEGORIES_CHARGE : CATEGORIES_PRODUIT).map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newItem.description}
                    onChange={(e) =>
                      setNewItem({ ...newItem, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="montant_prevu">Montant Prévu *</Label>
                    <Input
                      id="montant_prevu"
                      type="number"
                      step="0.01"
                      value={newItem.montant_prevu}
                      onChange={(e) =>
                        setNewItem({ ...newItem, montant_prevu: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="montant_realise">Montant Réalisé *</Label>
                    <Input
                      id="montant_realise"
                      type="number"
                      step="0.01"
                      value={newItem.montant_realise}
                      onChange={(e) =>
                        setNewItem({ ...newItem, montant_realise: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scope">Périmètre *</Label>
                  <Select
                    value={newItem.scope}
                    onValueChange={(value: "global" | "programme" | "classe") =>
                      setNewItem({ ...newItem, scope: value, programme_id: "", classe_id: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="programme">Programme</SelectItem>
                      <SelectItem value="classe">Classe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newItem.scope === "programme" && (
                  <div className="space-y-2">
                    <Label htmlFor="programme">Programme *</Label>
                    <Select
                      value={newItem.programme_id}
                      onValueChange={(value) =>
                        setNewItem({ ...newItem, programme_id: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un programme..." />
                      </SelectTrigger>
                      <SelectContent>
                        {programmes.map((prog) => (
                          <SelectItem key={prog.id} value={prog.id}>
                            {prog.code} - {prog.titre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {newItem.scope === "classe" && (
                  <div className="space-y-2">
                    <Label htmlFor="classe">Classe *</Label>
                    <Select
                      value={newItem.classe_id}
                      onValueChange={(value) =>
                        setNewItem({ ...newItem, classe_id: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une classe..." />
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
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingItem(null);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button type="submit">
                    {editingItem ? "Modifier" : "Ajouter"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="global" className="space-y-6">
        <TabsList>
          <TabsTrigger value="global">Vue Globale</TabsTrigger>
          <TabsTrigger value="programmes">Par Programme</TabsTrigger>
          <TabsTrigger value="classes">Par Classe</TabsTrigger>
          <TabsTrigger value="descriptif">Descriptif Programmes</TabsTrigger>
          <TabsTrigger value="details">Détails Budget</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" onClick={exportGlobalToExcel} disabled={!kpiGlobal}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exporter Excel
            </Button>
          </div>
          {kpiGlobal && renderKPICards(kpiGlobal)}
        </TabsContent>

        <TabsContent value="programmes" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Performance par Programme</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={filterProgrammeId || "__all__"}
                    onValueChange={(v) => setFilterProgrammeId(v === "__all__" ? "" : v)}
                  >
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Tous les programmes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Tous les programmes</SelectItem>
                      {programmes.map((prog) => (
                        <SelectItem key={prog.id} value={prog.id}>
                          {prog.code} - {prog.titre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filterProgrammeId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFilterProgrammeId("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button variant="outline" onClick={exportProgrammesToExcel} disabled={filteredKpiProgrammes.length === 0}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exporter Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Programme</TableHead>
                      <TableHead className="text-right">Produits Prévus</TableHead>
                      <TableHead className="text-right">Produits Réalisés</TableHead>
                      <TableHead className="text-right">Charges Prévues</TableHead>
                      <TableHead className="text-right">Charges Réalisées</TableHead>
                      <TableHead className="text-right">Marge Prévue</TableHead>
                      <TableHead className="text-right">Marge Réalisée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKpiProgrammes.map((kpi) => (
                      <TableRow key={kpi.programme_id}>
                        <TableCell className="font-medium">
                          {kpi.programme_code} - {kpi.programme_titre}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(kpi.produits_prevus)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(kpi.produits_realises)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(kpi.charges_prevues)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(kpi.charges_realisees)}</TableCell>
                        <TableCell className={`text-right font-medium ${kpi.marge_prevue >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(kpi.marge_prevue)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${kpi.marge_realisee >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(kpi.marge_realisee)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredKpiProgrammes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Aucune donnée disponible.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Performance par Classe</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={filterClasseProgrammeId || "__all__"}
                    onValueChange={(v) => setFilterClasseProgrammeId(v === "__all__" ? "" : v)}
                  >
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Tous les programmes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Tous les programmes</SelectItem>
                      {programmes.map((prog) => (
                        <SelectItem key={prog.id} value={prog.id}>
                          {prog.code} - {prog.titre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filterClasseProgrammeId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFilterClasseProgrammeId("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button variant="outline" onClick={exportClassesToExcel} disabled={filteredKpiClasses.length === 0}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exporter Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Classe</TableHead>
                      <TableHead>Programme</TableHead>
                      <TableHead className="text-right">Produits Prévus</TableHead>
                      <TableHead className="text-right">Produits Réalisés</TableHead>
                      <TableHead className="text-right">Charges Prévues</TableHead>
                      <TableHead className="text-right">Charges Réalisées</TableHead>
                      <TableHead className="text-right">Marge Prévue</TableHead>
                      <TableHead className="text-right">Marge Réalisée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKpiClasses.map((kpi) => (
                      <TableRow key={kpi.classe_id}>
                        <TableCell className="font-medium">
                          {kpi.classe_code} - {kpi.classe_nom}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {kpi.programme_titre}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(kpi.produits_prevus)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(kpi.produits_realises)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(kpi.charges_prevues)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(kpi.charges_realisees)}</TableCell>
                        <TableCell className={`text-right font-medium ${kpi.marge_prevue >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(kpi.marge_prevue)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${kpi.marge_realisee >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(kpi.marge_realisee)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredKpiClasses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Aucune donnée disponible.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="descriptif" className="space-y-6">
          <ProgrammeDescriptifTab />
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Détail des Lignes Budgétaires</CardTitle>
              <Button variant="outline" onClick={exportBudgetToExcel} disabled={budgetItems.length === 0}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exporter Excel
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Périmètre</TableHead>
                      <TableHead className="text-right">Montant Prévu</TableHead>
                      <TableHead className="text-right">Montant Réalisé</TableHead>
                      {isAdmin() && <TableHead className="text-center">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetItems.map((item) => {
                      const perimetre = item.programme_id 
                        ? programmes.find(p => p.id === item.programme_id)?.code || "Programme"
                        : item.classe_id
                        ? classes.find(c => c.id === item.classe_id)?.sous_code || "Classe"
                        : "Global";

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.type === "charge" 
                                ? "bg-destructive/10 text-destructive" 
                                : "bg-success/10 text-success"
                            }`}>
                              {item.type === "charge" ? "Charge" : "Produit"}
                            </span>
                          </TableCell>
                          <TableCell>{item.categorie}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {item.description || "-"}
                          </TableCell>
                          <TableCell>{perimetre}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.montant_prevu)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.montant_realise)}</TableCell>
                          {isAdmin() && (
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {budgetItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={isAdmin() ? 7 : 6} className="text-center text-muted-foreground py-8">
                          Aucune ligne budgétaire pour le moment.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceFinanciere;