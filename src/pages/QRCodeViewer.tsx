import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Copy, Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type QRCodeDetails = {
  id: string;
  module_id: string;
  code_qr: string;
  date_session: string;
  expire_at: string;
  modules?: {
    code: string;
    titre: string;
  };
};

export default function QRCodeViewer() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState<QRCodeDetails | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("qr_codes_assiduite")
          .select(
            `
            id,
            module_id,
            code_qr,
            date_session,
            expire_at,
            modules ( code, titre )
          `
          )
          .eq("id", id)
          .single();

        if (error) throw error;
        setQr(data as any);
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, toast]);

  const isExpired = useMemo(() => {
    if (!qr) return false;
    return new Date(qr.expire_at) < new Date();
  }, [qr]);

  useEffect(() => {
    if (!qr) return;
    const title = qr.modules?.titre ? `QR Code - ${qr.modules.titre}` : "QR Code";
    document.title = title;
  }, [qr]);

  const copyToClipboard = async () => {
    if (!qr) return;
    await navigator.clipboard.writeText(qr.code_qr);
    toast({ title: "Code copié" });
  };

  const downloadPng = () => {
    if (!qr) return;
    const svg = document.getElementById("qr-viewer-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // fond blanc pour une lecture fiable
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");

      const moduleSafe = (qr.modules?.titre || "module").replace(/\s+/g, "-");
      downloadLink.download = `qr-${moduleSafe}-${format(new Date(qr.date_session), "yyyy-MM-dd")}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printFormatted = () => {
    if (!qr) return;
    const svg = document.getElementById("qr-viewer-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;

    const moduleTitle = qr.modules?.titre || "Module";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>QR Code - ${moduleTitle}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          h1 { margin: 0 0 6px; font-size: 22px; }
          h2 { margin: 0 0 18px; font-size: 14px; font-weight: normal; color: #555; }
          .qr { border: 2px solid #ddd; border-radius: 12px; padding: 18px; background: white; }
          .info { margin-top: 14px; text-align: center; font-size: 12px; color: #444; }
          .code { margin-top: 10px; font-family: monospace; font-size: 10px; word-break: break-all; max-width: 520px; }
          .expired { color: #b91c1c; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>${moduleTitle}</h1>
        <h2>Scannez pour marquer votre présence</h2>
        <div class="qr">${svgData}</div>
        <div class="info">
          <div>Session : ${format(new Date(qr.date_session), "d MMMM yyyy à HH:mm", { locale: fr })}</div>
          <div class="${isExpired ? "expired" : ""}">Expire : ${format(new Date(qr.expire_at), "d MMMM yyyy à HH:mm", { locale: fr })}</div>
          <div class="code">${qr.code_qr}</div>
        </div>
        <script>
          window.onload = () => window.print();
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!qr) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>QR Code introuvable</CardTitle>
            <CardDescription>Ce QR code n’existe pas ou n’est plus accessible.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/assiduite">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/assiduite">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Assiduité
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={copyToClipboard}>
              <Copy className="w-4 h-4 mr-2" />
              Copier
            </Button>
            <Button size="sm" variant="outline" onClick={downloadPng}>
              <Download className="w-4 h-4 mr-2" />
              PNG
            </Button>
            <Button size="sm" variant="outline" onClick={printFormatted}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {qr.modules?.code ? `${qr.modules.code} — ${qr.modules.titre}` : "QR Code"}
            </CardTitle>
            <CardDescription>
              Session : {format(new Date(qr.date_session), "d MMMM yyyy à HH:mm", { locale: fr })}
              {" • "}
              {isExpired ? "Expiré" : `Expire : ${format(new Date(qr.expire_at), "d MMMM yyyy à HH:mm", { locale: fr })}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className={`p-4 rounded-lg border bg-card ${isExpired ? "opacity-60" : ""}`}>
                <QRCodeSVG
                  id="qr-viewer-svg"
                  value={qr.code_qr}
                  size={280}
                  level="H"
                  includeMargin
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Code complet</p>
              <code className="block text-xs bg-muted px-3 py-2 rounded break-all">{qr.code_qr}</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
