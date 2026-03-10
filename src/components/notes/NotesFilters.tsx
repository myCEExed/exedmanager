import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

interface Programme {
  id: string;
  titre: string;
  code: string;
}

interface Classe {
  id: string;
  nom: string;
  sous_code: string;
  programme_id: string;
}

interface Stagiaire {
  id: string;
  nom: string;
  prenom: string;
}

interface NotesFiltersProps {
  programmes: Programme[];
  classes: Classe[];
  stagiaires: Stagiaire[];
  selectedProgramme: string;
  selectedClasse: string;
  selectedStagiaire: string;
  onProgrammeChange: (value: string) => void;
  onClasseChange: (value: string) => void;
  onStagiaireChange: (value: string) => void;
  onClearFilters: () => void;
}

export function NotesFilters({
  programmes,
  classes,
  stagiaires,
  selectedProgramme,
  selectedClasse,
  selectedStagiaire,
  onProgrammeChange,
  onClasseChange,
  onStagiaireChange,
  onClearFilters,
}: NotesFiltersProps) {
  const filteredClasses = selectedProgramme && selectedProgramme !== "all"
    ? classes.filter((c) => c.programme_id === selectedProgramme)
    : classes;

  const hasActiveFilters = (selectedProgramme && selectedProgramme !== "all") ||
    (selectedClasse && selectedClasse !== "all") ||
    (selectedStagiaire && selectedStagiaire !== "all");

  return (
    <div className="flex flex-wrap gap-3 items-center p-4 bg-muted/30 rounded-lg">
      <Filter className="h-4 w-4 text-muted-foreground" />
      
      <Select value={selectedProgramme} onValueChange={onProgrammeChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Programme" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les programmes</SelectItem>
          {programmes.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.code} - {p.titre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedClasse} onValueChange={onClasseChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Classe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les classes</SelectItem>
          {filteredClasses.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.sous_code} - {c.nom}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedStagiaire} onValueChange={onStagiaireChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Stagiaire" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les stagiaires</SelectItem>
          {stagiaires.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.prenom} {s.nom}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="h-4 w-4 mr-1" />
          Effacer
        </Button>
      )}
    </div>
  );
}
