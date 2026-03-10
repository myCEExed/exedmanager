import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { TrendingUp, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TauxChange {
  id: string;
  taux_eur_to_mad: number;
  date_application: string;
  notes: string | null;
  created_at: string;
}

export function ExchangeRateManager() {
  const { toast } = useToast();
  const { exchangeRate, refreshExchangeRate } = useCurrency();
  const [rates, setRates] = useState<TauxChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    taux_eur_to_mad: "",
    date_application: new Date().toISOString().split('T')[0],
    notes: "",
  });

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      const { data, error } = await supabase
        .from("taux_change")
        .select("*")
        .order("date_application", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRates(data || []);
    } catch (error) {
      console.error("Error loading exchange rates:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const taux = parseFloat(formData.taux_eur_to_mad);
      
      if (isNaN(taux) || taux <= 0) {
        toast({
          title: "Erreur",
          description: "Le taux de change doit être un nombre positif",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("taux_change").insert([
        {
          taux_eur_to_mad: taux,
          date_application: formData.date_application,
          notes: formData.notes || null,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Taux de change enregistré",
      });

      setFormData({
        taux_eur_to_mad: "",
        date_application: new Date().toISOString().split('T')[0],
        notes: "",
      });
      setIsDialogOpen(false);
      await loadRates();
      await refreshExchangeRate();
    } catch (error: any) {
      console.error("Error creating exchange rate:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer le taux de change",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Taux de Change EUR/MAD
            </CardTitle>
            <CardDescription>
              Taux actuel: 1 EUR = {exchangeRate.toFixed(4)} MAD
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau taux
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Définir un nouveau taux de change</DialogTitle>
                <DialogDescription>
                  Enregistrez un nouveau taux EUR/MAD
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="taux">Taux EUR vers MAD *</Label>
                  <Input
                    id="taux"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formData.taux_eur_to_mad}
                    onChange={(e) =>
                      setFormData({ ...formData, taux_eur_to_mad: e.target.value })
                    }
                    placeholder="10.8000"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    1 EUR = X MAD
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date d'application *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date_application}
                    onChange={(e) =>
                      setFormData({ ...formData, date_application: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Commentaires optionnels..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
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
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Historique récent</h4>
          {rates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun historique</p>
          ) : (
            <div className="space-y-2">
              {rates.map((rate) => (
                <div
                  key={rate.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      1 EUR = {Number(rate.taux_eur_to_mad).toFixed(4)} MAD
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Applicable le{" "}
                      {format(new Date(rate.date_application), "d MMMM yyyy", {
                        locale: fr,
                      })}
                    </div>
                    {rate.notes && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {rate.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
