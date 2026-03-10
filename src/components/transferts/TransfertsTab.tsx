import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Plus, Pencil, Trash2, Calendar, Link2, AlertCircle, Download, Filter } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useCurrency } from "@/hooks/useCurrency";
import { useTransfertExport } from "@/hooks/useTransfertExport";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Transfert {
  id: string;
  enseignant_id: string;
  module_id?: string;
  date_depart: string;
  date_retour?: string;
  ville_depart: string;
  ville_arrivee: string;
  type_transport: string;
  vehicule_id?: string;
  chauffeur_id?: string;
  hotel_id?: string;
  statut: string;
  cout?: number;
  devise?: string;
  notes?: string;
  tarif_transfert_id?: string;
  classe_id?: string;
  programme_id?: string;
  cout_affecte?: boolean;
  enseignants?: { nom: string; prenom: string };
  modules?: { titre: string };
  vehicules?: { marque: string; modele: string; immatriculation: string };
  chauffeurs?: { nom: string; prenom: string };
  hotels?: { nom: string };
  tarifs_transfert?: { nom: string; prix: number };
  classes?: { nom: string; sous_code: string };
}

interface TarifTransfert {
  id: string;
  nom: string;
  prix: number;
  devise: string;
  type_transport: string;
  trajet: string | null;
}

type FilterPeriod = "semaine" | "mois" | "personnalise" | "tous";

