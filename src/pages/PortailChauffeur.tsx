import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Car, MapPin, Clock, User, Phone, CalendarDays, List, Mail, ChevronRight, ChevronLeft, Filter, History } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, isBefore, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface Transfert {
  id: string;
  date_depart: string;
  date_retour?: string;
  ville_depart: string;
  ville_arrivee: string;
  type_transport: string;
  statut: string;
  notes?: string;
  enseignants?: { nom: string; prenom: string; telephone?: string; email?: string };
  hotels?: { nom: string; ville: string };
  vehicules?: { marque: string; modele: string; immatriculation: string };
}

interface ChauffeurProfile {
  id: string;
  nom: string;
  prenom: string;
  telephone?: string;
  email?: string;
}

const ITEMS_PER_PAGE = 10;

const PortailChauffeur = () => {
  const { user } = useAuth();
  const [transferts, setTransferts] = useState<Transfert[]>([]);
  const [chauffeur, setChauffeur] = useState<ChauffeurProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("semaine");
  const [selectedTransfert, setSelectedTransfert] = useState<Transfert | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  useEffect(() => {
    if (user) {
      loadChauffeurData();
    }
  }, [user]);

  const loadChauffeurData = async () => {
    try {
      // Charger le profil du chauffeur
      const { data: chauffeurData, error: chauffeurError } = await supabase
        .from("chauffeurs")
        .select("id, nom, prenom, telephone, email")
        .eq("user_id", user?.id)
        .single();

      if (chauffeurError) throw chauffeurError;
      setChauffeur(chauffeurData);

      // Charger les transferts assignés
      const { data: transfertsData, error: transfertsError } = await supabase
        .from("transferts")
        .select(`
          id,
          date_depart,
          date_retour,
          ville_depart,
          ville_arrivee,
          type_transport,
          statut,
          notes,
          enseignants(nom, prenom, telephone, email),
          hotels(nom, ville),
          vehicules(marque, modele, immatriculation)
        `)
        .eq("chauffeur_id", chauffeurData.id)
        .order("date_depart", { ascending: true });

      if (transfertsError) throw transfertsError;
      setTransferts(transfertsData || []);
    } catch (error) {
      console.error("Error loading chauffeur data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTransferts = useMemo(() => {
    const now = new Date();
    let filtered = transferts;
    
    switch (activeTab) {
      case "semaine":
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        filtered = transferts.filter(t => {
          const date = parseISO(t.date_depart);
          return isWithinInterval(date, { start: weekStart, end: weekEnd });
        });
        break;
      case "mois":
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        filtered = transferts.filter(t => {
          const date = parseISO(t.date_depart);
          return isWithinInterval(date, { start: monthStart, end: monthEnd });
        });
        break;
      case "historique":
        filtered = transferts.filter(t => {
          const date = parseISO(t.date_depart);
          return isBefore(date, startOfDay(now));
        });
        break;
      case "periode":
        if (dateDebut && dateFin) {
          const start = startOfDay(parseISO(dateDebut));
          const end = endOfDay(parseISO(dateFin));
          filtered = transferts.filter(t => {
            const date = parseISO(t.date_depart);
            return isWithinInterval(date, { start, end });
          });
        }
        break;
      case "tous":
      default:
        filtered = transferts;
    }
    
    return filtered;
  }, [transferts, activeTab, dateDebut, dateFin]);

  const totalPages = Math.ceil(getFilteredTransferts.length / ITEMS_PER_PAGE);
  const paginatedTransferts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return getFilteredTransferts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [getFilteredTransferts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, dateDebut, dateFin]);

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      planifie: "outline",
      confirme: "default",
      en_cours: "secondary",
      termine: "default",
      annule: "destructive",
    };
    const labels: Record<string, string> = {
      planifie: "Planifié",
      confirme: "Confirmé",
      en_cours: "En cours",
      termine: "Terminé",
      annule: "Annulé",
    };
    return (
      <Badge variant={variants[statut] || "outline"}>
        {labels[statut] || statut}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!chauffeur) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Accès non configuré</h2>
            <p className="text-muted-foreground text-center">
              Votre compte n'est pas encore lié à un profil chauffeur.
              Veuillez contacter l'administration.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredTransferts = getFilteredTransferts;
  const upcomingTransferts = transferts.filter(
    t => parseISO(t.date_depart) >= new Date() && t.statut !== "annule"
  );

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bienvenue, {chauffeur.prenom}</h1>
          <p className="text-muted-foreground">Consultez vos missions de transfert</p>
        </div>
        <Card className="w-full md:w-auto">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">{chauffeur.nom} {chauffeur.prenom}</p>
              {chauffeur.telephone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {chauffeur.telephone}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Missions cette semaine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transferts.filter(t => {
                const date = parseISO(t.date_depart);
                const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
                const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
                return isWithinInterval(date, { start: weekStart, end: weekEnd });
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Missions à venir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingTransferts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total des missions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transferts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Transferts List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Planning des transferts
              </CardTitle>
              <CardDescription>
                Vos missions de transfert assignées
              </CardDescription>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="semaine" className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Semaine
                </TabsTrigger>
                <TabsTrigger value="mois" className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  Mois
                </TabsTrigger>
                <TabsTrigger value="historique" className="flex items-center gap-1">
                  <History className="h-4 w-4" />
                  Historique
                </TabsTrigger>
                <TabsTrigger value="periode" className="flex items-center gap-1">
                  <Filter className="h-4 w-4" />
                  Période
                </TabsTrigger>
                <TabsTrigger value="tous" className="flex items-center gap-1">
                  <List className="h-4 w-4" />
                  Tous
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {activeTab === "periode" && (
            <div className="flex flex-col sm:flex-row gap-4 mt-4 p-4 bg-muted rounded-lg">
              <div className="flex-1">
                <Label htmlFor="dateDebut" className="text-sm font-medium">Date de début</Label>
                <Input
                  id="dateDebut"
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="dateFin" className="text-sm font-medium">Date de fin</Label>
                <Input
                  id="dateFin"
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="mt-1"
                />
              </div>
              {dateDebut && dateFin && (
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setDateDebut(""); setDateFin(""); }}
                  >
                    Réinitialiser
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredTransferts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun transfert prévu pour cette période</p>
              {activeTab === "periode" && (!dateDebut || !dateFin) && (
                <p className="text-sm mt-2">Veuillez sélectionner une période</p>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4 text-sm text-muted-foreground">
                <span>
                  {filteredTransferts.length} transfert{filteredTransferts.length > 1 ? "s" : ""} trouvé{filteredTransferts.length > 1 ? "s" : ""}
                </span>
                {totalPages > 1 && (
                  <span>
                    Page {currentPage} sur {totalPages}
                  </span>
                )}
              </div>

              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {paginatedTransferts.map((transfert) => (
                    <Card 
                      key={transfert.id} 
                      className="border-l-4 border-l-primary cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => setSelectedTransfert(transfert)}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {format(parseISO(transfert.date_depart), "EEEE d MMMM yyyy", { locale: fr })}
                              </span>
                              <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                              <span>
                                {format(parseISO(transfert.date_depart), "HH:mm")}
                              </span>
                              {getStatutBadge(transfert.statut)}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">{transfert.ville_depart}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-semibold">{transfert.ville_arrivee}</span>
                            </div>

                            {transfert.enseignants && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span>{transfert.enseignants.prenom} {transfert.enseignants.nom}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {transfert.type_transport}
                            </Badge>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
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
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Sheet de détails du transfert */}
      <Sheet open={!!selectedTransfert} onOpenChange={(open) => !open && setSelectedTransfert(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Détails du transfert
            </SheetTitle>
            <SheetDescription>
              {selectedTransfert && format(parseISO(selectedTransfert.date_depart), "EEEE d MMMM yyyy", { locale: fr })}
            </SheetDescription>
          </SheetHeader>

          {selectedTransfert && (
            <div className="mt-6 space-y-6">
              {/* Statut et type */}
              <div className="flex items-center gap-2">
                {getStatutBadge(selectedTransfert.statut)}
                <Badge variant="outline" className="capitalize">
                  {selectedTransfert.type_transport}
                </Badge>
              </div>

              {/* Horaires */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Horaires
                </h4>
                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Départ:</span>{" "}
                    {format(parseISO(selectedTransfert.date_depart), "dd/MM/yyyy à HH:mm")}
                  </p>
                  {selectedTransfert.date_retour && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Retour:</span>{" "}
                      {format(parseISO(selectedTransfert.date_retour), "dd/MM/yyyy à HH:mm")}
                    </p>
                  )}
                </div>
              </div>

              {/* Trajet */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Trajet
                </h4>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <div className="h-8 w-0.5 bg-border"></div>
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <p className="font-medium">{selectedTransfert.ville_depart}</p>
                      <p className="font-medium">{selectedTransfert.ville_arrivee}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passager (Mini fiche enseignant) */}
              {selectedTransfert.enseignants && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Passager
                  </h4>
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">
                          {selectedTransfert.enseignants.prenom} {selectedTransfert.enseignants.nom}
                        </p>
                        <p className="text-sm text-muted-foreground">Enseignant</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {selectedTransfert.enseignants.telephone && (
                        <a 
                          href={`tel:${selectedTransfert.enseignants.telephone}`} 
                          className="flex items-center gap-2 text-sm p-2 bg-background rounded hover:bg-accent transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-4 w-4 text-primary" />
                          <span>{selectedTransfert.enseignants.telephone}</span>
                        </a>
                      )}
                      {selectedTransfert.enseignants.email && (
                        <a 
                          href={`mailto:${selectedTransfert.enseignants.email}`} 
                          className="flex items-center gap-2 text-sm p-2 bg-background rounded hover:bg-accent transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Mail className="h-4 w-4 text-primary" />
                          <span className="truncate">{selectedTransfert.enseignants.email}</span>
                        </a>
                      )}
                      {!selectedTransfert.enseignants.telephone && !selectedTransfert.enseignants.email && (
                        <p className="text-sm text-muted-foreground italic">
                          Aucune coordonnée disponible
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Véhicule */}
              {selectedTransfert.vehicules && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Véhicule
                  </h4>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-medium">
                      {selectedTransfert.vehicules.marque} {selectedTransfert.vehicules.modele}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTransfert.vehicules.immatriculation}
                    </p>
                  </div>
                </div>
              )}

              {/* Hôtel */}
              {selectedTransfert.hotels && (
                <div className="space-y-2">
                  <h4 className="font-medium">🏨 Hôtel</h4>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-medium">{selectedTransfert.hotels.nom}</p>
                    <p className="text-sm text-muted-foreground">{selectedTransfert.hotels.ville}</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedTransfert.notes && (
                <div className="space-y-2">
                  <h4 className="font-medium">📝 Notes</h4>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">{selectedTransfert.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default PortailChauffeur;
