import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Search, X, Users, CheckCircle2 } from "lucide-react";

interface InscriptionFormProps {
  classeId?: string;
  onSuccess: () => void;
}

interface Stagiaire {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

interface Class {
  id: string;
  nom: string;
}

export default function InscriptionForm({ classeId, onSuccess }: InscriptionFormProps) {
  const { toast } = useToast();

  // Normalize: some callers pass "" (empty string)
  const initialClasseId = classeId && classeId.trim().length > 0 ? classeId : undefined;

  const [stagiaires, setStagiaires] = useState<Stagiaire[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedStagiaires, setSelectedStagiaires] = useState<string[]>([]);
  const [selectedClasse, setSelectedClasse] = useState(initialClasseId ?? "");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingInscriptions, setExistingInscriptions] = useState<string[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      await loadStagiaires();
      if (!initialClasseId) {
        await loadClasses();
      }
      setDataLoaded(true);
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClasseId]);

  // Load existing inscriptions when class changes
  useEffect(() => {
    if (!dataLoaded) return;

    const classeToCheck = initialClasseId ?? selectedClasse;
    if (!classeToCheck) {
      setExistingInscriptions([]);
      return;
    }

    loadExistingInscriptions(classeToCheck);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded, initialClasseId, selectedClasse]);

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("id, nom")
        .order("nom");

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error("Error loading classes:", error);
    }
  };

  const loadStagiaires = async () => {
    try {
      const { data, error } = await supabase
        .from("stagiaires")
        .select("id, nom, prenom, email")
        .order("nom");

      if (error) throw error;
      setStagiaires(data || []);
    } catch (error) {
      console.error("Error loading stagiaires:", error);
    }
  };

  const loadExistingInscriptions = async (classeIdToLoad: string) => {
    try {
      const { data, error } = await supabase
        .from("inscriptions")
        .select("stagiaire_id")
        .eq("classe_id", classeIdToLoad);

      if (error) throw error;
      setExistingInscriptions((data || []).map((i) => i.stagiaire_id));
    } catch (error) {
      console.error("Error loading existing inscriptions:", error);
    }
  };

  const filteredStagiaires = useMemo(() => {
    if (!searchTerm.trim()) return stagiaires;

    const search = searchTerm.toLowerCase().trim();
    return stagiaires.filter(
      (s) =>
        s.nom.toLowerCase().includes(search) ||
        s.prenom.toLowerCase().includes(search) ||
        s.email.toLowerCase().includes(search),
    );
  }, [stagiaires, searchTerm]);

  const availableStagiaires = useMemo(() => {
    return filteredStagiaires.filter((s) => !existingInscriptions.includes(s.id));
  }, [filteredStagiaires, existingInscriptions]);

  const selectedStagiairesDetails = useMemo(() => {
    return stagiaires.filter((s) => selectedStagiaires.includes(s.id));
  }, [stagiaires, selectedStagiaires]);

  const toggleStagiaire = useCallback((stagiaireId: string) => {
    setSelectedStagiaires((prev) =>
      prev.includes(stagiaireId) ? prev.filter((id) => id !== stagiaireId) : [...prev, stagiaireId],
    );
  }, []);

  const selectAll = useCallback(() => {
    const availableIds = availableStagiaires.map((s) => s.id);
    setSelectedStagiaires((prev) => {
      const next = new Set(prev);
      availableIds.forEach((id) => next.add(id));
      return Array.from(next);
    });
  }, [availableStagiaires]);

  const deselectAll = useCallback(() => {
    const availableIds = new Set(availableStagiaires.map((s) => s.id));
    setSelectedStagiaires((prev) => prev.filter((id) => !availableIds.has(id)));
  }, [availableStagiaires]);

  const removeStagiaire = useCallback((stagiaireId: string) => {
    setSelectedStagiaires((prev) => prev.filter((id) => id !== stagiaireId));
  }, []);

  const handleClasseChange = useCallback((value: string) => {
    setSelectedClasse(value);
    setSelectedStagiaires([]);
  }, []);

  const handleInscription = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedStagiaires.length === 0) {
      toast({
        title: "Attention",
        description: "Veuillez sélectionner au moins un stagiaire",
        variant: "destructive",
      });
      return;
    }

    const classeIdToUse = initialClasseId ?? selectedClasse;
    if (!classeIdToUse) {
      toast({
        title: "Attention",
        description: "Veuillez sélectionner une classe",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const inscriptions = selectedStagiaires.map((stagiaireId) => ({
        stagiaire_id: stagiaireId,
        classe_id: classeIdToUse,
        statut: "inscrit",
      }));

      const { error } = await supabase.from("inscriptions").insert(inscriptions);

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Erreur",
            description: "Certains stagiaires sont déjà inscrits à cette classe",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Inscription réussie",
        description: `${selectedStagiaires.length} stagiaire(s) inscrit(s) à la classe`,
      });

      setSelectedStagiaires([]);
      setSearchTerm("");
      onSuccess();
    } catch (error) {
      console.error("Error creating inscriptions:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'inscrire les stagiaires",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleInscription} className="space-y-4">
      {/* Classe */}
      {!initialClasseId && (
        <div className="space-y-2">
          <Label htmlFor="classe">Classe *</Label>
          <select
            id="classe"
            value={selectedClasse}
            onChange={(e) => handleClasseChange(e.target.value)}
            required
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="" disabled>
              Choisir une classe
            </option>
            {classes.map((classe) => (
              <option key={classe.id} value={classe.id}>
                {classe.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sélection */}
      {selectedStagiaires.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Stagiaires sélectionnés ({selectedStagiaires.length})
          </Label>
          <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/50 p-3 max-h-32 overflow-auto">
            {selectedStagiairesDetails.map((s) => (
              <Badge key={s.id} variant="secondary" className="flex items-center gap-1 pr-1">
                {s.prenom} {s.nom}
                <button
                  type="button"
                  onClick={() => removeStagiaire(s.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Recherche + liste */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Sélectionner des stagiaires *
        </Label>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher par nom, prénom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {availableStagiaires.length} stagiaire(s) disponible(s)
            {existingInscriptions.length > 0 && <span className="ml-1">({existingInscriptions.length} déjà inscrit(s))</span>}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={selectAll} disabled={availableStagiaires.length === 0}>
              Tout sélectionner
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={deselectAll} disabled={selectedStagiaires.length === 0}>
              Tout désélectionner
            </Button>
          </div>
        </div>

        <div className="h-64 overflow-auto rounded-lg border">
          <div className="p-2 space-y-1">
            {filteredStagiaires.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {searchTerm ? "Aucun stagiaire trouvé pour cette recherche" : "Aucun stagiaire disponible"}
              </div>
            ) : (
              filteredStagiaires.map((stagiaire) => {
                const isEnrolled = existingInscriptions.includes(stagiaire.id);
                const isSelected = selectedStagiaires.includes(stagiaire.id);

                return (
                  <div
                    key={stagiaire.id}
                    className={`
                      flex items-center gap-3 rounded-lg p-3 transition-colors
                      ${isEnrolled
                        ? "bg-muted/30 opacity-60 cursor-not-allowed"
                        : isSelected
                          ? "bg-primary/10 border border-primary/30 cursor-pointer"
                          : "hover:bg-muted/50 cursor-pointer"
                      }
                    `}
                    onClick={() => !isEnrolled && toggleStagiaire(stagiaire.id)}
                    role="button"
                    tabIndex={isEnrolled ? -1 : 0}
                    onKeyDown={(e) => {
                      if (isEnrolled) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleStagiaire(stagiaire.id);
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isEnrolled}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => !isEnrolled && toggleStagiaire(stagiaire.id)}
                      className="h-4 w-4 accent-primary"
                      aria-label={`Sélectionner ${stagiaire.prenom} ${stagiaire.nom}`}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {stagiaire.prenom} {stagiaire.nom}
                      </div>
                      <div className="truncate text-sm text-muted-foreground">{stagiaire.email}</div>
                    </div>

                    {isEnrolled && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        Déjà inscrit
                      </Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <Button type="submit" disabled={loading || selectedStagiaires.length === 0} className="w-full">
        {loading ? (
          "Inscription en cours..."
        ) : (
          <>
            <UserPlus className="mr-2 h-4 w-4" />
            Inscrire {selectedStagiaires.length > 0 ? `${selectedStagiaires.length} stagiaire(s)` : "à la classe"}
          </>
        )}
      </Button>
    </form>
  );
}
