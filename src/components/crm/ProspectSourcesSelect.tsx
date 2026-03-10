import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SOURCES_OPTIONS = [
  { value: "reseaux_sociaux", label: "Réseaux sociaux" },
  { value: "appel_entrant", label: "Appel entrant" },
  { value: "deplacement_site", label: "Déplacement sur site" },
  { value: "autre", label: "Autre" },
];

interface ProspectSourcesSelectProps {
  value: string[];
  onChange: (sources: string[]) => void;
  autreCommentaire?: string;
  onAutreCommentaireChange?: (comment: string) => void;
}

export const ProspectSourcesSelect = ({
  value,
  onChange,
  autreCommentaire = "",
  onAutreCommentaireChange,
}: ProspectSourcesSelectProps) => {
  const [showAutreInput, setShowAutreInput] = useState(value.includes("autre"));

  useEffect(() => {
    setShowAutreInput(value.includes("autre"));
  }, [value]);

  const handleSourceToggle = (sourceValue: string, checked: boolean) => {
    if (checked) {
      onChange([...value, sourceValue]);
    } else {
      onChange(value.filter((v) => v !== sourceValue));
      if (sourceValue === "autre" && onAutreCommentaireChange) {
        onAutreCommentaireChange("");
      }
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Sources / Origine du prospect</Label>
      <div className="grid grid-cols-2 gap-2">
        {SOURCES_OPTIONS.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`source-${option.value}`}
              checked={value.includes(option.value)}
              onCheckedChange={(checked) => handleSourceToggle(option.value, checked as boolean)}
            />
            <Label htmlFor={`source-${option.value}`} className="text-sm font-normal cursor-pointer">
              {option.label}
            </Label>
          </div>
        ))}
      </div>
      {showAutreInput && (
        <Textarea
          placeholder="Précisez la source..."
          value={autreCommentaire}
          onChange={(e) => onAutreCommentaireChange?.(e.target.value)}
          className="mt-2"
          rows={2}
        />
      )}
    </div>
  );
};

export const getSourceLabel = (sourceValue: string) => {
  const option = SOURCES_OPTIONS.find((o) => o.value === sourceValue);
  return option?.label || sourceValue;
};

export { SOURCES_OPTIONS };
