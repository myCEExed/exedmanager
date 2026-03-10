import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, X, ChevronDown } from "lucide-react";
import { SOURCES_OPTIONS, getSourceLabel } from "./ProspectSourcesSelect";

interface Programme {
  id: string;
  titre: string;
  code: string;
}

interface ModuleCatalogue {
  id: string;
  titre: string;
}

interface ProspectFiltersProps {
  prospects: any[];
  filters: {
    sources: string[];
    entreprises: string[];
    postes: string[];
    thematiques: string[];
    programmeIds: string[];
    moduleIds: string[];
    niveauxInteret: string[];
    isDown: boolean | null;
  };
  onFiltersChange: (filters: ProspectFiltersProps["filters"]) => void;
  onClearFilters: () => void;
}

const NIVEAU_INTERET_OPTIONS = [
  { value: "non_defini", label: "Non défini" },
  { value: "peu_interesse", label: "Peu intéressé" },
  { value: "moyennement_interesse", label: "Moyennement intéressé" },
  { value: "tres_interesse", label: "Très intéressé" },
];

export const ProspectFilters = ({
  prospects,
  filters,
  onFiltersChange,
  onClearFilters,
}: ProspectFiltersProps) => {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [modules, setModules] = useState<ModuleCatalogue[]>([]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [entreprisesOpen, setEntreprisesOpen] = useState(false);
  const [postesOpen, setPostesOpen] = useState(false);
  const [thematiquesOpen, setThematiquesOpen] = useState(false);
  const [programmesOpen, setProgrammesOpen] = useState(false);
  const [modulesOpen, setModulesOpen] = useState(false);
  const [niveauxInteretOpen, setNiveauxInteretOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [programmesRes, modulesRes] = await Promise.all([
      supabase.from("programmes").select("id, titre, code").order("titre"),
      supabase.from("module_catalogue").select("id, titre").order("titre"),
    ]);

    if (programmesRes.data) setProgrammes(programmesRes.data);
    if (modulesRes.data) setModules(modulesRes.data);
  };

  // Extract unique values from prospects
  const uniqueEntreprises = useMemo(() => {
    const set = new Set<string>();
    prospects.forEach((p) => {
      if (p.entreprise) set.add(p.entreprise);
    });
    return Array.from(set).sort();
  }, [prospects]);

  const uniquePostes = useMemo(() => {
    const set = new Set<string>();
    prospects.forEach((p) => {
      if (p.poste) set.add(p.poste);
    });
    return Array.from(set).sort();
  }, [prospects]);

  const uniqueThematiques = useMemo(() => {
    const set = new Set<string>();
    prospects.forEach((p) => {
      if (p.interet_thematiques) {
        p.interet_thematiques.forEach((t: string) => set.add(t));
      }
    });
    return Array.from(set).sort();
  }, [prospects]);

  const toggleFilter = (
    filterKey: keyof ProspectFiltersProps["filters"],
    value: string
  ) => {
    const currentValues = filters[filterKey] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    onFiltersChange({ ...filters, [filterKey]: newValues });
  };

  const hasActiveFilters =
    filters.sources.length > 0 ||
    filters.entreprises.length > 0 ||
    filters.postes.length > 0 ||
    filters.thematiques.length > 0 ||
    filters.programmeIds.length > 0 ||
    filters.moduleIds.length > 0 ||
    filters.niveauxInteret.length > 0 ||
    filters.isDown !== null;

  const renderMultiSelect = (
    label: string,
    options: { value: string; label: string }[],
    selectedValues: string[],
    filterKey: keyof ProspectFiltersProps["filters"],
    isOpen: boolean,
    setIsOpen: (open: boolean) => void
  ) => (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-1 ${selectedValues.length > 0 ? "border-primary" : ""}`}
        >
          {label}
          {selectedValues.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1">
              {selectedValues.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Rechercher...`} />
          <CommandList>
            <CommandEmpty>Aucun résultat</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-[200px]">
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggleFilter(filterKey, option.value)}
                  >
                    <Checkbox
                      checked={selectedValues.includes(option.value)}
                      className="mr-2 pointer-events-none"
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        
        {renderMultiSelect(
          "Origine",
          SOURCES_OPTIONS,
          filters.sources,
          "sources",
          sourcesOpen,
          setSourcesOpen
        )}

        {renderMultiSelect(
          "Entreprise",
          uniqueEntreprises.map((e) => ({ value: e, label: e })),
          filters.entreprises,
          "entreprises",
          entreprisesOpen,
          setEntreprisesOpen
        )}

        {renderMultiSelect(
          "Poste",
          uniquePostes.map((p) => ({ value: p, label: p })),
          filters.postes,
          "postes",
          postesOpen,
          setPostesOpen
        )}

        {renderMultiSelect(
          "Thématique",
          uniqueThematiques.map((t) => ({ value: t, label: t })),
          filters.thematiques,
          "thematiques",
          thematiquesOpen,
          setThematiquesOpen
        )}

        {renderMultiSelect(
          "Programme",
          programmes.map((p) => ({ value: p.id, label: `[${p.code}] ${p.titre}` })),
          filters.programmeIds,
          "programmeIds",
          programmesOpen,
          setProgrammesOpen
        )}

        {renderMultiSelect(
          "Module",
          modules.map((m) => ({ value: m.id, label: m.titre })),
          filters.moduleIds,
          "moduleIds",
          modulesOpen,
          setModulesOpen
        )}

        {renderMultiSelect(
          "Niveau d'intérêt",
          NIVEAU_INTERET_OPTIONS,
          filters.niveauxInteret,
          "niveauxInteret",
          niveauxInteretOpen,
          setNiveauxInteretOpen
        )}

        <Button
          variant={filters.isDown === true ? "default" : "outline"}
          size="sm"
          onClick={() => {
            const newValue = filters.isDown === true ? null : true;
            onFiltersChange({ ...filters, isDown: newValue });
          }}
        >
          Perdus
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Effacer
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1">
          {filters.sources.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1">
              {getSourceLabel(s)}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFilter("sources", s)} />
            </Badge>
          ))}
          {filters.entreprises.map((e) => (
            <Badge key={e} variant="secondary" className="gap-1">
              {e}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFilter("entreprises", e)} />
            </Badge>
          ))}
          {filters.postes.map((p) => (
            <Badge key={p} variant="secondary" className="gap-1">
              {p}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFilter("postes", p)} />
            </Badge>
          ))}
          {filters.thematiques.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1">
              {t}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFilter("thematiques", t)} />
            </Badge>
          ))}
          {filters.programmeIds.map((id) => {
            const prog = programmes.find((p) => p.id === id);
            return prog ? (
              <Badge key={id} variant="secondary" className="gap-1">
                {prog.titre}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFilter("programmeIds", id)} />
              </Badge>
            ) : null;
          })}
          {filters.moduleIds.map((id) => {
            const mod = modules.find((m) => m.id === id);
            return mod ? (
              <Badge key={id} variant="secondary" className="gap-1">
                {mod.titre}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFilter("moduleIds", id)} />
              </Badge>
            ) : null;
          })}
          {filters.niveauxInteret.map((n) => {
            const option = NIVEAU_INTERET_OPTIONS.find((o) => o.value === n);
            return option ? (
              <Badge key={n} variant="secondary" className="gap-1">
                {option.label}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFilter("niveauxInteret", n)} />
              </Badge>
            ) : null;
          })}
          {filters.isDown === true && (
            <Badge variant="secondary" className="gap-1">
              Perdus
              <X className="h-3 w-3 cursor-pointer" onClick={() => onFiltersChange({ ...filters, isDown: null })} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
