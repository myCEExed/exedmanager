import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarViewType = "day" | "week" | "month" | "quarter" | "semester" | "year";

interface CalendarViewSelectorProps {
  value: CalendarViewType;
  onChange: (view: CalendarViewType) => void;
}

const views: { value: CalendarViewType; label: string }[] = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "quarter", label: "Trimestre" },
  { value: "semester", label: "Semestre" },
  { value: "year", label: "Année" },
];

export const CalendarViewSelector = ({ value, onChange }: CalendarViewSelectorProps) => {
  return (
    <div className="flex items-center rounded-lg border bg-muted/30 p-1 gap-0.5">
      {views.map((view) => (
        <Button
          key={view.value}
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2.5 text-xs font-medium transition-all",
            value === view.value
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
          onClick={() => onChange(view.value)}
        >
          {view.label}
        </Button>
      ))}
    </div>
  );
};
