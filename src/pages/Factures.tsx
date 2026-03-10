import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useExcelExport } from "@/hooks/useExcelExport";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CurrencySwitch } from "@/components/CurrencySwitch";
import { Plus, Search, Eye, Download, FileText, ChevronLeft, ChevronRight, Euro, Banknote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { FactureDetailSheet } from "@/components/factures/FactureDetailSheet";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ITEMS_PER_PAGE = 25;

export default function Factures() {
  const [factures, setFactures] = useState<any[]>([]);
  const [stagiaires, setStagiaires] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [modelesFacture, setModelesFacture] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFactures, setSelectedFactures] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const { exportToExcel } = useExcelExport();
  const { formatAmount, exchangeRate, convertAmount } = useCurrency();

  const [formData, setFormData] = useState({
    numero_facture: "",
    stagiaire_id: "",
    classe_id: "",
    montant_total: "",
    date_emission: new Date().toISOString().split('T')[0],
    date_echeance: "",
    notes: "",
    devise: "EUR" as "EUR" | "MAD",
    modele_facture_id: "",
  });

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer les factures
      let query = supabase
        .from("factures")
        .select(`
          *,
          stagiaires (nom, prenom, email),
          classes (nom, sous_code),
          bons_commande (numero_bc)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("statut", statusFilter as any);
      }

      const { data: facturesData, error: facturesError } = await query;
      if (facturesError) throw facturesError;
      setFactures(facturesData || []);

      // Récupérer les stagiaires
      const { data: stagiairesData } = await supabase
        .from("stagiaires")
        .select("*")
        .order("nom");
      setStagiaires(stagiairesData || []);

      // Récupérer les classes
      const { data: classesData } = await supabase
        .from("classes")
        .select("*")
        .order("nom");
      setClasses(classesData || []);

      // Récupérer les modèles de facture
      const { data: modelesData } = await supabase
        .from("modeles_facture")
        .select("*")
        .order("is_default", { ascending: false })
        .order("nom");
      setModelesFacture(modelesData || []);
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

  const generateNumeroFacture = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `FAC-${year}${month}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const numero = formData.numero_facture || generateNumeroFacture();
      const montantSaisi = parseFloat(formData.montant_total);
      
      // Si MAD, convertir en EUR pour le stockage
      const montantEUR = formData.devise === "MAD" 
        ? convertAmount(montantSaisi, "MAD", "EUR")
        : montantSaisi;

      const { error } = await supabase.from("factures").insert([
        {
          numero_facture: numero,
          stagiaire_id: formData.stagiaire_id || null,
          classe_id: formData.classe_id || null,
          montant_total: montantEUR,
          montant_total_devise_origine: formData.devise === "MAD" ? montantSaisi : null,
          devise: formData.devise,
          modele_facture_id: formData.modele_facture_id || null,
          date_emission: formData.date_emission,
          date_echeance: formData.date_echeance,
          notes: formData.notes || null,
          statut: 'brouillon',
          created_by: user.id,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Facture créée avec succès",
      });

      setOpen(false);
      setFormData({
        numero_facture: "",
        stagiaire_id: "",
        classe_id: "",
        montant_total: "",
        date_emission: new Date().toISOString().split('T')[0],
        date_echeance: "",
        notes: "",
        devise: "EUR",
        modele_facture_id: "",
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

  const getStatusBadge = (statut: string) => {
    const variants: any = {
      brouillon: "secondary",
      envoyee: "default",
      payee: "default",
      partielle: "default",
      annulee: "destructive",
    };

    const colors: any = {
      brouillon: "bg-gray-500",
      envoyee: "bg-blue-500",
      payee: "bg-green-500",
      partielle: "bg-orange-500",
      annulee: "bg-red-500",
    };

    return (
      <Badge variant={variants[statut]} className={colors[statut]}>
        {statut.charAt(0).toUpperCase() + statut.slice(1)}
      </Badge>
    );
  };

  const filteredFactures = useMemo(() => {
    return factures.filter((facture) =>
      facture.numero_facture.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facture.stagiaires?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facture.stagiaires?.prenom?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [factures, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredFactures.length / ITEMS_PER_PAGE);
  const paginatedFactures = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredFactures.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredFactures, currentPage]);

  const stats = {
    total: factures.length,
    montantTotal: factures.reduce((sum, f) => sum + parseFloat(f.montant_total || 0), 0),
    montantPaye: factures.reduce((sum, f) => sum + parseFloat(f.montant_paye || 0), 0),
    enAttente: factures.filter(f => f.statut === 'envoyee' || f.statut === 'partielle').length,
  };

  const handleExport = () => {
    const exportData = factures.map((f) => ({
      "Numéro": f.numero_facture,
      "Stagiaire": f.stagiaires ? `${f.stagiaires.prenom} ${f.stagiaires.nom}` : "",
      "Classe": f.classes?.nom || "",
      "Date émission": new Date(f.date_emission).toLocaleDateString("fr-FR"),
      "Date échéance": new Date(f.date_echeance).toLocaleDateString("fr-FR"),
      "Montant total": `${formatCurrency(f.montant_total)} €`,
      "Montant payé": `${formatCurrency(f.montant_paye)} €`,
      "Statut": f.statut,
      "Notes": f.notes || "",
    }));
    exportToExcel(exportData, "factures", "Factures");
    toast({
      title: "Succès",
      description: "Export Excel réussi",
    });
  };

  // Sélection
  const toggleSelectFacture = (id: string) => {
    setSelectedFactures(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedFactures.length === paginatedFactures.length) {
      setSelectedFactures([]);
    } else {
      setSelectedFactures(paginatedFactures.map(f => f.id));
    }
  };

  const selectAllFiltered = () => {
    setSelectedFactures(filteredFactures.map(f => f.id));
  };

  // Export PDF massif
  const exportSelectedToPDF = async () => {
    if (selectedFactures.length === 0) {
      toast({
        title: "Attention",
        description: "Veuillez sélectionner au moins une facture",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    try {
      const selectedData = factures.filter(f => selectedFactures.includes(f.id));
      
      const doc = new jsPDF();
      let isFirstPage = true;

      for (const facture of selectedData) {
        if (!isFirstPage) {
          doc.addPage();
        }
        isFirstPage = false;

        // En-tête
        doc.setFontSize(20);
        doc.setTextColor(59, 130, 246);
        doc.text("FACTURE", 105, 20, { align: "center" });
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(facture.numero_facture, 105, 30, { align: "center" });

        // Statut
        const statusColors: Record<string, [number, number, number]> = {
          brouillon: [107, 114, 128],
          envoyee: [59, 130, 246],
          payee: [34, 197, 94],
          partielle: [249, 115, 22],
          annulee: [239, 68, 68],
        };
        const statusColor = statusColors[facture.statut] || [0, 0, 0];
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.text(`Statut: ${facture.statut.toUpperCase()}`, 105, 38, { align: "center" });
        doc.setTextColor(0, 0, 0);

        // Dates
        doc.setFontSize(10);
        doc.text(`Date d'émission: ${new Date(facture.date_emission).toLocaleDateString("fr-FR")}`, 20, 50);
        doc.text(`Date d'échéance: ${new Date(facture.date_echeance).toLocaleDateString("fr-FR")}`, 20, 56);

        // Client
        if (facture.stagiaires) {
          doc.setFontSize(11);
          doc.setFont(undefined, "bold");
          doc.text("Client:", 20, 70);
          doc.setFont(undefined, "normal");
          doc.text(`${facture.stagiaires.prenom} ${facture.stagiaires.nom}`, 20, 77);
          if (facture.stagiaires.email) {
            doc.text(facture.stagiaires.email, 20, 84);
          }
        }

        // Montants
        autoTable(doc, {
          startY: 100,
          head: [["Description", "Montant"]],
          body: [
            ["Montant Total", `${formatCurrency(facture.montant_total)} €`],
            ["Montant Payé", `${formatCurrency(facture.montant_paye || 0)} €`],
            ["Reste à payer", `${formatCurrency((facture.montant_total || 0) - (facture.montant_paye || 0))} €`],
          ],
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
        });

        // Notes
        if (facture.notes) {
          const finalY = (doc as any).lastAutoTable?.finalY || 140;
          doc.setFontSize(10);
          doc.setFont(undefined, "bold");
          doc.text("Notes:", 20, finalY + 15);
          doc.setFont(undefined, "normal");
          const splitNotes = doc.splitTextToSize(facture.notes, 170);
          doc.text(splitNotes, 20, finalY + 22);
        }

        // Pied de page
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 105, 285, { align: "center" });
      }

      doc.save(`factures_export_${new Date().toISOString().split("T")[0]}.pdf`);

      toast({
        title: "Succès",
        description: `${selectedData.length} facture(s) exportée(s) en PDF`,
      });

      setSelectedFactures([]);
    } catch (error: any) {
      console.error("Error exporting PDFs:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'export PDF",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="p-6">Chargement...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Factures</h1>
        </div>
        <div className="flex gap-2 items-center">
          <CurrencySwitch />
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle Facture
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer une nouvelle facture</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Numéro de facture (auto si vide)</Label>
                    <Input
                      value={formData.numero_facture}
                      onChange={(e) => setFormData({ ...formData, numero_facture: e.target.value })}
                      placeholder="FAC-202401-0001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stagiaire *</Label>
                    <Select value={formData.stagiaire_id} onValueChange={(value) => setFormData({ ...formData, stagiaire_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {stagiaires.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nom} {s.prenom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Classe (optionnel)</Label>
                    <Select value={formData.classe_id} onValueChange={(value) => setFormData({ ...formData, classe_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nom} ({c.sous_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Devise</Label>
                    <RadioGroup
                      value={formData.devise}
                      onValueChange={(value: "EUR" | "MAD") => setFormData({ ...formData, devise: value })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="EUR" id="devise-eur" />
                        <Label htmlFor="devise-eur" className="flex items-center gap-1 cursor-pointer">
                          <Euro className="w-4 h-4" /> EUR
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="MAD" id="devise-mad" />
                        <Label htmlFor="devise-mad" className="flex items-center gap-1 cursor-pointer">
                          <Banknote className="w-4 h-4" /> MAD
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Montant Total ({formData.devise === "EUR" ? "€" : "MAD"}) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.montant_total}
                    onChange={(e) => setFormData({ ...formData, montant_total: e.target.value })}
                    required
                  />
                  {formData.devise === "MAD" && formData.montant_total && exchangeRate && (
                    <p className="text-sm text-muted-foreground">
                      ≈ {convertAmount(parseFloat(formData.montant_total), "MAD", "EUR").toFixed(2)} € (taux: {exchangeRate})
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date d'émission *</Label>
                    <Input
                      type="date"
                      value={formData.date_emission}
                      onChange={(e) => setFormData({ ...formData, date_emission: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date d'échéance *</Label>
                    <Input
                      type="date"
                      value={formData.date_echeance}
                      onChange={(e) => setFormData({ ...formData, date_echeance: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Modèle de facture</Label>
                  <Select 
                    value={formData.modele_facture_id} 
                    onValueChange={(value) => setFormData({ ...formData, modele_facture_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Modèle par défaut" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelesFacture.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nom} {m.is_default && "(par défaut)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full">Créer la facture</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Factures</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Montant Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatAmount(stats.montantTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Montant Payé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatAmount(stats.montantPaye)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">En Attente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{stats.enAttente}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par numéro, nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="envoyee">Envoyée</SelectItem>
            <SelectItem value="partielle">Partielle</SelectItem>
            <SelectItem value="payee">Payée</SelectItem>
            <SelectItem value="annulee">Annulée</SelectItem>
          </SelectContent>
        </Select>
        
        {selectedFactures.length > 0 && (
          <Button onClick={exportSelectedToPDF} disabled={exporting}>
            <FileText className="w-4 h-4 mr-2" />
            {exporting ? "Export..." : `Exporter ${selectedFactures.length} PDF`}
          </Button>
        )}
        
        {filteredFactures.length > paginatedFactures.length && (
          <Button variant="outline" size="sm" onClick={selectAllFiltered}>
            Sélectionner les {filteredFactures.length} résultats
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={paginatedFactures.length > 0 && selectedFactures.length === paginatedFactures.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>N° Facture</TableHead>
              <TableHead>Stagiaire</TableHead>
              <TableHead>Classe</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Payé</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedFactures.map((facture) => (
              <TableRow key={facture.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedFactures.includes(facture.id)}
                    onCheckedChange={() => toggleSelectFacture(facture.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{facture.numero_facture}</TableCell>
                <TableCell>
                  {facture.stagiaires?.nom} {facture.stagiaires?.prenom}
                </TableCell>
                <TableCell>
                  {facture.classes?.nom || "-"}
                </TableCell>
                <TableCell>{formatAmount(facture.montant_total)}</TableCell>
                <TableCell>{formatAmount(facture.montant_paye)}</TableCell>
                <TableCell>{new Date(facture.date_echeance).toLocaleDateString()}</TableCell>
                <TableCell>{getStatusBadge(facture.statut)}</TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedFacture(facture);
                      setDetailOpen(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages} ({filteredFactures.length} résultats)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Sheet de détail */}
      <FactureDetailSheet
        facture={selectedFacture}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={() => {
          fetchData();
          setDetailOpen(false);
        }}
      />
    </div>
  );
}