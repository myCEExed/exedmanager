import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useExcelExport } from "@/hooks/useExcelExport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, CheckCircle, Clock, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";

export default function Recouvrements() {
  const [facturesImpayees, setFacturesImpayees] = useState<any[]>([]);
  const [allFactures, setAllFactures] = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [relances, setRelances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPaiement, setOpenPaiement] = useState(false);
  const [openRelance, setOpenRelance] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState<any>(null);
  const { toast } = useToast();
  const { exportToExcel } = useExcelExport();

  const [paiementData, setPaiementData] = useState({
    montant: "",
    mode_paiement: "virement",
    date_paiement: new Date().toISOString().split('T')[0],
    reference: "",
    notes: "",
  });

  const [relanceData, setRelanceData] = useState({
    type_relance: "email",
    date_relance: new Date().toISOString().split('T')[0],
    contenu: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Récupérer toutes les factures pour la consolidation
      const { data: allFacturesData, error: allFacturesError } = await supabase
        .from("factures")
        .select(`
          *,
          stagiaires (nom, prenom, email, telephone),
          classes (nom)
        `)
        .order("created_at", { ascending: false });

      if (allFacturesError) throw allFacturesError;
      setAllFactures(allFacturesData || []);

      // Filtrer les factures impayées ou partiellement payées
      const impayees = (allFacturesData || []).filter(
        (f: any) => f.statut === "envoyee" || f.statut === "partielle"
      );
      setFacturesImpayees(impayees);

      // Récupérer tous les paiements avec les infos complètes de facture
      const { data: paiementsData } = await supabase
        .from("paiements")
        .select(`
          *,
          factures (
            id,
            numero_facture, 
            montant_total,
            montant_paye,
            statut,
            stagiaires (nom, prenom)
          )
        `)
        .order("date_paiement", { ascending: false });

      setPaiements(paiementsData || []);

      // Récupérer les relances récentes
      const { data: relancesData } = await supabase
        .from("relances")
        .select(`
          *,
          factures (numero_facture, stagiaires (nom, prenom))
        `)
        .order("date_relance", { ascending: false })
        .limit(20);

      setRelances(relancesData || []);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnregistrerPaiement = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("paiements").insert([
        {
          facture_id: selectedFacture.id,
          montant: parseFloat(paiementData.montant),
          mode_paiement: paiementData.mode_paiement as any,
          date_paiement: paiementData.date_paiement,
          reference: paiementData.reference,
          notes: paiementData.notes,
          created_by: user.id,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Paiement enregistré avec succès",
      });

      setOpenPaiement(false);
      setPaiementData({
        montant: "",
        mode_paiement: "virement",
        date_paiement: new Date().toISOString().split('T')[0],
        reference: "",
        notes: "",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEnvoyerRelance = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("relances").insert([
        {
          facture_id: selectedFacture.id,
          ...relanceData,
          envoyee_par: user.id,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Relance enregistrée avec succès",
      });

      setOpenRelance(false);
      setRelanceData({
        type_relance: "email",
        date_relance: new Date().toISOString().split('T')[0],
        contenu: "",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRetardJours = (dateEcheance: string) => {
    const echeance = new Date(dateEcheance);
    const aujourdhui = new Date();
    const diff = Math.floor((aujourdhui.getTime() - echeance.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const stats = {
    totalImpaye: facturesImpayees.reduce(
      (sum, f) => sum + (parseFloat(f.montant_total) - parseFloat(f.montant_paye)),
      0
    ),
    nombreFactures: facturesImpayees.length,
    enRetard: facturesImpayees.filter((f) => getRetardJours(f.date_echeance) > 0).length,
  };

  const handleExportFacturesImpayees = () => {
    const exportData = facturesImpayees.map((f) => ({
      "Numéro": f.numero_facture,
      "Stagiaire": f.stagiaires ? `${f.stagiaires.prenom} ${f.stagiaires.nom}` : "",
      "Date échéance": new Date(f.date_echeance).toLocaleDateString("fr-FR"),
      "Montant dû": `${formatCurrency(parseFloat(f.montant_total) - parseFloat(f.montant_paye))} €`,
      "Montant total": `${formatCurrency(f.montant_total)} €`,
      "Montant payé": `${formatCurrency(f.montant_paye)} €`,
    }));
    exportToExcel(exportData, "factures_impayees", "Factures impayées");
    toast({
      title: "Succès",
      description: "Export Excel réussi",
    });
  };

  const handleExportPaiements = () => {
    const exportData = paiements.map((p) => ({
      "Facture": p.factures?.numero_facture || "",
      "Date paiement": new Date(p.date_paiement).toLocaleDateString("fr-FR"),
      "Montant": `${formatCurrency(p.montant)} €`,
      "Mode": p.mode_paiement,
      "Référence": p.reference || "",
      "Notes": p.notes || "",
    }));
    exportToExcel(exportData, "paiements", "Paiements");
    toast({
      title: "Succès",
      description: "Export Excel réussi",
    });
  };

  const handleExportRelances = () => {
    const exportData = relances.map((r) => ({
      "Facture": r.factures?.numero_facture || "",
      "Type": r.type_relance,
      "Date": new Date(r.date_relance).toLocaleDateString("fr-FR"),
      "Contenu": r.contenu || "",
    }));
    exportToExcel(exportData, "relances", "Relances");
    toast({
      title: "Succès",
      description: "Export Excel réussi",
    });
  };

  if (loading) return <div className="p-6">Chargement...</div>;

  return (
    <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Suivi des Recouvrements</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Montant à Recouvrer</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats.totalImpaye)} €
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sur {stats.nombreFactures} facture(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Factures en Retard</CardTitle>
              <Clock className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.enRetard}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Nécessitent une action
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paiements ce Mois</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {paiements.filter(p => {
                  const date = new Date(p.date_paiement);
                  const now = new Date();
                  return date.getMonth() === now.getMonth();
                }).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Paiements enregistrés
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="impayees" className="space-y-4">
          <TabsList>
            <TabsTrigger value="impayees">Factures Impayées</TabsTrigger>
            <TabsTrigger value="paiements">Paiements</TabsTrigger>
            <TabsTrigger value="relances">Relances</TabsTrigger>
          </TabsList>

          <TabsContent value="impayees" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={handleExportFacturesImpayees}>
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </div>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Facture</TableHead>
                    <TableHead>Stagiaire</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Montant Facture</TableHead>
                    <TableHead className="text-right">Montant Payé</TableHead>
                    <TableHead className="text-right">Restant Dû</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Retard</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturesImpayees.map((facture) => {
                    const retard = getRetardJours(facture.date_echeance);
                    const montantTotal = parseFloat(facture.montant_total) || 0;
                    const montantPaye = parseFloat(facture.montant_paye) || 0;
                    const montantDu = montantTotal - montantPaye;
                    const pourcentagePaye = montantTotal > 0 ? (montantPaye / montantTotal) * 100 : 0;

                    return (
                      <TableRow key={facture.id}>
                        <TableCell className="font-medium">{facture.numero_facture}</TableCell>
                        <TableCell>
                          {facture.stagiaires?.nom} {facture.stagiaires?.prenom}
                        </TableCell>
                        <TableCell>
                          {facture.statut === "partielle" ? (
                            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                              Partiel ({pourcentagePaye.toFixed(0)}%)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                              Envoyée
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(montantTotal)} €
                        </TableCell>
                        <TableCell className="text-right">
                          {montantPaye > 0 ? (
                            <span className="text-green-600 font-medium">
                              {formatCurrency(montantPaye)} €
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0,00 €</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-orange-600">
                          {formatCurrency(montantDu)} €
                        </TableCell>
                        <TableCell>
                          {new Date(facture.date_echeance).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          {retard > 0 ? (
                            <Badge variant="destructive">{retard} jours</Badge>
                          ) : (
                            <Badge variant="secondary">À venir</Badge>
                          )}
                        </TableCell>
                        <TableCell className="space-x-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedFacture(facture);
                              setPaiementData({ ...paiementData, montant: montantDu.toString() });
                              setOpenPaiement(true);
                            }}
                          >
                            Enregistrer paiement
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedFacture(facture);
                              setOpenRelance(true);
                            }}
                          >
                            Relancer
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="paiements" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={handleExportPaiements}>
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </div>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>N° Facture</TableHead>
                    <TableHead>Stagiaire</TableHead>
                    <TableHead className="text-right">Montant Facture</TableHead>
                    <TableHead className="text-right">Montant Paiement</TableHead>
                    <TableHead className="text-right">Total Payé</TableHead>
                    <TableHead className="text-right">Restant Dû</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Référence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paiements.map((paiement) => {
                    // Calculer le total des paiements pour cette facture
                    const paiementsFacture = paiements.filter(
                      (p) => p.facture_id === paiement.facture_id
                    );
                    const totalPayeFacture = paiementsFacture.reduce(
                      (sum, p) => sum + (parseFloat(p.montant) || 0),
                      0
                    );
                    
                    // Utiliser les infos de facture depuis le paiement ou chercher dans allFactures
                    const montantFacture = paiement.factures?.montant_total 
                      ? parseFloat(paiement.factures.montant_total) 
                      : (allFactures.find(f => f.id === paiement.facture_id)?.montant_total 
                          ? parseFloat(allFactures.find(f => f.id === paiement.facture_id).montant_total) 
                          : 0);
                    
                    const restantDu = montantFacture - totalPayeFacture;
                    const estSoldee = restantDu <= 0 && montantFacture > 0;
                    
                    return (
                      <TableRow key={paiement.id}>
                        <TableCell>
                          {new Date(paiement.date_paiement).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell className="font-medium">{paiement.factures?.numero_facture}</TableCell>
                        <TableCell>
                          {paiement.factures?.stagiaires?.nom} {paiement.factures?.stagiaires?.prenom}
                        </TableCell>
                        <TableCell className="text-right">
                          {montantFacture > 0 ? `${formatCurrency(montantFacture)} €` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(paiement.montant)} €
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-green-600 font-medium">
                            {formatCurrency(totalPayeFacture)} €
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {estSoldee ? (
                            <Badge className="bg-green-100 text-green-700 border-green-300">
                              Soldée
                            </Badge>
                          ) : restantDu > 0 ? (
                            <span className="text-orange-600 font-semibold">
                              {formatCurrency(restantDu)} €
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{paiement.mode_paiement}</TableCell>
                        <TableCell>{paiement.reference || "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="relances" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={handleExportRelances}>
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>N° Facture</TableHead>
                    <TableHead>Stagiaire</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contenu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relances.map((relance) => (
                    <TableRow key={relance.id}>
                      <TableCell>
                        {new Date(relance.date_relance).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{relance.factures?.numero_facture}</TableCell>
                      <TableCell>
                        {relance.factures?.stagiaires?.nom} {relance.factures?.stagiaires?.prenom}
                      </TableCell>
                      <TableCell className="capitalize">{relance.type_relance}</TableCell>
                      <TableCell className="max-w-xs truncate">{relance.contenu}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog Paiement */}
        <Dialog open={openPaiement} onOpenChange={setOpenPaiement}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enregistrer un paiement</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEnregistrerPaiement} className="space-y-4">
              <div className="space-y-2">
                <Label>Facture</Label>
                <Input
                  value={selectedFacture?.numero_facture || ""}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label>Montant (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paiementData.montant}
                  onChange={(e) => setPaiementData({ ...paiementData, montant: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Mode de paiement *</Label>
                <Select
                  value={paiementData.mode_paiement}
                  onValueChange={(value) => setPaiementData({ ...paiementData, mode_paiement: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="virement">Virement</SelectItem>
                    <SelectItem value="cheque">Chèque</SelectItem>
                    <SelectItem value="especes">Espèces</SelectItem>
                    <SelectItem value="carte">Carte bancaire</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date du paiement *</Label>
                <Input
                  type="date"
                  value={paiementData.date_paiement}
                  onChange={(e) => setPaiementData({ ...paiementData, date_paiement: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Référence</Label>
                <Input
                  value={paiementData.reference}
                  onChange={(e) => setPaiementData({ ...paiementData, reference: e.target.value })}
                  placeholder="N° de transaction, chèque..."
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={paiementData.notes}
                  onChange={(e) => setPaiementData({ ...paiementData, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <Button type="submit" className="w-full">Enregistrer le paiement</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Relance */}
        <Dialog open={openRelance} onOpenChange={setOpenRelance}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enregistrer une relance</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEnvoyerRelance} className="space-y-4">
              <div className="space-y-2">
                <Label>Facture</Label>
                <Input
                  value={selectedFacture?.numero_facture || ""}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label>Type de relance *</Label>
                <Select
                  value={relanceData.type_relance}
                  onValueChange={(value) => setRelanceData({ ...relanceData, type_relance: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="courrier">Courrier</SelectItem>
                    <SelectItem value="telephone">Téléphone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date de la relance *</Label>
                <Input
                  type="date"
                  value={relanceData.date_relance}
                  onChange={(e) => setRelanceData({ ...relanceData, date_relance: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Contenu / Notes</Label>
                <Textarea
                  value={relanceData.contenu}
                  onChange={(e) => setRelanceData({ ...relanceData, contenu: e.target.value })}
                  rows={4}
                  placeholder="Détails de la relance..."
                />
              </div>
              <Button type="submit" className="w-full">Enregistrer la relance</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  );
}