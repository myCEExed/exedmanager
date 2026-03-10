import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Module {
  id: string;
  code: string;
  titre: string;
  date_debut: string | null;
  date_fin: string | null;
  classe: {
    nom: string;
    programme: {
      titre: string;
    };
  };
}

interface EnseignantCalendarProps {
  modules: Module[];
}

export function EnseignantCalendar({ modules }: EnseignantCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the first day of week offset (Monday = 0)
  const startDayOfWeek = (monthStart.getDay() + 6) % 7;
  const emptyDays = Array.from({ length: startDayOfWeek }, (_, i) => i);

  const getModulesForDay = (day: Date) => {
    return modules.filter(module => {
      if (!module.date_debut || !module.date_fin) return false;
      const start = startOfDay(parseISO(module.date_debut));
      const end = endOfDay(parseISO(module.date_fin));
      return isWithinInterval(day, { start, end });
    });
  };

  const selectedDayModules = useMemo(() => {
    if (!selectedDate) return [];
    return getModulesForDay(selectedDate);
  }, [selectedDate, modules]);

  const now = new Date();

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Calendrier des formations
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[150px] text-center">
                {format(currentDate, "MMMM yyyy", { locale: fr })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}
            {days.map((day) => {
              const dayModules = getModulesForDay(day);
              const hasModules = dayModules.length > 0;
              const isToday = isSameDay(day, now);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isPast = day < now && !isToday;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "aspect-square p-1 rounded-lg flex flex-col items-center justify-start relative transition-colors",
                    "hover:bg-muted/50",
                    isToday && "ring-2 ring-primary",
                    isSelected && "bg-primary/10",
                    !isSameMonth(day, currentDate) && "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isPast && !hasModules && "text-muted-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {hasModules && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {dayModules.slice(0, 3).map((_, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isPast ? "bg-muted-foreground" : "bg-primary"
                          )}
                        />
                      ))}
                      {dayModules.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{dayModules.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Formation à venir</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              <span>Formation passée</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {selectedDate
              ? format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })
              : "Sélectionnez une date"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {selectedDate ? (
              selectedDayModules.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayModules.map((module) => {
                    const isPast = module.date_fin && new Date(module.date_fin) < now;
                    return (
                      <div
                        key={module.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          isPast ? "bg-muted/50" : "bg-primary/5 border-primary/20"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{module.titre}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {module.classe.programme.titre}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {module.classe.nom}
                            </p>
                          </div>
                          <Badge variant={isPast ? "secondary" : "default"} className="shrink-0">
                            {isPast ? "Passé" : "À venir"}
                          </Badge>
                        </div>
                        {module.date_debut && module.date_fin && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(parseISO(module.date_debut), "d MMM", { locale: fr })} - {format(parseISO(module.date_fin), "d MMM yyyy", { locale: fr })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune formation ce jour</p>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Cliquez sur une date pour voir les formations</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
