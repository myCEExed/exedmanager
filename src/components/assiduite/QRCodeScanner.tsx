import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, Camera, Check, X, Loader2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface QRCodeScannerProps {
  stagiaireId: string;
  onSuccess?: () => void;
}

export function QRCodeScanner({ stagiaireId, onSuccess }: QRCodeScannerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      setScanning(true);
      setScanResult(null);
      setErrorMessage("");

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        () => {} // Ignorer les erreurs de scan continu
      );
    } catch (error: any) {
      console.error("Erreur démarrage scanner:", error);
      setScanning(false);
      toast({
        title: "Erreur",
        description: "Impossible d'accéder à la caméra. Vérifiez les permissions.",
        variant: "destructive",
      });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error("Erreur arrêt scanner:", error);
      }
    }
    setScanning(false);
  };

  const onScanSuccess = async (decodedText: string) => {
    if (processing) return;
    
    setProcessing(true);
    await stopScanner();

    try {
      // Vérifier le QR code dans la base de données
      const { data: qrCode, error: qrError } = await supabase
        .from("qr_codes_assiduite")
        .select("*, modules(id, code, titre)")
        .eq("code_qr", decodedText)
        .single();

      if (qrError || !qrCode) {
        throw new Error("QR code invalide ou non reconnu");
      }

      // Vérifier si le QR code n'est pas expiré
      if (new Date(qrCode.expire_at) < new Date()) {
        throw new Error("Ce QR code a expiré");
      }

      // Vérifier si le stagiaire n'a pas déjà scanné ce QR code
      const { data: existingRecord } = await supabase
        .from("assiduite")
        .select("id")
        .eq("stagiaire_id", stagiaireId)
        .eq("module_id", qrCode.module_id)
        .eq("date_session", qrCode.date_session)
        .single();

      if (existingRecord) {
        throw new Error("Votre présence a déjà été enregistrée pour cette session");
      }

      // Enregistrer la présence
      const { error: insertError } = await supabase
        .from("assiduite")
        .insert({
          stagiaire_id: stagiaireId,
          module_id: qrCode.module_id,
          date_session: qrCode.date_session,
          present: true,
          qr_code_scan_time: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      setScanResult('success');
      toast({
        title: "Présence enregistrée !",
        description: `Module: ${qrCode.modules.titre}`,
      });

      if (onSuccess) onSuccess();

    } catch (error: any) {
      setScanResult('error');
      setErrorMessage(error.message);
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      stopScanner();
      setScanResult(null);
      setErrorMessage("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <QrCode className="w-5 h-5 mr-2" />
          Scanner ma présence
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Scanner le QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {scanResult === 'success' ? (
            <Card className="border-green-500 bg-green-50">
              <CardContent className="flex flex-col items-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <p className="text-lg font-medium text-green-700">Présence confirmée !</p>
                <Button className="mt-4" onClick={() => handleOpenChange(false)}>
                  Fermer
                </Button>
              </CardContent>
            </Card>
          ) : scanResult === 'error' ? (
            <Card className="border-red-500 bg-red-50">
              <CardContent className="flex flex-col items-center py-8">
                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mb-4">
                  <X className="w-8 h-8 text-white" />
                </div>
                <p className="text-lg font-medium text-red-700">Échec du scan</p>
                <p className="text-sm text-red-600 text-center mt-2">{errorMessage}</p>
                <Button className="mt-4" onClick={startScanner}>
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          ) : processing ? (
            <Card>
              <CardContent className="flex flex-col items-center py-8">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Vérification en cours...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div 
                id="qr-reader" 
                className="w-full aspect-square rounded-lg overflow-hidden bg-black"
              />
              
              {!scanning ? (
                <Button className="w-full" onClick={startScanner}>
                  <Camera className="w-4 h-4 mr-2" />
                  Démarrer la caméra
                </Button>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  Placez le QR code devant la caméra
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
