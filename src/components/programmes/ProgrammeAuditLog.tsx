import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ProgrammeAuditLogProps {
  programmeId: string;
}

export const ProgrammeAuditLog = ({ programmeId }: ProgrammeAuditLogProps) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [programmeId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("programme_audit_log")
        .select(`
          *,
          profiles:modified_by (
            email,
            first_name,
            last_name
          )
        `)
        .eq("programme_id", programmeId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Erreur lors du chargement de l'historique:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "create":
        return "Création";
      case "update":
        return "Modification";
      case "delete":
        return "Suppression";
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "default";
      case "update":
        return "secondary";
      case "delete":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getEntityLabel = (entityType: string) => {
    switch (entityType) {
      case "programme":
        return "Programme";
      case "module":
        return "Module";
      case "classe":
        return "Classe";
      case "cout":
        return "Coût";
      default:
        return entityType;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historique des modifications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des modifications</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucune modification enregistrée
          </p>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-4 p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getActionColor(log.action) as any}>
                        {getActionLabel(log.action)}
                      </Badge>
                      <Badge variant="outline">
                        {getEntityLabel(log.entity_type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {log.description || "Aucune description"}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>
                          {log.profiles?.first_name || log.profiles?.last_name
                            ? `${log.profiles.first_name || ""} ${log.profiles.last_name || ""}`.trim()
                            : log.profiles?.email || "Utilisateur inconnu"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(new Date(log.created_at), "Pp", { locale: fr })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
