import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCurrency } from "@/hooks/useCurrency";

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
  programmes?: { titre: string; code: string } | null;
}

export function EnseignantContratsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatAmount, currency } = useCurrency();
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadContrats();
    }
  }, [user]);

  const loadContrats = async () => {
    try {
      // First get the enseignant id
      const { data: enseignant } = await supabase
        .from("enseignants")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!enseignant) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("contrats_intervention")
        .select(`
          id,
          date_debut,
          date_fin,
          montant,
          devise,
          statut_validation,
          document_url,
          objet,
          unite,
          quantite,
          prix_unitaire,
          programmes (titre, code)
        `)
        .eq("enseignant_id", enseignant.id)
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

  if (loading) {
    return <div className="text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Mes contrats
          </CardTitle>
          <CardDescription>
            Historique de vos contrats d'intervention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contrats.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun contrat</p>
            </div>
          ) : (
            <ResponsiveTable>
              <TableHeader>
                <TableRow>
                  <TableHead>Programme</TableHead>
                  <TableHead>Objet</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Document</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contrats.map((contrat) => (
                  <TableRow key={contrat.id}>
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
                ))}
              </TableBody>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