export const TransfertsTab = () => {
  const { toast } = useToast();
  const { canEditSection } = useUserRole();
  const canEditTransferts = canEditSection("transferts");

  const { formatAmount } = useCurrency();
  const { exportToExcel } = useTransfertExport();
  const [transferts, setTransferts] = useState<Transfert[]>([]);
  const [enseignants, setEnseignants] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [vehicules, setVehicules] = useState<any[]>([]);
  const [chauffeurs, setChauffeurs] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [tarifs, setTarifs] = useState<TarifTransfert[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [matchingClasse, setMatchingClasse] = useState<{ classe_id: string; programme_id: string } | null>(null);
  
  // Filtres
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("tous");
  const [customDateStart, setCustomDateStart] = useState("");
  const [customDateEnd, setCustomDateEnd] = useState("");
  
  const [formData, setFormData] = useState({
    enseignant_id: "",
    module_id: "",
    date_depart: "",
    date_retour: "",
    ville_depart: "",
    ville_arrivee: "",
    type_transport: "avion",
    vehicule_id: "",
    chauffeur_id: "",
    hotel_id: "",
    statut: "planifie",
    tarif_transfert_id: "",
    cout: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  // Rechercher la classe correspondante quand l'enseignant ou la date change
  useEffect(() => {
    const findMatchingClasse = async () => {
      if (!formData.enseignant_id || !formData.date_depart) {
        setMatchingClasse(null);
        return;
      }

      try {
        const { data, error } = await supabase.rpc("find_matching_classe_for_transfer", {
          p_enseignant_id: formData.enseignant_id,
          p_date_transfert: new Date(formData.date_depart).toISOString(),
        });

        if (error) throw error;
        if (data && data.length > 0) {
          setMatchingClasse({
            classe_id: data[0].classe_id,
            programme_id: data[0].programme_id,
          });
        } else {
          setMatchingClasse(null);
        }
      } catch (error) {
        console.error("Error finding matching classe:", error);
        setMatchingClasse(null);
      }
    };

    findMatchingClasse();
  }, [formData.enseignant_id, formData.date_depart]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transfertsRes, enseignantsRes, modulesRes, vehiculesRes, chauffeursRes, hotelsRes, tarifsRes] = await Promise.all([
        supabase.from("transferts").select(`
          *,
          enseignants(nom, prenom),
          modules(titre),
          vehicules(marque, modele, immatriculation),
          chauffeurs(nom, prenom),
          hotels(nom),
          tarifs_transfert(nom, prix),
          classes(nom, sous_code)
        `).order("date_depart", { ascending: false }),
        supabase.from("enseignants").select("id, nom, prenom").order("nom"),
        supabase.from("modules").select("id, titre, code").order("code"),
        supabase.from("vehicules").select("id, marque, modele, immatriculation").eq("statut", "disponible").order("marque"),
        supabase.from("chauffeurs").select("id, nom, prenom").eq("disponible", true).order("nom"),
        supabase.from("hotels").select("id, nom, ville").order("nom"),
        supabase.from("tarifs_transfert").select("id, nom, prix, devise, type_transport, trajet").eq("actif", true).order("nom"),
      ]);

      if (transfertsRes.error) throw transfertsRes.error;
      if (enseignantsRes.error) throw enseignantsRes.error;
      if (modulesRes.error) throw modulesRes.error;
      if (vehiculesRes.error) throw vehiculesRes.error;
      if (chauffeursRes.error) throw chauffeursRes.error;
      if (hotelsRes.error) throw hotelsRes.error;
      if (tarifsRes.error) throw tarifsRes.error;

      setTransferts(transfertsRes.data);
      setEnseignants(enseignantsRes.data);
      setModules(modulesRes.data);
      setVehicules(vehiculesRes.data);
      setChauffeurs(chauffeursRes.data);
      setHotels(hotelsRes.data);
      setTarifs(tarifsRes.data || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTarifChange = (tarifId: string) => {
    if (tarifId === "none") {
      setFormData(prev => ({
        ...prev,
        tarif_transfert_id: "",
      }));
      return;
    }
    const tarif = tarifs.find(t => t.id === tarifId);
    if (tarif) {
      setFormData(prev => ({
        ...prev,
        tarif_transfert_id: tarifId,
        cout: tarif.prix.toString(),
        type_transport: tarif.type_transport,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const coutValue = formData.cout ? parseFloat(formData.cout) : null;
      
      const data: any = {
        enseignant_id: formData.enseignant_id,
        module_id: formData.module_id || null,
        date_depart: formData.date_depart,
        date_retour: formData.date_retour || null,
        ville_depart: formData.ville_depart,
        ville_arrivee: formData.ville_arrivee,
        type_transport: formData.type_transport,
        vehicule_id: formData.vehicule_id || null,
        chauffeur_id: formData.chauffeur_id || null,
        hotel_id: formData.hotel_id || null,
        statut: formData.statut,
        tarif_transfert_id: formData.tarif_transfert_id || null,
        cout: coutValue,
        notes: formData.notes || null,
      };

      // Affectation automatique de la classe si correspondance trouvée
      if (matchingClasse && coutValue) {
        data.classe_id = matchingClasse.classe_id;
        data.programme_id = matchingClasse.programme_id;
        data.cout_affecte = true;
        data.cout_par_enseignant = coutValue; // Pour un seul enseignant
      }

      if (editingId) {
        const { error } = await supabase
          .from("transferts")
          .update(data)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Transfert modifié avec succès" });
      } else {
        const { error: insertError, data: insertedData } = await supabase
          .from("transferts")
          .insert(data)
          .select()
          .single();
        if (insertError) throw insertError;

        // Créer automatiquement la ligne budget_items si classe assignée
        if (data.classe_id && coutValue) {
          await createBudgetItem(data.classe_id, data.programme_id, coutValue, formData.enseignant_id);
        }

        toast({ title: "Transfert créé avec succès" });
      }

      setDialogOpen(false);
      resetForm();
      loadData();
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

  const createBudgetItem = async (classeId: string, programmeId: string, cout: number, enseignantId: string) => {
    try {
      const enseignant = enseignants.find(e => e.id === enseignantId);
      const description = `Transfert - ${enseignant?.nom} ${enseignant?.prenom}`;

      const { error } = await supabase.from("budget_items").insert({
        type: "charge",
        categorie: "Transfert",
        description,
        montant_prevu: cout,
        montant_realise: cout,
        classe_id: classeId,
        programme_id: programmeId,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error creating budget item:", error);
    }
  };

  const handleEdit = (transfert: Transfert) => {
    setEditingId(transfert.id);
    setFormData({
      enseignant_id: transfert.enseignant_id,
      module_id: transfert.module_id || "",
      date_depart: transfert.date_depart.split("T")[0],
      date_retour: transfert.date_retour?.split("T")[0] || "",
      ville_depart: transfert.ville_depart,
      ville_arrivee: transfert.ville_arrivee,
      type_transport: transfert.type_transport,
      vehicule_id: transfert.vehicule_id || "",
      chauffeur_id: transfert.chauffeur_id || "",
      hotel_id: transfert.hotel_id || "",
      statut: transfert.statut,
      tarif_transfert_id: transfert.tarif_transfert_id || "",
      cout: transfert.cout?.toString() || "",
      notes: transfert.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce transfert ?")) return;

    try {
      const { error } = await supabase.from("transferts").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Transfert supprimé avec succès" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setMatchingClasse(null);
    setFormData({
      enseignant_id: "",
      module_id: "",
      date_depart: "",
      date_retour: "",
      ville_depart: "",
      ville_arrivee: "",
      type_transport: "avion",
      vehicule_id: "",
      chauffeur_id: "",
      hotel_id: "",
      statut: "planifie",
      tarif_transfert_id: "",
      cout: "",
      notes: "",
    });
  };

  const getStatutBadge = (statut: string) => {
    const colors = {
      planifie: "bg-blue-100 text-blue-800",
      confirme: "bg-green-100 text-green-800",
      en_cours: "bg-yellow-100 text-yellow-800",
      termine: "bg-gray-100 text-gray-800",
      annule: "bg-red-100 text-red-800",
    };
    return colors[statut as keyof typeof colors] || colors.planifie;
  };

  const getFilteredTransferts = () => {
    const now = new Date();
    
    switch (filterPeriod) {
      case "semaine":
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        return transferts.filter(t => {
          const date = parseISO(t.date_depart);
          return isWithinInterval(date, { start: weekStart, end: weekEnd });
        });
      case "mois":
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        return transferts.filter(t => {
          const date = parseISO(t.date_depart);
          return isWithinInterval(date, { start: monthStart, end: monthEnd });
        });
      case "personnalise":
        if (!customDateStart || !customDateEnd) return transferts;
        const start = parseISO(customDateStart);
        const end = parseISO(customDateEnd);
        return transferts.filter(t => {
          const date = parseISO(t.date_depart);
          return isWithinInterval(date, { start, end });
        });
      case "tous":
      default:
        return transferts;
    }
  };

  const handleExport = () => {
    const filteredData = getFilteredTransferts();
    const periodLabel = filterPeriod === "personnalise" && customDateStart && customDateEnd
      ? `${customDateStart}_${customDateEnd}`
      : filterPeriod;
    exportToExcel(filteredData, `transferts_${periodLabel}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({ title: "Export réussi", description: `${filteredData.length} transferts exportés` });
  };

  const filteredTransferts = getFilteredTransferts();

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold">Liste des transferts ({filteredTransferts.length})</h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtres de période */}
          <Select value={filterPeriod} onValueChange={(v) => setFilterPeriod(v as FilterPeriod)}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous</SelectItem>
              <SelectItem value="semaine">Cette semaine</SelectItem>
              <SelectItem value="mois">Ce mois</SelectItem>
              <SelectItem value="personnalise">Personnalisé</SelectItem>
            </SelectContent>
          </Select>

          {filterPeriod === "personnalise" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Dates
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4 space-y-3">
                <div className="space-y-2">
                  <Label>Date début</Label>
                  <Input type="date" value={customDateStart} onChange={(e) => setCustomDateStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Date fin</Label>
                  <Input type="date" value={customDateEnd} onChange={(e) => setCustomDateEnd(e.target.value)} />
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Button variant="outline" onClick={handleExport} disabled={filteredTransferts.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau transfert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier" : "Nouveau"} transfert</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Enseignant *</Label>
                  <Select value={formData.enseignant_id || undefined} onValueChange={(value) => setFormData({ ...formData, enseignant_id: value })} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {enseignants.filter(e => e.id).map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Module</Label>
                  <Select value={formData.module_id || undefined} onValueChange={(value) => setFormData({ ...formData, module_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optionnel" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.filter(m => m.id).map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.code} - {m.titre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date départ *</Label>
                  <Input type="date" value={formData.date_depart} onChange={(e) => setFormData({ ...formData, date_depart: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label>Date retour</Label>
                  <Input type="date" value={formData.date_retour} onChange={(e) => setFormData({ ...formData, date_retour: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Ville départ *</Label>
                  <Input value={formData.ville_depart} onChange={(e) => setFormData({ ...formData, ville_depart: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label>Ville arrivée *</Label>
                  <Input value={formData.ville_arrivee} onChange={(e) => setFormData({ ...formData, ville_arrivee: e.target.value })} required />
                </div>

                {/* Sélection du tarif */}
                <div className="space-y-2 col-span-2">
                  <Label>Tarif de transfert</Label>
                  <Select value={formData.tarif_transfert_id || "none"} onValueChange={handleTarifChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un tarif prédéfini" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Aucun tarif --</SelectItem>
                      {tarifs.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nom} - {t.prix.toLocaleString()} {t.devise} ({t.type_transport})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {tarifs.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Aucun tarif configuré. Créez des tarifs dans l'onglet "Tarifs".
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Type transport *</Label>
                  <Select value={formData.type_transport} onValueChange={(value) => setFormData({ ...formData, type_transport: value })} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avion">Avion</SelectItem>
                      <SelectItem value="train">Train</SelectItem>
                      <SelectItem value="voiture">Voiture</SelectItem>
                      <SelectItem value="taxi">Taxi</SelectItem>
                      <SelectItem value="navette">Navette</SelectItem>
                      <SelectItem value="bus">Bus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Statut *</Label>
                  <Select value={formData.statut} onValueChange={(value) => setFormData({ ...formData, statut: value })} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planifie">Planifié</SelectItem>
                      <SelectItem value="confirme">Confirmé</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="termine">Terminé</SelectItem>
                      <SelectItem value="annule">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Véhicule</Label>
                  <Select value={formData.vehicule_id || undefined} onValueChange={(value) => setFormData({ ...formData, vehicule_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optionnel" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicules.filter(v => v.id).map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.marque} {v.modele} - {v.immatriculation}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Chauffeur</Label>
                  <Select value={formData.chauffeur_id || undefined} onValueChange={(value) => setFormData({ ...formData, chauffeur_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optionnel" />
                    </SelectTrigger>
                    <SelectContent>
                      {chauffeurs.filter(c => c.id).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nom} {c.prenom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Hôtel</Label>
                  <Select value={formData.hotel_id || undefined} onValueChange={(value) => setFormData({ ...formData, hotel_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optionnel" />
                    </SelectTrigger>
                    <SelectContent>
                      {hotels.filter(h => h.id).map((h) => (
                        <SelectItem key={h.id} value={h.id}>{h.nom} - {h.ville}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Coût</Label>
                  <Input type="number" step="0.01" value={formData.cout} onChange={(e) => setFormData({ ...formData, cout: e.target.value })} />
                </div>
              </div>

              {/* Affichage de la correspondance classe */}
              {matchingClasse && formData.cout && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <Link2 className="h-4 w-4" />
                    <span className="font-medium">Affectation automatique</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Ce transfert sera automatiquement affecté à une classe basé sur le planning de l'enseignant (±7 jours).
                    Le coût sera ajouté aux charges de la classe dans la Performance Financière.
                  </p>
                </div>
              )}

              {formData.enseignant_id && formData.date_depart && !matchingClasse && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Aucune correspondance</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Aucune classe correspondante trouvée pour cet enseignant dans la fenêtre de ±7 jours.
                    Le coût ne sera pas automatiquement affecté.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Enseignant</TableHead>
              <TableHead>Date départ</TableHead>
              <TableHead>Trajet</TableHead>
              <TableHead>Transport</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Coût</TableHead>
              <TableHead>Classe affectée</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransferts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Aucun transfert pour cette période
                </TableCell>
              </TableRow>
            ) : (
              filteredTransferts.map((transfert) => (
                <TableRow key={transfert.id}>
                  <TableCell>
                    {transfert.enseignants?.nom} {transfert.enseignants?.prenom}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(transfert.date_depart), "dd/MM/yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    {transfert.ville_depart} → {transfert.ville_arrivee}
                  </TableCell>
                  <TableCell className="capitalize">
                    {transfert.type_transport}
                    {transfert.tarifs_transfert && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {transfert.tarifs_transfert.nom}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatutBadge(transfert.statut)}`}>
                      {transfert.statut}
                    </span>
                  </TableCell>
                  <TableCell>
                    {transfert.cout ? formatAmount(transfert.cout) : "-"}
                  </TableCell>
                  <TableCell>
                    {transfert.classes ? (
                      <Badge variant="secondary" className="text-xs">
                        <Link2 className="h-3 w-3 mr-1" />
                        {transfert.classes.sous_code}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(transfert)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(transfert.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
