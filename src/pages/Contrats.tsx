import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCurrency } from "@/hooks/useCurrency";
import { ContractTemplateManager } from "@/components/contrats/ContractTemplateManager";
import { GenerateContractDialog } from "@/components/contrats/GenerateContractDialog";

interface Contrat {
  id: string;
  date_debut: string;
  date_fin: string;
  montant: number | null;
  devise: string | null;
  statut_validation: string | null;
  document_url: string | null;
  objet: string | null;
  unite: string | null;
  quantite: number | null;
  prix_unitaire: number | null;
  programme_id: string | null;
  enseignants: { id: string; nom: string; prenom: string; email: string };
  programmes?: { titre: string; code: string } | null;
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

export default function Contrats() {
  const { user } = useAuth();
  const { canEditSection, canViewSection } = useUserRole();
  const { toast } = useToast();
  const { formatAmount, currency } = useCurrency();
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEnseignant, setSelectedEnseignant] = useState<Enseignant | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadContrats();
      loadEnseignants();
    }
  }, [user]);

  const loadContrats = async () => {
    try {
      const { data, error } = await supabase
        .from("contrats_intervention")
        .select(`
          *,
          enseignants (id, nom, prenom, email),
          programmes (titre, code)
        `)
        .order("date_debut", { ascending: false });

      if (error) throw error;
      setContrats(data || []);
    } catch (error: any) {
      console.error("Error loading contrats:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEnseignants = async () => {
    try {
      const { data, error } = await supabase
        .from("enseignants")
        .select("*")
        .order("nom");

      if (error) throw error;
      setEnseignants(data || []);
    } catch (error: any) {
      console.error("Error loading enseignants:", error);
    }
  };

  const getStatutBadge = (statut: string | null) => {
    switch (statut) {
      case "valide":
        return <Badge variant="default" className="bg-green-600">Validé</Badge>;
      case "en_attente":
        return <Badge variant="outline" className="text-orange-600 border-orange-600">En attente</Badge>;
      case "refuse":
        return <Badge variant="destructive">Refusé</Badge>;
      default:
        return <Badge variant="outline">Brouillon</Badge>;
    }
  };

  const filteredContrats = contrats.filter((contrat) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contrat.enseignants.nom.toLowerCase().includes(searchLower) ||
      contrat.enseignants.prenom.toLowerCase().includes(searchLower) ||
      contrat.objet?.toLowerCase().includes(searchLower) ||
      contrat.programmes?.titre.toLowerCase().includes(searchLower)
    );
  });

  const handleGenerateContract = (enseignant: Enseignant) => {
    setSelectedEnseignant(enseignant);
    setGenerateDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canViewSection("contrats")) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Vous n'avez pas accès à cette page</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contrats d'intervention</h1>
          <p className="text-muted-foreground">
            Gestion des contrats des enseignants
          </p>
        </div>
      </div>

      <Tabs defaultValue="contrats" className="space-y-6">
        <TabsList>
          <TabsTrigger value="contrats">Contrats</TabsTrigger>
          {canEditSection("contrats") && <TabsTrigger value="modeles">Modèles</TabsTrigger>}
          {canEditSection("contrats") && <TabsTrigger value="generer">Générer un contrat</TabsTrigger>}
        </TabsList>

        <TabsContent value="contrats">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Liste des contrats
                  </CardTitle>
                  <CardDescription>
                    Contrats d'intervention des enseignants
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveTable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enseignant</TableHead>
                    <TableHead>Programme</TableHead>
                    <TableHead>Objet</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Document</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContrats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Aucun contrat enregistré
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContrats.map((contrat) => (
                      <TableRow key={contrat.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {contrat.enseignants.prenom} {contrat.enseignants.nom}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {contrat.enseignants.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {contrat.programmes ? (
                            <Badge variant="outline">
                              {contrat.programmes.code}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {contrat.objet || <span className="text-muted-foreground">-</span>}
                          </div>
                          {contrat.quantite && contrat.unite && (
                            <div className="text-sm text-muted-foreground">
                              {contrat.quantite} {contrat.unite}(s)
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Du {format(new Date(contrat.date_debut), "d MMM yyyy", { locale: fr })}</div>
                            <div>Au {format(new Date(contrat.date_fin), "d MMM yyyy", { locale: fr })}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {contrat.montant ? (
                            <span className="font-medium">
                              {formatAmount(contrat.montant, (contrat.devise as any) || currency)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatutBadge(contrat.statut_validation)}
                        </TableCell>
                        <TableCell>
                          {contrat.document_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(contrat.document_url!, "_blank")}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Télécharger
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">Aucun document</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </ResponsiveTable>
            </CardContent>
          </Card>
        </TabsContent>

        {canEditSection("contrats") && (
          <TabsContent value="modeles">
            <ContractTemplateManager />
          </TabsContent>
        )}

        {canEditSection("contrats") && (
          <TabsContent value="generer">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Générer un nouveau contrat
                </CardTitle>
                <CardDescription>
                  Sélectionnez un enseignant pour générer son contrat d'intervention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un enseignant..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {enseignants
                      .filter((e) => 
                        e.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        e.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        e.email.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .slice(0, 12)
                      .map((enseignant) => (
                        <Card
                          key={enseignant.id}
                          className="cursor-pointer hover:border-primary transition-colors"
                          onClick={() => handleGenerateContract(enseignant)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">
                                  {enseignant.prenom} {enseignant.nom}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {enseignant.email}
                                </p>
                              </div>
                              <Badge variant={
                                enseignant.mode_remuneration === "prestation_service" 
                                  ? "secondary" 
                                  : "default"
                              }>
                                {enseignant.mode_remuneration === "prestation_service" 
                                  ? "Prestation" 
                                  : enseignant.mode_remuneration === "vacation"
                                  ? "Vacation"
                                  : enseignant.mode_remuneration || "Non défini"}
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3 w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateContract(enseignant);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Générer un contrat
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                  </div>

                  {enseignants.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucun enseignant enregistré
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {selectedEnseignant && (
        <GenerateContractDialog
          open={generateDialogOpen}
          onOpenChange={setGenerateDialogOpen}
          enseignant={selectedEnseignant}
          onSuccess={loadContrats}
        />
      )}
    </div>
  );
}
