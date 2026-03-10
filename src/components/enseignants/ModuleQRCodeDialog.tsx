import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Download, Copy, RefreshCw, Printer } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ModuleQRCodeDialogProps {
  moduleId: string;
  moduleTitre: string;
  trigger?: React.ReactNode;
}

interface ExistingQR {
  id: string;
  code_qr: string;
  date_session: string;
  expire_at: string;
}

export function ModuleQRCodeDialog({ moduleId, moduleTitre, trigger }: ModuleQRCodeDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [existingQRs, setExistingQRs] = useState<ExistingQR[]>([]);
  const [selectedQR, setSelectedQR] = useState<ExistingQR | null>(null);
  const [dateSession, setDateSession] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [expirationMinutes, setExpirationMinutes] = useState("60");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadExistingQRCodes();
    }
  }, [open, moduleId]);

  const loadExistingQRCodes = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("qr_codes_assiduite")
        .select("id, code_qr, date_session, expire_at")
        .eq("module_id", moduleId)
        .order("date_session", { ascending: false });

      if (data && data.length > 0) {
        setExistingQRs(data);
        // Sélectionner automatiquement le plus récent non expiré
        const activeQR = data.find(qr => new Date(qr.expire_at) > new Date());
        setSelectedQR(activeQR || data[0]);
      }
    } catch (error) {
      console.error("Erreur chargement QR codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    setGenerating(true);
    try {
      const expireAt = new Date(dateSession);
      expireAt.setMinutes(expireAt.getMinutes() + parseInt(expirationMinutes));

      const codeQR = `EXED-${moduleId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabase
        .from("qr_codes_assiduite")
        .insert({
          module_id: moduleId,
          date_session: new Date(dateSession).toISOString(),
          code_qr: codeQR,
          expire_at: expireAt.toISOString(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newQR = {
        id: data.id,
        code_qr: data.code_qr,
        date_session: data.date_session,
        expire_at: data.expire_at,
      };

      setExistingQRs(prev => [newQR, ...prev]);
      setSelectedQR(newQR);

      toast({
        title: "Succès",
        description: "QR code généré avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (selectedQR) {
      navigator.clipboard.writeText(selectedQR.code_qr);
      toast({ title: "Code copié dans le presse-papiers" });
    }
  };

  const downloadQRCode = () => {
    const svg = document.getElementById("module-qr-code-svg");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx?.fillRect(0, 0, canvas.width, canvas.height);
        ctx!.fillStyle = "white";
        ctx?.fillRect(0, 0, canvas.width, canvas.height);
        ctx?.drawImage(img, 0, 0, 400, 400);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `qr-${moduleTitre.replace(/\s+/g, '-')}-${format(new Date(selectedQR!.date_session), "yyyy-MM-dd")}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const printQRCode = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && selectedQR) {
      const svg = document.getElementById("module-qr-code-svg");
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>QR Code - ${moduleTitre}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: Arial, sans-serif;
                padding: 20px;
              }
              h1 { font-size: 24px; margin-bottom: 10px; }
              h2 { font-size: 18px; color: #666; margin-bottom: 30px; }
              .qr-container { padding: 20px; border: 2px solid #ddd; border-radius: 10px; }
              .info { margin-top: 20px; text-align: center; }
              .expire { color: #e11d48; font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>${moduleTitre}</h1>
            <h2>Scannez pour marquer votre présence</h2>
            <div class="qr-container">
              ${svgData}
            </div>
            <div class="info">
              <p>Session du ${format(new Date(selectedQR.date_session), "d MMMM yyyy à HH:mm", { locale: fr })}</p>
              <p class="expire">Expire le ${format(new Date(selectedQR.expire_at), "d MMMM yyyy à HH:mm", { locale: fr })}</p>
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const isExpired = selectedQR ? new Date(selectedQR.expire_at) < new Date() : false;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <QrCode className="w-4 h-4 mr-2" />
            QR Code
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            QR Code - {moduleTitre}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : selectedQR ? (
          <div className="space-y-4">
            {existingQRs.length > 1 && (
              <div className="space-y-2">
                <Label>Session</Label>
                <Select 
                  value={selectedQR.id} 
                  onValueChange={(id) => setSelectedQR(existingQRs.find(qr => qr.id === id) || null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {existingQRs.map((qr) => (
                      <SelectItem key={qr.id} value={qr.id}>
                        {format(new Date(qr.date_session), "d MMM yyyy HH:mm", { locale: fr })}
                        {new Date(qr.expire_at) < new Date() && " (expiré)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className={`flex justify-center p-4 rounded-lg ${isExpired ? 'bg-muted' : 'bg-white'}`}>
              <div className={isExpired ? 'opacity-50' : ''}>
                <QRCodeSVG
                  id="module-qr-code-svg"
                  value={selectedQR.code_qr}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
            </div>

            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                Session: {format(new Date(selectedQR.date_session), "d MMMM yyyy à HH:mm", { locale: fr })}
              </p>
              <p className={`text-sm ${isExpired ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                {isExpired ? "Expiré" : `Expire le ${format(new Date(selectedQR.expire_at), "d MMMM yyyy à HH:mm", { locale: fr })}`}
              </p>
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="w-4 h-4 mr-2" />
                Copier
              </Button>
              <Button variant="outline" size="sm" onClick={downloadQRCode}>
                <Download className="w-4 h-4 mr-2" />
                PNG
              </Button>
              <Button variant="outline" size="sm" onClick={printQRCode}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimer
              </Button>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Générer un nouveau QR Code</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Date session</Label>
                  <Input
                    type="datetime-local"
                    value={dateSession}
                    onChange={(e) => setDateSession(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Validité</Label>
                  <Select value={expirationMinutes} onValueChange={setExpirationMinutes}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">1h</SelectItem>
                      <SelectItem value="120">2h</SelectItem>
                      <SelectItem value="480">8h</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                className="w-full mt-2" 
                size="sm"
                onClick={generateQRCode}
                disabled={generating}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                {generating ? "Génération..." : "Nouveau QR Code"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground py-4">
              Aucun QR code pour ce module. Générez-en un pour permettre aux stagiaires de pointer leur présence.
            </p>
            <div className="space-y-2">
              <Label>Date et heure de la session</Label>
              <Input
                type="datetime-local"
                value={dateSession}
                onChange={(e) => setDateSession(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Durée de validité</Label>
              <Select value={expirationMinutes} onValueChange={setExpirationMinutes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 heure</SelectItem>
                  <SelectItem value="120">2 heures</SelectItem>
                  <SelectItem value="480">8 heures</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              className="w-full" 
              onClick={generateQRCode}
              disabled={generating}
            >
              {generating ? "Génération..." : "Générer le QR Code"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
