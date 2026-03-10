import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Percent, DollarSign, User, Building2, Users, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Stagiaire {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

interface Client {
  id: string;
  nom: string;
  code: string;
}

interface ConvertDevisToBCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devis: any;
  onConvert: (config: BCConversionConfig) => Promise<void>;
  clients: Client[];
}

export interface BCConversionConfig {
  mode: "single_client" | "single_stagiaire" | "split";
  clientId?: string;
  stagiaireId?: string;
  splitConfig?: {
    stagiaireId: string;
    clientId: string;
    splitMode: "pourcentage" | "montant_fixe";
    stagiaireValue: number; // pourcentage ou montant fixe
    clientValue: number; // calculé automatiquement
  };
}

export function ConvertDevisToBCDialog({ 
  open, 
  onOpenChange, 
  devis, 
  onConvert,
  clients 
}: ConvertDevisToBCDialogProps) {
  const [mode, setMode] = useState<"single_client" | "single_stagiaire" | "split">("single_client");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedStagiaire, setSelectedStagiaire] = useState<string>("");
  const [splitMode, setSplitMode] = useState<"pourcentage" | "montant_fixe">("pourcentage");
  const [stagiaireValue, setStagiaireValue] = useState<number>(50);
  const [stagiaires, setStagiaires] = useState<Stagiaire[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStagiaires, setLoadingStagiaires] = useState(false);

  const montantTotal = parseFloat(devis?.montant_total || 0);

  useEffect(() => {
    if (open) {
      loadStagiaires();
      // Pre-select client if available
      if (devis?.client_id) {
        setSelectedClient(devis.client_id);
      }
    }
  }, [open, devis]);

  const loadStagiaires = async () => {
    setLoadingStagiaires(true);
    try {
      const { data, error } = await supabase
        .from("stagiaires")
        .select("id, nom, prenom, email")
        .order("nom");
      
      if (error) throw error;
      setStagiaires(data || []);
    } catch (error) {
      console.error("Error loading stagiaires:", error);
    } finally {
      setLoadingStagiaires(false);
    }
  };

  const calculateClientValue = () => {
    if (splitMode === "pourcentage") {
      return 100 - stagiaireValue;
    } else {
      return montantTotal - stagiaireValue;
    }
  };

  const calculateMontants = () => {
    if (splitMode === "pourcentage") {
      const montantStagiaire = (montantTotal * stagiaireValue) / 100;
      const montantClient = montantTotal - montantStagiaire;
      return { montantStagiaire, montantClient };
    } else {
      const montantStagiaire = stagiaireValue;
      const montantClient = montantTotal - stagiaireValue;
      return { montantStagiaire, montantClient };
    }
  };

  const { montantStagiaire, montantClient } = calculateMontants();

  const isValid = () => {
    if (mode === "single_client") {
      return !!selectedClient;
    }
    if (mode === "single_stagiaire") {
      return !!selectedStagiaire;
    }
    if (mode === "split") {
      if (!selectedStagiaire || !selectedClient) return false;
      if (splitMode === "pourcentage" && (stagiaireValue < 0 || stagiaireValue > 100)) return false;
      if (splitMode === "montant_fixe" && (stagiaireValue < 0 || stagiaireValue > montantTotal)) return false;
      return true;
    }
    return false;
  };

  const handleSubmit = async () => {
    if (!isValid()) return;

    setLoading(true);
    try {
      const config: BCConversionConfig = { mode };

      if (mode === "single_client") {
        config.clientId = selectedClient;
      } else if (mode === "single_stagiaire") {
        config.stagiaireId = selectedStagiaire;
      } else {
        config.splitConfig = {
          stagiaireId: selectedStagiaire,
          clientId: selectedClient,
          splitMode,
          stagiaireValue,
          clientValue: calculateClientValue(),
        };
      }

      await onConvert(config);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error converting:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMode("single_client");
    setSelectedClient(devis?.client_id || "");
    setSelectedStagiaire("");
    setSplitMode("pourcentage");
    setStagiaireValue(50);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Créer le(s) Bon(s) de Commande</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Montant total du devis */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Montant total du devis</p>
              <p className="text-2xl font-bold">{montantTotal.toFixed(2)} €</p>
              <p className="text-sm text-muted-foreground">N° {devis?.numero_devis}</p>
            </div>

            {/* Mode de répartition */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Mode de prise en charge</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="single_client" id="single_client" />
                  <Label htmlFor="single_client" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Tiers payant uniquement</p>
                      <p className="text-sm text-muted-foreground">Un client/entreprise prend en charge la totalité</p>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="single_stagiaire" id="single_stagiaire" />
                  <Label htmlFor="single_stagiaire" className="flex items-center gap-2 cursor-pointer flex-1">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Stagiaire uniquement</p>
                      <p className="text-sm text-muted-foreground">Le stagiaire prend en charge la totalité</p>
                    </div>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="split" id="split" />
                  <Label htmlFor="split" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Répartition mixte</p>
                      <p className="text-sm text-muted-foreground">Partage entre un stagiaire et un tiers payant</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Configuration selon le mode */}
            {mode === "single_client" && (
              <div className="space-y-3 p-4 border rounded-lg">
                <Label>Sélectionner le client (tiers payant)</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nom} ({client.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === "single_stagiaire" && (
              <div className="space-y-3 p-4 border rounded-lg">
                <Label>Sélectionner le stagiaire</Label>
                <Select value={selectedStagiaire} onValueChange={setSelectedStagiaire}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un stagiaire..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stagiaires.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.prenom} {s.nom} ({s.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === "split" && (
              <div className="space-y-4 p-4 border rounded-lg">
                {/* Sélection des parties */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stagiaire</Label>
                    <Select value={selectedStagiaire} onValueChange={setSelectedStagiaire}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un stagiaire..." />
                      </SelectTrigger>
                      <SelectContent>
                        {stagiaires.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.prenom} {s.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tiers payant (client)</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Mode de répartition */}
                <div className="space-y-3">
                  <Label>Mode de répartition</Label>
                  <RadioGroup 
                    value={splitMode} 
                    onValueChange={(v) => {
                      setSplitMode(v as typeof splitMode);
                      setStagiaireValue(v === "pourcentage" ? 50 : montantTotal / 2);
                    }}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pourcentage" id="pourcentage" />
                      <Label htmlFor="pourcentage" className="flex items-center gap-1 cursor-pointer">
                        <Percent className="h-4 w-4" /> En pourcentage
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="montant_fixe" id="montant_fixe" />
                      <Label htmlFor="montant_fixe" className="flex items-center gap-1 cursor-pointer">
                        <DollarSign className="h-4 w-4" /> En montant fixe
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Valeur pour le stagiaire */}
                <div className="space-y-2">
                  <Label>Part prise en charge par le stagiaire</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={stagiaireValue}
                      onChange={(e) => setStagiaireValue(parseFloat(e.target.value) || 0)}
                      min={0}
                      max={splitMode === "pourcentage" ? 100 : montantTotal}
                      step={splitMode === "pourcentage" ? 1 : 0.01}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">
                      {splitMode === "pourcentage" ? "%" : "€"}
                    </span>
                    {splitMode === "pourcentage" && (
                      <span className="text-sm text-muted-foreground">
                        = {montantStagiaire.toFixed(2)} €
                      </span>
                    )}
                  </div>
                </div>

                {/* Récapitulatif de la répartition */}
                <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
                  <p className="font-medium text-sm">Récapitulatif de la répartition</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-2 bg-background rounded border">
                      <p className="text-muted-foreground">BC Stagiaire</p>
                      <p className="font-bold text-lg">{montantStagiaire.toFixed(2)} €</p>
                      {splitMode === "pourcentage" && (
                        <p className="text-muted-foreground text-xs">{stagiaireValue}%</p>
                      )}
                    </div>
                    <div className="p-2 bg-background rounded border">
                      <p className="text-muted-foreground">BC Tiers payant</p>
                      <p className="font-bold text-lg">{montantClient.toFixed(2)} €</p>
                      {splitMode === "pourcentage" && (
                        <p className="text-muted-foreground text-xs">{100 - stagiaireValue}%</p>
                      )}
                    </div>
                  </div>
                </div>

                {montantClient < 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Le montant du stagiaire ne peut pas dépasser le total du devis
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Info sur ce qui sera créé */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {mode === "split" ? (
                  <span>Deux bons de commande seront créés, un pour chaque partie prenante.</span>
                ) : (
                  <span>Un seul bon de commande sera créé pour le montant total.</span>
                )}
              </AlertDescription>
            </Alert>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid() || loading}>
            {loading ? "Création..." : mode === "split" ? "Créer les 2 BC" : "Créer le BC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}