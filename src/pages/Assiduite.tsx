import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QrCode, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AssiduiteFilters } from "@/components/assiduite/AssiduiteFilters";
import { GenerateQRCodeDialog } from "@/components/assiduite/GenerateQRCodeDialog";
import { ManualAttendanceDialog } from "@/components/assiduite/ManualAttendanceDialog";
import { QRCodeViewerDialog } from "@/components/assiduite/QRCodeViewerDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
interface AssiduiteRecord {
  id: string;
  date_session: string;
  present: boolean;
  retard_minutes: number | null;
  qr_code_scan_time: string | null;
  stagiaire_id: string;
  module_id: string;
  stagiaires: { nom: string; prenom: string; email: string };
  modules: { id: string; code: string; titre: string; classe_id: string };
}

interface QRCode {
  id: string;
  code_qr: string;
  date_session: string;
  expire_at: string;
  module_id: string;
  modules: { id: string; code: string; titre: string; classe_id: string };
}

export default function Assiduite() {
  const { user } = useAuth();
  const { canManageScolarite } = useUserRole();
  const { toast } = useToast();
  const [assiduite, setAssiduite] = useState<AssiduiteRecord[]>([]);
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres pour QR Codes
  const [qrFilterProgramme, setQrFilterProgramme] = useState("");
  const [qrFilterClasse, setQrFilterClasse] = useState("");
  const [qrFilterModule, setQrFilterModule] = useState("");

  // Filtres pour Registre de présence
  const [regFilterProgramme, setRegFilterProgramme] = useState("");
  const [regFilterClasse, setRegFilterClasse] = useState("");
  const [regFilterModule, setRegFilterModule] = useState("");
  const [regFilterStagiaire, setRegFilterStagiaire] = useState("");

  // Mapping classe -> programme pour le filtrage
  const [classeToProgram, setClasseToProgram] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      loadData();
      loadClasseMapping();
    }
  }, [user]);

  const loadClasseMapping = async () => {
    const { data } = await supabase
      .from("classes")
      .select("id, programme_id");
    if (data) {
      const mapping: Record<string, string> = {};
      data.forEach((c) => {
        mapping[c.id] = c.programme_id;
      });
      setClasseToProgram(mapping);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load assiduité records
      const { data: assiduiteData, error: assiduiteError } = await supabase
        .from("assiduite")
        .select(`
          *,
          stagiaires (nom, prenom, email),
          modules (id, code, titre, classe_id)
        `)
        .order("date_session", { ascending: false })
        .limit(500);

      if (assiduiteError) throw assiduiteError;
      setAssiduite(assiduiteData || []);

      // Load QR codes if admin
      if (canManageScolarite()) {
        const { data: qrData, error: qrError } = await supabase
          .from("qr_codes_assiduite")
          .select(`
            *,
            modules (id, code, titre, classe_id)
          `)
          .order("date_session", { ascending: false });

        if (qrError) throw qrError;
        setQrCodes(qrData || []);
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrage des QR Codes
  const filteredQrCodes = useMemo(() => {
    return qrCodes.filter((qr) => {
      if (!qr.modules) return false;
      
      const classeId = qr.modules.classe_id;
      const programmeId = classeToProgram[classeId];

      if (qrFilterProgramme && programmeId !== qrFilterProgramme) return false;
      if (qrFilterClasse && classeId !== qrFilterClasse) return false;
      if (qrFilterModule && qr.module_id !== qrFilterModule) return false;

      return true;
    });
  }, [qrCodes, qrFilterProgramme, qrFilterClasse, qrFilterModule, classeToProgram]);

  // Filtrage du registre de présence
  const filteredAssiduite = useMemo(() => {
    return assiduite.filter((record) => {
      if (!record.modules) return false;

      const classeId = record.modules.classe_id;
      const programmeId = classeToProgram[classeId];

      if (regFilterProgramme && programmeId !== regFilterProgramme) return false;
      if (regFilterClasse && classeId !== regFilterClasse) return false;
      if (regFilterModule && record.module_id !== regFilterModule) return false;
      if (regFilterStagiaire && record.stagiaire_id !== regFilterStagiaire) return false;

      return true;
    });
  }, [assiduite, regFilterProgramme, regFilterClasse, regFilterModule, regFilterStagiaire, classeToProgram]);

  const getPresenceBadge = (present: boolean, retard: number | null) => {
    if (!present) {
      return <Badge variant="destructive">Absent</Badge>;
    }
    if (retard && retard > 0) {
      return <Badge variant="outline" className="text-orange-600">Retard ({retard} min)</Badge>;
    }
    return <Badge variant="default" className="bg-green-600">Présent</Badge>;
  };

  const clearQrFilters = () => {
    setQrFilterProgramme("");
    setQrFilterClasse("");
    setQrFilterModule("");
  };

  const clearRegFilters = () => {
    setRegFilterProgramme("");
    setRegFilterClasse("");
    setRegFilterModule("");
    setRegFilterStagiaire("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Assiduité</h1>
          <p className="text-muted-foreground">
            Suivi de la présence des stagiaires aux sessions
          </p>
        </div>
        {canManageScolarite() && (
          <div className="flex gap-2">
            <ManualAttendanceDialog onSaved={loadData} />
            <GenerateQRCodeDialog onGenerated={loadData} />
          </div>
        )}
      </div>

      <Tabs defaultValue="registre" className="space-y-4">
        <TabsList>
          <TabsTrigger value="registre">Registre de présence</TabsTrigger>
          {canManageScolarite() && (
            <TabsTrigger value="qrcodes">QR Codes</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="registre" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registre de présence</CardTitle>
              <CardDescription>
                Historique des présences et absences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AssiduiteFilters
                filterProgramme={regFilterProgramme}
                filterClasse={regFilterClasse}
                filterModule={regFilterModule}
                filterStagiaire={regFilterStagiaire}
                showStagiaireFilter={true}
                onProgrammeChange={setRegFilterProgramme}
                onClasseChange={setRegFilterClasse}
                onModuleChange={setRegFilterModule}
                onStagiaireChange={setRegFilterStagiaire}
                onClearFilters={clearRegFilters}
              />

              <ResponsiveTable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stagiaire</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Date session</TableHead>
                    <TableHead>Présence</TableHead>
                    <TableHead>Scan QR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssiduite.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Aucun enregistrement de présence
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssiduite.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {record.stagiaires.prenom} {record.stagiaires.nom}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {record.stagiaires.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.modules.code}</div>
                            <div className="text-sm text-muted-foreground">{record.modules.titre}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(record.date_session), "d MMM yyyy HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          {getPresenceBadge(record.present, record.retard_minutes)}
                        </TableCell>
                        <TableCell>
                          {record.qr_code_scan_time ? (
                            <div className="flex items-center gap-1 text-sm text-green-600">
                              <Check className="w-4 h-4" />
                              {format(new Date(record.qr_code_scan_time), "HH:mm", { locale: fr })}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </ResponsiveTable>
            </CardContent>
          </Card>
        </TabsContent>

        {canManageScolarite() && (
          <TabsContent value="qrcodes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  QR Codes de présence
                </CardTitle>
                <CardDescription>
                  QR codes générés pour le scan de présence des stagiaires
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AssiduiteFilters
                  filterProgramme={qrFilterProgramme}
                  filterClasse={qrFilterClasse}
                  filterModule={qrFilterModule}
                  showStagiaireFilter={false}
                  onProgrammeChange={setQrFilterProgramme}
                  onClasseChange={setQrFilterClasse}
                  onModuleChange={setQrFilterModule}
                  onStagiaireChange={() => {}}
                  onClearFilters={clearQrFilters}
                />

                <ResponsiveTable>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module</TableHead>
                      <TableHead>Date session</TableHead>
                      <TableHead>Code QR</TableHead>
                      <TableHead>Expire</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQrCodes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Aucun QR code généré
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredQrCodes.map((qr) => {
                        const isExpired = new Date(qr.expire_at) < new Date();
                        return (
                          <TableRow key={qr.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{qr.modules.code}</div>
                                <div className="text-sm text-muted-foreground">{qr.modules.titre}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(qr.date_session), "d MMM yyyy HH:mm", { locale: fr })}
                            </TableCell>
                            <TableCell>
                              <QRCodeViewerDialog
                                qrId={qr.id}
                                codeQr={qr.code_qr}
                                dateSession={qr.date_session}
                                expireAt={qr.expire_at}
                                moduleCode={qr.modules.code}
                                moduleTitre={qr.modules.titre}
                                trigger={
                                  <code className="text-xs bg-muted px-2 py-1 rounded cursor-pointer hover:bg-muted/80 transition-colors">
                                    {qr.code_qr.substring(0, 20)}...
                                  </code>
                                }
                              />
                            </TableCell>
                            <TableCell>
                              {format(new Date(qr.expire_at), "d MMM yyyy HH:mm", { locale: fr })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={isExpired ? "destructive" : "default"}>
                                {isExpired ? "Expiré" : "Actif"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </ResponsiveTable>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
