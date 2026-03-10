import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Users, 
  Car, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingDown,
  Route,
  Timer,
  Loader2
} from "lucide-react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { LocationInput, calculateRoute, geocodeAddress } from "./LocationInput";

interface TransferNeed {
  id: string;
  enseignant_id: string;
  enseignant_nom: string;
  enseignant_prenom: string;
  date_transfert: string;
  heure_souhaitee: string;
  lieu_depart: string;
  lieu_arrivee: string;
  lat_depart?: number;
  lon_depart?: number;
  lat_arrivee?: number;
  lon_arrivee?: number;
  distance_km?: number;
  duration_minutes?: number;
  tolerance_minutes: number;
  selected: boolean;
}

interface Vehicule {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
  capacite: number;
  statut: string;
}

interface Chauffeur {
  id: string;
  nom: string;
  prenom: string;
  disponible: boolean;
}

interface OptimizedGroup {
  id: string;
  needs: TransferNeed[];
  lieu_depart: string;
  lieu_arrivee: string;
  date_transfert: string;
  heure_depart: string;
  distance_km?: number;
  duration_minutes?: number;
  vehicule_suggere?: Vehicule;
  chauffeur_suggere?: Chauffeur;
  economie_trajets: number;
}

interface Enseignant {
  id: string;
  nom: string;
  prenom: string;
  pays_residence: string | null;
}

