import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Filter, X, Download, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export interface FilterState {
  dateDebut: Date | null;
  dateFin: Date | null;
  programmes: string[];
  modules: string[];
  classes: string[];
}

interface FilterOption {
  id: string;
  label: string;
}

interface StagiairesFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  filteredCount: number;
  totalCount: number;
}

export default function StagiairesFilters({
  filters,
  onFiltersChange,
  onExportPDF,
  onExportExcel,
  filteredCount,
  totalCount,
}: StagiairesFiltersProps) {
  const [programmes, setProgrammes] = useState<FilterOption[]>([]);
  const [modules, setModules] = useState<FilterOption[]>([]);
  const [classes, setClasses] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const [progResult, moduleResult, classResult] = await Promise.all([
        supabase.from('programmes').select('id, titre').order('titre'),
        supabase.from('modules').select('id, titre').order('titre'),
        supabase.from('classes').select('id, nom').order('nom'),
      ]);

      if (progResult.data) {
        setProgrammes(progResult.data.map(p => ({ id: p.id, label: p.titre })));
      }
      if (moduleResult.data) {
        setModules(moduleResult.data.map(m => ({ id: m.id, label: m.titre })));
      }
      if (classResult.data) {
        setClasses(classResult.data.map(c => ({ id: c.id, label: c.nom })));
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProgrammeToggle = (id: string) => {
    const newProgrammes = filters.programmes.includes(id)
      ? filters.programmes.filter(p => p !== id)
      : [...filters.programmes, id];
    onFiltersChange({ ...filters, programmes: newProgrammes });
  };

  const handleModuleToggle = (id: string) => {
    const newModules = filters.modules.includes(id)
      ? filters.modules.filter(m => m !== id)
      : [...filters.modules, id];
    onFiltersChange({ ...filters, modules: newModules });
  };

  const handleClasseToggle = (id: string) => {
    const newClasses = filters.classes.includes(id)
      ? filters.classes.filter(c => c !== id)
      : [...filters.classes, id];
    onFiltersChange({ ...filters, classes: newClasses });
  };

  const clearFilters = () => {
    onFiltersChange({
      dateDebut: null,
      dateFin: null,
      programmes: [],
      modules: [],
      classes: [],
    });
  };

  const hasActiveFilters = filters.dateDebut || filters.dateFin || 
    filters.programmes.length > 0 || filters.modules.length > 0 || filters.classes.length > 0;

  const MultiSelectDropdown = ({
    label,
    options,
    selectedIds,
    onToggle,
  }: {
    label: string;
    options: FilterOption[];
    selectedIds: string[];
    onToggle: (id: string) => void;
  }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredOptions = useMemo(() => {
      if (!searchTerm) return options;
      return options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [options, searchTerm]);

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-between min-w-[150px]">
            <span className="truncate">
              {selectedIds.length > 0 ? `${label} (${selectedIds.length})` : label}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder={`Rechercher ${label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
            />
          </div>
          <ScrollArea className="h-[250px]">
            <div className="p-2 space-y-1">
              {filteredOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun résultat
                </p>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => onToggle(option.id)}
                  >
                    <Checkbox
                      checked={selectedIds.includes(option.id)}
                      onCheckedChange={() => onToggle(option.id)}
                    />
                    <span className="text-sm truncate flex-1">{option.label}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          {selectedIds.length > 0 && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  selectedIds.forEach(id => onToggle(id));
                }}
              >
                Tout désélectionner
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="space-y-4 bg-muted/30 p-4 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Filtres</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">
              {filteredCount} / {totalCount} stagiaires
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Réinitialiser
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Date range */}
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Période:</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal w-[130px]",
                  !filters.dateDebut && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateDebut ? format(filters.dateDebut, "dd/MM/yyyy") : "Début"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateDebut || undefined}
                onSelect={(date) => onFiltersChange({ ...filters, dateDebut: date || null })}
                initialFocus
                locale={fr}
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal w-[130px]",
                  !filters.dateFin && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFin ? format(filters.dateFin, "dd/MM/yyyy") : "Fin"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFin || undefined}
                onSelect={(date) => onFiltersChange({ ...filters, dateFin: date || null })}
                initialFocus
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Multi-select filters */}
        {!loading && (
          <>
            <MultiSelectDropdown
              label="Programme"
              options={programmes}
              selectedIds={filters.programmes}
              onToggle={handleProgrammeToggle}
            />
            <MultiSelectDropdown
              label="Module"
              options={modules}
              selectedIds={filters.modules}
              onToggle={handleModuleToggle}
            />
            <MultiSelectDropdown
              label="Classe"
              options={classes}
              selectedIds={filters.classes}
              onToggle={handleClasseToggle}
            />
          </>
        )}
      </div>

      {/* Selected filters badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.dateDebut && (
            <Badge variant="outline" className="gap-1">
              Depuis: {format(filters.dateDebut, "dd/MM/yyyy")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, dateDebut: null })}
              />
            </Badge>
          )}
          {filters.dateFin && (
            <Badge variant="outline" className="gap-1">
              Jusqu'au: {format(filters.dateFin, "dd/MM/yyyy")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, dateFin: null })}
              />
            </Badge>
          )}
          {filters.programmes.map(id => {
            const prog = programmes.find(p => p.id === id);
            return prog ? (
              <Badge key={id} variant="secondary" className="gap-1">
                {prog.label}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleProgrammeToggle(id)}
                />
              </Badge>
            ) : null;
          })}
          {filters.modules.map(id => {
            const mod = modules.find(m => m.id === id);
            return mod ? (
              <Badge key={id} variant="secondary" className="gap-1">
                {mod.label}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleModuleToggle(id)}
                />
              </Badge>
            ) : null;
          })}
          {filters.classes.map(id => {
            const cls = classes.find(c => c.id === id);
            return cls ? (
              <Badge key={id} variant="secondary" className="gap-1">
                {cls.label}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleClasseToggle(id)}
                />
              </Badge>
            ) : null;
          })}
        </div>
      )}

      {/* Export buttons */}
      <div className="flex gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={onExportExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exporter Excel
        </Button>
        <Button variant="outline" size="sm" onClick={onExportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Exporter PDF
        </Button>
      </div>
    </div>
  );
}
