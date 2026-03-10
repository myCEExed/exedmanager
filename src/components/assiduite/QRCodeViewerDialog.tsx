import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface QRCodeViewerDialogProps {
  qrId: string;
  codeQr: string;
  dateSession: string;
  expireAt: string;
  moduleCode: string;
  moduleTitre: string;
  trigger: React.ReactNode;
}

export function QRCodeViewerDialog({
  qrId,
  codeQr,
  dateSession,
  expireAt,
  moduleCode,
  moduleTitre,
  trigger,
}: QRCodeViewerDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const isExpired = new Date(expireAt) < new Date();

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(codeQr);
    toast({ title: "Code copié dans le presse-papiers" });
  };

  const downloadPng = () => {
    const svg = document.getElementById(`qr-dialog-svg-${qrId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      const moduleSafe = moduleTitre.replace(/\s+/g, "-");
      downloadLink.download = `qr-${moduleSafe}-${format(new Date(dateSession), "yyyy-MM-dd")}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printFormatted = () => {
    const svg = document.getElementById(`qr-dialog-svg-${qrId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>QR Code - ${moduleTitre}</title>
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
        <h1>${moduleCode} — ${moduleTitre}</h1>
        <h2>Scannez pour marquer votre présence</h2>
        <div class="qr">${svgData}</div>
        <div class="info">
          <div>Session : ${format(new Date(dateSession), "d MMMM yyyy à HH:mm", { locale: fr })}</div>
          <div class="${isExpired ? "expired" : ""}">Expire : ${format(new Date(expireAt), "d MMMM yyyy à HH:mm", { locale: fr })}</div>
          <div class="code">${codeQr}</div>
        </div>
        <script>
          window.onload = () => window.print();
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {moduleCode} — {moduleTitre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground text-center">
            Session : {format(new Date(dateSession), "d MMMM yyyy à HH:mm", { locale: fr })}
            <br />
            <span className={isExpired ? "text-destructive font-medium" : ""}>
              {isExpired ? "Expiré" : `Expire : ${format(new Date(expireAt), "d MMMM yyyy à HH:mm", { locale: fr })}`}
            </span>
          </div>

          <div className="flex justify-center">
            <div className={`p-4 rounded-lg border bg-white ${isExpired ? "opacity-60" : ""}`}>
              <QRCodeSVG
                id={`qr-dialog-svg-${qrId}`}
                value={codeQr}
                size={200}
                level="H"
                includeMargin
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={copyToClipboard} className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              Copier
            </Button>
            <Button variant="outline" size="sm" onClick={downloadPng} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              PNG
            </Button>
            <Button variant="outline" size="sm" onClick={printFormatted} className="w-full">
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Code complet</p>
            <code className="block text-xs bg-muted px-3 py-2 rounded break-all">{codeQr}</code>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
