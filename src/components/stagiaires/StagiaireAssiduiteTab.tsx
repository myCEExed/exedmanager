import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { QRCodeScanner } from "@/components/assiduite/QRCodeScanner";
import { Clock, Check, X, QrCode, Percent } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AssiduiteRecord {
  id: string;
  date_session: string;
  present: boolean | null;
  retard_minutes: number | null;
  qr_code_scan_time: string | null;
  justification: string | null;
  module: {
    code: string;
    titre: string;
    classe: {
      nom: string;
      programme: {
        titre: string;
      };
    } | null;
  } | null;
}

interface Stats {
  total: number;
  presents: number;
  absents: number;
  retards: number;
}

export function StagiaireAssiduiteTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<AssiduiteRecord[]>([]);
  const [stagiaireId, setStagiaireId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, presents: 0, absents: 0, retards: 0 });

  useEffect(() => {
    if (user) {
      loadStagiaireAndRecords();
    }
  }, [user]);

  const loadStagiaireAndRecords = async () => {
    try {
      const { data: stagiaire } = await supabase
        .from("stagiaires")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!stagiaire) {
        setLoading(false);
        return;
      }

      setStagiaireId(stagiaire.id);
      await loadRecords(stagiaire.id);
    } catch (error) {
      console.error("Error loading stagiaire:", error);
      setLoading(false);
    }
  };

  const loadRecords = async (stgId: string) => {
    try {
      const { data, error } = await supabase
        .from("assiduite")
        .select(`
          id,
          date_session,
          present,
          retard_minutes,
          qr_code_scan_time,
          justification,
          modules (
            code,
            titre,
            classes (
              nom,
              programmes (
                titre
              )
            )
          )
        `)
        .eq("stagiaire_id", stgId)
        .order("date_session", { ascending: false });

      if (error) throw error;

      if (data) {
        const validRecords = data.map(r => ({
          id: r.id,
          date_session: r.date_session,
          present: r.present,
          retard_minutes: r.retard_minutes,
          qr_code_scan_time: r.qr_code_scan_time,
          justification: r.justification,
          module: r.modules ? {
            code: r.modules.code,
            titre: r.modules.titre,
            classe: r.modules.classes ? {
              nom: r.modules.classes.nom,
              programme: {
                titre: r.modules.classes.programmes?.titre || ""
              }
            } : null
          } : null
        }));
        setRecords(validRecords);

        // Calculate stats
        const presents = validRecords.filter(r => r.present === true).length;
        const absents = validRecords.filter(r => r.present === false).length;
        const retards = validRecords.filter(r => r.retard_minutes && r.retard_minutes > 0).length;

        setStats({
          total: validRecords.length,
          presents,
          absents,
          retards
        });
      }
    } catch (error) {
      console.error("Error loading assiduite records:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique de présence",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const tauxPresence = stats.total > 0 ? ((stats.presents / stats.total) * 100).toFixed(1) : "0";

  if (loading) {
    return <div className="text-center py-12">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Scanner QR Code */}
      {stagiaireId && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Scanner ma présence
            </CardTitle>
            <CardDescription>
              Scannez le QR code affiché en salle pour enregistrer votre présence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QRCodeScanner 
              stagiaireId={stagiaireId} 
              onSuccess={() => loadRecords(stagiaireId)}
            />
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de présence</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{tauxPresence}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Présences</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.presents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absences</CardTitle>
            <X className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.absents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retards</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.retards}</div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Historique de présence
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucun enregistrement de présence</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((record) => (
                <div 
                  key={record.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <div className="font-medium">{record.module?.titre || "Module"}</div>
                    <div className="text-sm text-muted-foreground">
                      {record.module?.classe && (
                        <span>{record.module.classe.programme.titre} - {record.module.classe.nom}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(record.date_session), "d MMMM yyyy à HH:mm", { locale: fr })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.present ? (
                      <>
                        <Badge variant="default" className="bg-green-600">
                          <Check className="w-3 h-3 mr-1" />
                          Présent
                        </Badge>
                        {record.retard_minutes && record.retard_minutes > 0 && (
                          <Badge variant="outline" className="text-orange-600">
                            +{record.retard_minutes} min
                          </Badge>
                        )}
                      </>
                    ) : (
                      <Badge variant="destructive">
                        <X className="w-3 h-3 mr-1" />
                        Absent
                      </Badge>
                    )}
                    {record.justification && (
                      <Badge variant="outline">Justifié</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
