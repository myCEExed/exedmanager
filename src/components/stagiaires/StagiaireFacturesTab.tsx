import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Facture {
  id: string;
  numero_facture: string;
  date_emission: string;
  date_echeance: string;
  montant_total: number;
  montant_paye: number | null;
  statut: string | null;
  classe: {
    nom: string;
    programme: {
      titre: string;
      code: string;
    };
  } | null;
}

export function StagiaireFacturesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFactures();
    }
  }, [user]);

  const loadFactures = async () => {
    try {
      const { data: stagiaire } = await supabase
        .from("stagiaires")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!stagiaire) {
        setLoading(false);
        return;
      }

      // Get invoices where the stagiaire is the payer (INTER programs only)
      const { data, error } = await supabase
        .from("factures")
        .select(`
          id,
          numero_facture,
          date_emission,
          date_echeance,
          montant_total,
          montant_paye,
          statut,
          classes (
            nom,
            programmes (
              titre,
              code
            )
          )
        `)
        .eq("stagiaire_id", stagiaire.id)
        .order("date_emission", { ascending: false });

      if (error) throw error;

      if (data) {
        const validFactures = data.map(f => ({
          id: f.id,
          numero_facture: f.numero_facture,
          date_emission: f.date_emission,
          date_echeance: f.date_echeance,
          montant_total: f.montant_total,
          montant_paye: f.montant_paye,
          statut: f.statut,
          classe: f.classes ? {
            nom: f.classes.nom,
            programme: f.classes.programmes ? {
              titre: f.classes.programmes.titre,
              code: f.classes.programmes.code
            } : { titre: "Programme", code: "" }
          } : null
        }));
        setFactures(validFactures);
      }
    } catch (error) {
      console.error("Error loading factures:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les factures",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatutPaiement = (facture: Facture) => {
    const montantPaye = facture.montant_paye || 0;
    const montantTotal = facture.montant_total;
    const pourcentage = (montantPaye / montantTotal) * 100;

    if (montantPaye >= montantTotal) {
      return { label: "Payée", variant: "default" as const, className: "bg-green-600", icon: CheckCircle };
    } else if (montantPaye > 0) {
      return { label: `Partiel (${pourcentage.toFixed(0)}%)`, variant: "outline" as const, className: "text-orange-600 border-orange-600", icon: CreditCard };
    } else if (new Date(facture.date_echeance) < new Date()) {
      return { label: "En retard", variant: "destructive" as const, className: "", icon: AlertCircle };
    } else {
      return { label: "En attente", variant: "secondary" as const, className: "", icon: CreditCard };
    }
  };

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  if (factures.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucune facture à afficher</p>
          <p className="text-sm text-muted-foreground mt-2">
            Seules les factures des formations INTER où vous êtes le payeur direct apparaissent ici
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary
  const totalFacture = factures.reduce((acc, f) => acc + f.montant_total, 0);
  const totalPaye = factures.reduce((acc, f) => acc + (f.montant_paye || 0), 0);
  const totalRestant = totalFacture - totalPaye;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total facturé</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFacture.toLocaleString()} MAD</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total payé</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalPaye.toLocaleString()} MAD</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reste à payer</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalRestant.toLocaleString()} MAD</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices list */}
      <div className="space-y-4">
        {factures.map((facture) => {
          const statut = getStatutPaiement(facture);
          const Icon = statut.icon;

          return (
            <Card key={facture.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {facture.numero_facture}
                    </CardTitle>
                    <CardDescription>
                      {facture.classe?.programme.titre} - {facture.classe?.nom}
                    </CardDescription>
                  </div>
                  <Badge variant={statut.variant} className={statut.className}>
                    <Icon className="h-3 w-3 mr-1" />
                    {statut.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Émission:</span>
                    <span className="ml-2 font-medium">
                      {format(new Date(facture.date_emission), "d MMM yyyy", { locale: fr })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Échéance:</span>
                    <span className="ml-2 font-medium">
                      {format(new Date(facture.date_echeance), "d MMM yyyy", { locale: fr })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Montant:</span>
                    <span className="ml-2 font-medium">{facture.montant_total.toLocaleString()} MAD</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payé:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {(facture.montant_paye || 0).toLocaleString()} MAD
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