export const TransfertOptimizer = () => {
  const { toast } = useToast();
  const [needs, setNeeds] = useState<TransferNeed[]>([]);
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [optimizedGroups, setOptimizedGroups] = useState<OptimizedGroup[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [locationHistory, setLocationHistory] = useState<string[]>([]);
  
  const [newNeed, setNewNeed] = useState({
    enseignant_id: "",
    date_transfert: "",
    heure_souhaitee: "09:00",
    lieu_depart: "",
    lieu_arrivee: "",
    lat_depart: undefined as number | undefined,
    lon_depart: undefined as number | undefined,
    lat_arrivee: undefined as number | undefined,
    lon_arrivee: undefined as number | undefined,
    distance_km: undefined as number | undefined,
    duration_minutes: undefined as number | undefined,
    tolerance_minutes: "60",
  });

  useEffect(() => {
    loadData();
    loadLocationHistory();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [enseignantsRes, vehiculesRes, chauffeursRes] = await Promise.all([
        supabase
          .from("enseignants")
          .select("id, nom, prenom, pays_residence")
          .order("nom"),
        supabase
          .from("vehicules")
          .select("*")
          .eq("statut", "disponible")
          .order("capacite", { ascending: false }),
        supabase
          .from("chauffeurs")
          .select("*")
          .eq("disponible", true)
          .order("nom"),
      ]);

      if (enseignantsRes.error) throw enseignantsRes.error;
      if (vehiculesRes.error) throw vehiculesRes.error;
      if (chauffeursRes.error) throw chauffeursRes.error;

      // Filtrer les enseignants non-résidents au Maroc
      const nonResidents = enseignantsRes.data.filter(
        (e) => !e.pays_residence || e.pays_residence.toLowerCase() !== "maroc"
      );
      
      setEnseignants(nonResidents);
      setVehicules(vehiculesRes.data);
      setChauffeurs(chauffeursRes.data);
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

  const loadLocationHistory = async () => {
    try {
      const { data: transferts } = await supabase
        .from("transferts")
        .select("ville_depart, ville_arrivee")
        .not("ville_depart", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);

      if (transferts) {
        const locations = new Set<string>();
        transferts.forEach((t) => {
          if (t.ville_depart) locations.add(t.ville_depart);
          if (t.ville_arrivee) locations.add(t.ville_arrivee);
        });
        // Ajouter des lieux par défaut fréquents
        const defaultLocations = [
          "Aéroport Mohammed V, Casablanca",
          "Gare Casa-Voyageurs, Casablanca",
          "Hôtel Sofitel Casablanca",
          "Aéroport Marrakech-Menara",
          "Gare Rabat-Ville",
        ];
        defaultLocations.forEach(loc => locations.add(loc));
        setLocationHistory(Array.from(locations));
      }
    } catch (error) {
      console.error("Erreur chargement historique:", error);
    }
  };

  // Calculer la route quand les deux lieux sont renseignés
  const calculateRouteInfo = useCallback(async () => {
    const { lieu_depart, lieu_arrivee, lat_depart, lon_depart, lat_arrivee, lon_arrivee } = newNeed;
    
    if (!lieu_depart || !lieu_arrivee) return;

    setCalculatingRoute(true);
    try {
      let fromCoords = lat_depart && lon_depart ? { lat: lat_depart, lon: lon_depart } : null;
      let toCoords = lat_arrivee && lon_arrivee ? { lat: lat_arrivee, lon: lon_arrivee } : null;

      // Géocoder si nécessaire
      if (!fromCoords) {
        fromCoords = await geocodeAddress(lieu_depart);
        if (fromCoords) {
          setNewNeed(prev => ({ ...prev, lat_depart: fromCoords!.lat, lon_depart: fromCoords!.lon }));
        }
      }
      if (!toCoords) {
        toCoords = await geocodeAddress(lieu_arrivee);
        if (toCoords) {
          setNewNeed(prev => ({ ...prev, lat_arrivee: toCoords!.lat, lon_arrivee: toCoords!.lon }));
        }
      }

      // Calculer la route
      if (fromCoords && toCoords) {
        const routeInfo = await calculateRoute(
          fromCoords.lat,
          fromCoords.lon,
          toCoords.lat,
          toCoords.lon
        );
        if (routeInfo) {
          setNewNeed(prev => ({
            ...prev,
            distance_km: routeInfo.distance_km,
            duration_minutes: routeInfo.duration_minutes,
          }));
        }
      }
    } catch (error) {
      console.error("Erreur calcul route:", error);
    } finally {
      setCalculatingRoute(false);
    }
  }, [newNeed.lieu_depart, newNeed.lieu_arrivee]);

  // Déclencher le calcul quand les lieux changent
  useEffect(() => {
    if (newNeed.lieu_depart && newNeed.lieu_arrivee) {
      const timer = setTimeout(() => {
        calculateRouteInfo();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [newNeed.lieu_depart, newNeed.lieu_arrivee]);

  const addNeed = () => {
    if (!newNeed.enseignant_id || !newNeed.date_transfert || !newNeed.lieu_depart || !newNeed.lieu_arrivee) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    const enseignant = enseignants.find((e) => e.id === newNeed.enseignant_id);
    if (!enseignant) return;

    const need: TransferNeed = {
      id: crypto.randomUUID(),
      enseignant_id: newNeed.enseignant_id,
      enseignant_nom: enseignant.nom,
      enseignant_prenom: enseignant.prenom,
      date_transfert: newNeed.date_transfert,
      heure_souhaitee: newNeed.heure_souhaitee,
      lieu_depart: newNeed.lieu_depart,
      lieu_arrivee: newNeed.lieu_arrivee,
      lat_depart: newNeed.lat_depart,
      lon_depart: newNeed.lon_depart,
      lat_arrivee: newNeed.lat_arrivee,
      lon_arrivee: newNeed.lon_arrivee,
      distance_km: newNeed.distance_km,
      duration_minutes: newNeed.duration_minutes,
      tolerance_minutes: parseInt(newNeed.tolerance_minutes),
      selected: true,
    };

    setNeeds([...needs, need]);
    
    // Ajouter à l'historique
    setLocationHistory(prev => {
      const updated = new Set([newNeed.lieu_depart, newNeed.lieu_arrivee, ...prev]);
      return Array.from(updated).slice(0, 50);
    });

    setAddDialogOpen(false);
    setNewNeed({
      enseignant_id: "",
      date_transfert: newNeed.date_transfert,
      heure_souhaitee: "09:00",
      lieu_depart: "",
      lieu_arrivee: "",
      lat_depart: undefined,
      lon_depart: undefined,
      lat_arrivee: undefined,
      lon_arrivee: undefined,
      distance_km: undefined,
      duration_minutes: undefined,
      tolerance_minutes: "60",
    });

    toast({ title: "Besoin ajouté" });
  };

  const removeNeed = (id: string) => {
    setNeeds(needs.filter((n) => n.id !== id));
  };

  const toggleNeedSelection = (id: string) => {
    setNeeds(
      needs.map((n) => (n.id === id ? { ...n, selected: !n.selected } : n))
    );
  };

  const optimizeTransfers = () => {
    const selectedNeeds = needs.filter((n) => n.selected);
    
    if (selectedNeeds.length < 2) {
      toast({
        title: "Optimisation impossible",
        description: "Sélectionnez au moins 2 besoins de transfert",
        variant: "destructive",
      });
      return;
    }

    // Algorithme de regroupement
    const groups: OptimizedGroup[] = [];
    const processed = new Set<string>();

    // Trier par date et heure
    const sortedNeeds = [...selectedNeeds].sort((a, b) => {
      const dateA = new Date(`${a.date_transfert}T${a.heure_souhaitee}`);
      const dateB = new Date(`${b.date_transfert}T${b.heure_souhaitee}`);
      return dateA.getTime() - dateB.getTime();
    });

    for (const need of sortedNeeds) {
      if (processed.has(need.id)) continue;

      // Trouver les besoins compatibles
      const compatible = sortedNeeds.filter((n) => {
        if (processed.has(n.id) || n.id === need.id) return false;

        // Même date
        if (n.date_transfert !== need.date_transfert) return false;

        // Même destination (ou similaire - basé sur la distance si disponible)
        const sameRoute = 
          n.lieu_depart.toLowerCase() === need.lieu_depart.toLowerCase() &&
          n.lieu_arrivee.toLowerCase() === need.lieu_arrivee.toLowerCase();
        
        if (!sameRoute) return false;

        // Vérifier la tolérance horaire
        const time1 = new Date(`2000-01-01T${need.heure_souhaitee}`);
        const time2 = new Date(`2000-01-01T${n.heure_souhaitee}`);
        const diffMinutes = Math.abs(differenceInMinutes(time1, time2));
        const maxTolerance = Math.min(need.tolerance_minutes, n.tolerance_minutes);

        return diffMinutes <= maxTolerance;
      });

      if (compatible.length > 0) {
        // Créer un groupe
        const groupNeeds = [need, ...compatible];
        groupNeeds.forEach((n) => processed.add(n.id));

        // Calculer l'heure de départ optimale (moyenne)
        const times = groupNeeds.map((n) => {
          const [h, m] = n.heure_souhaitee.split(":").map(Number);
          return h * 60 + m;
        });
        const avgMinutes = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        const optimalHour = Math.floor(avgMinutes / 60);
        const optimalMinute = avgMinutes % 60;
        const heureDepart = `${optimalHour.toString().padStart(2, "0")}:${optimalMinute.toString().padStart(2, "0")}`;

        // Trouver le véhicule adapté
        const vehiculeSuggere = vehicules.find((v) => v.capacite >= groupNeeds.length);

        // Assigner un chauffeur
        const chauffeurSuggere = chauffeurs[groups.length % chauffeurs.length];

        groups.push({
          id: crypto.randomUUID(),
          needs: groupNeeds,
          lieu_depart: need.lieu_depart,
          lieu_arrivee: need.lieu_arrivee,
          date_transfert: need.date_transfert,
          heure_depart: heureDepart,
          distance_km: need.distance_km,
          duration_minutes: need.duration_minutes,
          vehicule_suggere: vehiculeSuggere,
          chauffeur_suggere: chauffeurSuggere,
          economie_trajets: groupNeeds.length - 1,
        });
      } else {
        // Besoin seul, pas de mutualisation possible
        processed.add(need.id);
        
        const vehiculeSuggere = vehicules.find((v) => v.capacite >= 1);
        const chauffeurSuggere = chauffeurs[groups.length % chauffeurs.length];

        groups.push({
          id: crypto.randomUUID(),
          needs: [need],
          lieu_depart: need.lieu_depart,
          lieu_arrivee: need.lieu_arrivee,
          date_transfert: need.date_transfert,
          heure_depart: need.heure_souhaitee,
          distance_km: need.distance_km,
          duration_minutes: need.duration_minutes,
          vehicule_suggere: vehiculeSuggere,
          chauffeur_suggere: chauffeurSuggere,
          economie_trajets: 0,
        });
      }
    }

    setOptimizedGroups(groups);
    setShowResults(true);
  };

  const applyOptimization = async () => {
    setLoading(true);
    try {
      const transfertsToCreate = optimizedGroups.flatMap((group) =>
        group.needs.map((need) => ({
          enseignant_id: need.enseignant_id,
          date_depart: `${group.date_transfert}T${group.heure_depart}:00`,
          ville_depart: group.lieu_depart,
          ville_arrivee: group.lieu_arrivee,
          type_transport: "voiture",
          vehicule_id: group.vehicule_suggere?.id || null,
          chauffeur_id: group.chauffeur_suggere?.id || null,
          statut: "planifie",
          notes: group.needs.length > 1 
            ? `Transfert groupé avec ${group.needs.length - 1} autre(s) enseignant(s) | Distance: ${group.distance_km || 'N/A'} km | Durée estimée: ${group.duration_minutes || 'N/A'} min` 
            : `Distance: ${group.distance_km || 'N/A'} km | Durée estimée: ${group.duration_minutes || 'N/A'} min`,
        }))
      );

      const { error } = await supabase.from("transferts").insert(transfertsToCreate);
      if (error) throw error;

      toast({
        title: "Plan de transfert appliqué",
        description: `${transfertsToCreate.length} transferts créés avec succès`,
      });

      // Réinitialiser
      setNeeds([]);
      setOptimizedGroups([]);
      setShowResults(false);
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

  const totalEconomies = useMemo(() => {
    return optimizedGroups.reduce((sum, g) => sum + g.economie_trajets, 0);
  }, [optimizedGroups]);

  const groupedCount = useMemo(() => {
    return optimizedGroups.filter((g) => g.needs.length > 1).length;
  }, [optimizedGroups]);

  const totalDistance = useMemo(() => {
    return optimizedGroups.reduce((sum, g) => sum + (g.distance_km || 0), 0);
  }, [optimizedGroups]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Optimisation des transferts</h2>
          <p className="text-muted-foreground">
            Mutualisez les trajets pour les enseignants non-résidents au Maroc
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un besoin
            </Button>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nouveau besoin de transfert</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Enseignant *</Label>
                  <Select
                    value={newNeed.enseignant_id}
                    onValueChange={(value) =>
                      setNewNeed({ ...newNeed, enseignant_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un enseignant" />
                    </SelectTrigger>
                    <SelectContent>
                      {enseignants.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nom} {e.prenom}
                          {e.pays_residence && (
                            <span className="text-muted-foreground ml-2">
                              ({e.pays_residence})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={newNeed.date_transfert}
                      onChange={(e) =>
                        setNewNeed({ ...newNeed, date_transfert: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Heure souhaitée *</Label>
                    <Input
                      type="time"
                      value={newNeed.heure_souhaitee}
                      onChange={(e) =>
                        setNewNeed({ ...newNeed, heure_souhaitee: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Lieu de départ *</Label>
                  <LocationInput
                    id="lieu_depart"
                    placeholder="Ex: Aéroport Mohammed V, Casablanca"
                    value={newNeed.lieu_depart}
                    onChange={(value, lat, lon) =>
                      setNewNeed({ 
                        ...newNeed, 
                        lieu_depart: value,
                        lat_depart: lat,
                        lon_depart: lon,
                        distance_km: undefined,
                        duration_minutes: undefined,
                      })
                    }
                    historySuggestions={locationHistory}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Lieu d'arrivée *</Label>
                  <LocationInput
                    id="lieu_arrivee"
                    placeholder="Ex: Hôtel Sofitel, Casablanca"
                    value={newNeed.lieu_arrivee}
                    onChange={(value, lat, lon) =>
                      setNewNeed({ 
                        ...newNeed, 
                        lieu_arrivee: value,
                        lat_arrivee: lat,
                        lon_arrivee: lon,
                        distance_km: undefined,
                        duration_minutes: undefined,
                      })
                    }
                    historySuggestions={locationHistory}
                  />
                </div>

                {/* Affichage distance et temps */}
                {(newNeed.lieu_depart && newNeed.lieu_arrivee) && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {calculatingRoute ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Calcul de l'itinéraire...
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <Route className="h-4 w-4 text-primary" />
                                <span className="font-medium">
                                  {newNeed.distance_km ? `${newNeed.distance_km} km` : "Distance non calculée"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Timer className="h-4 w-4 text-primary" />
                                <span className="font-medium">
                                  {newNeed.duration_minutes 
                                    ? `${Math.floor(newNeed.duration_minutes / 60)}h${newNeed.duration_minutes % 60 > 0 ? ` ${newNeed.duration_minutes % 60}min` : ''}` 
                                    : "Temps non calculé"}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        {!calculatingRoute && !newNeed.distance_km && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={calculateRouteInfo}
                          >
                            Calculer
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  <Label>Tolérance horaire</Label>
                  <Select
                    value={newNeed.tolerance_minutes}
                    onValueChange={(value) =>
                      setNewNeed({ ...newNeed, tolerance_minutes: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">± 30 minutes</SelectItem>
                      <SelectItem value="60">± 1 heure</SelectItem>
                      <SelectItem value="120">± 2 heures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={addNeed}>Ajouter</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {needs.length >= 2 && (
            <Button onClick={optimizeTransfers} variant="default">
              <Sparkles className="h-4 w-4 mr-2" />
              Optimiser
            </Button>
          )}
        </div>
      </div>

      {/* Liste des besoins */}
      {needs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Besoins de transfert ({needs.length})
            </CardTitle>
            <CardDescription>
              Sélectionnez les besoins à inclure dans l'optimisation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Enseignant</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Trajet</TableHead>
                  <TableHead>Distance / Durée</TableHead>
                  <TableHead>Tolérance</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {needs.map((need) => (
                  <TableRow key={need.id}>
                    <TableCell>
                      <Checkbox
                        checked={need.selected}
                        onCheckedChange={() => toggleNeedSelection(need.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {need.enseignant_nom} {need.enseignant_prenom}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(parseISO(need.date_transfert), "dd/MM/yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {need.heure_souhaitee}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 max-w-[200px]">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate" title={`${need.lieu_depart} → ${need.lieu_arrivee}`}>
                          {need.lieu_depart.split(",")[0]} → {need.lieu_arrivee.split(",")[0]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {need.distance_km && (
                          <span className="flex items-center gap-1">
                            <Route className="h-3 w-3" />
                            {need.distance_km} km
                          </span>
                        )}
                        {need.duration_minutes && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Timer className="h-3 w-3" />
                            {Math.floor(need.duration_minutes / 60)}h{need.duration_minutes % 60 > 0 ? ` ${need.duration_minutes % 60}m` : ''}
                          </span>
                        )}
                        {!need.distance_km && !need.duration_minutes && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>± {need.tolerance_minutes} min</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNeed(need.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {needs.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun besoin de transfert</h3>
            <p className="text-muted-foreground text-center mb-4">
              Commencez par ajouter les besoins de transfert des enseignants
              non-résidents au Maroc
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un besoin
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Résultats de l'optimisation */}
      {showResults && optimizedGroups.length > 0 && (
        <div className="space-y-4">
          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Car className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{optimizedGroups.length}</p>
                    <p className="text-muted-foreground">Trajets planifiés</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-100">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{groupedCount}</p>
                    <p className="text-muted-foreground">Trajets mutualisés</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-orange-100">
                    <TrendingDown className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalEconomies}</p>
                    <p className="text-muted-foreground">Trajets économisés</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-100">
                    <Route className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalDistance} km</p>
                    <p className="text-muted-foreground">Distance totale</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Plan optimisé */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Plan de transfert optimisé
              </CardTitle>
              <CardDescription>
                Voici la proposition de mutualisation des trajets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {optimizedGroups.map((group, index) => (
                <Card key={group.id} className={group.needs.length > 1 ? "border-green-200 bg-green-50/50" : ""}>
                  <CardContent className="pt-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={group.needs.length > 1 ? "default" : "secondary"}>
                            Trajet {index + 1}
                          </Badge>
                          {group.needs.length > 1 && (
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                              <Users className="h-3 w-3 mr-1" />
                              {group.needs.length} passagers
                            </Badge>
                          )}
                          {group.distance_km && (
                            <Badge variant="outline">
                              <Route className="h-3 w-3 mr-1" />
                              {group.distance_km} km
                            </Badge>
                          )}
                          {group.duration_minutes && (
                            <Badge variant="outline">
                              <Timer className="h-3 w-3 mr-1" />
                              {Math.floor(group.duration_minutes / 60)}h{group.duration_minutes % 60 > 0 ? `${group.duration_minutes % 60}m` : ''}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-lg font-medium">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[200px]" title={group.lieu_depart}>
                            {group.lieu_depart.split(",")[0]}
                          </span>
                          <ArrowRight className="h-4 w-4" />
                          <span className="truncate max-w-[200px]" title={group.lieu_arrivee}>
                            {group.lieu_arrivee.split(",")[0]}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(parseISO(group.date_transfert), "EEEE dd MMMM yyyy", { locale: fr })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Départ: {group.heure_depart}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-2">
                          {group.needs.map((n) => (
                            <Badge key={n.id} variant="outline">
                              {n.enseignant_nom} {n.enseignant_prenom}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 text-sm">
                        {group.vehicule_suggere && (
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {group.vehicule_suggere.marque} {group.vehicule_suggere.modele}
                              <span className="text-muted-foreground ml-1">
                                ({group.vehicule_suggere.capacite} places)
                              </span>
                            </span>
                          </div>
                        )}
                        {group.chauffeur_suggere && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {group.chauffeur_suggere.nom} {group.chauffeur_suggere.prenom}
                            </span>
                          </div>
                        )}
                        {!group.vehicule_suggere && (
                          <div className="flex items-center gap-2 text-yellow-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>Aucun véhicule disponible</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowResults(false)}>
                  Modifier les besoins
                </Button>
                <Button onClick={applyOptimization} disabled={loading}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {loading ? "Application..." : "Appliquer ce plan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
