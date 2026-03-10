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
import { Plus, QrCode, Download, Copy } from "lucide-react";
import { format } from "date-fns";

interface Programme {
  id: string;
  code: string;
  titre: string;
}

interface Classe {
  id: string;
  nom: string;
  sous_code: string;
}

interface Module {
  id: string;
  code: string;
  titre: string;
}

interface GeneratedQR {
  id: string;
  code_qr: string;
  expire_at: string;
}

export function GenerateQRCodeDialog({ onGenerated }: { onGenerated: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  
  const [selectedProgramme, setSelectedProgramme] = useState("");
  const [selectedClasse, setSelectedClasse] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [dateSession, setDateSession] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [expirationMinutes, setExpirationMinutes] = useState("60");
  
  const [generatedQR, setGeneratedQR] = useState<GeneratedQR | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open) {
      loadProgrammes();
    }
  }, [open]);

  useEffect(() => {
    if (selectedProgramme) {
      loadClasses(selectedProgramme);
      setSelectedClasse("");
      setSelectedModule("");
    }
  }, [selectedProgramme]);

  useEffect(() => {
    if (selectedClasse) {
      loadModules(selectedClasse);
      setSelectedModule("");
    }
  }, [selectedClasse]);

  const loadProgrammes = async () => {
    const { data } = await supabase
      .from("programmes")
      .select("id, code, titre")
      .order("code");
    setProgrammes(data || []);
  };

  const loadClasses = async (programmeId: string) => {
    const { data } = await supabase
      .from("classes")
      .select("id, nom, sous_code")
      .eq("programme_id", programmeId)
      .order("nom");
    setClasses(data || []);
  };

  const loadModules = async (classeId: string) => {
    const { data } = await supabase
      .from("modules")
      .select("id, code, titre")
      .eq("classe_id", classeId)
      .order("code");
    setModules(data || []);
  };

  const generateQRCode = async () => {
    if (!selectedModule || !dateSession) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un module et une date de session",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const expireAt = new Date(dateSession);
      expireAt.setMinutes(expireAt.getMinutes() + parseInt(expirationMinutes));

      // Générer un code unique
      const codeQR = `EXED-${selectedModule}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabase
        .from("qr_codes_assiduite")
        .insert({
          module_id: selectedModule,
          date_session: new Date(dateSession).toISOString(),
          code_qr: codeQR,
          expire_at: expireAt.toISOString(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setGeneratedQR({
        id: data.id,
        code_qr: data.code_qr,
        expire_at: data.expire_at,
      });

      toast({
        title: "Succès",
        description: "QR code généré avec succès",
      });

      onGenerated();
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
    if (generatedQR) {
      navigator.clipboard.writeText(generatedQR.code_qr);
      toast({ title: "Code copié dans le presse-papiers" });
    }
  };

  const downloadQRCode = () => {
    const svg = document.getElementById("qr-code-svg");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `qr-code-${selectedModule}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    }
  };

  const resetForm = () => {
    setGeneratedQR(null);
    setSelectedProgramme("");
    setSelectedClasse("");
    setSelectedModule("");
    setDateSession(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Générer un QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Générer un QR Code de présence
          </DialogTitle>
        </DialogHeader>

        {generatedQR ? (
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCodeSVG
                id="qr-code-svg"
                value={generatedQR.code_qr}
                size={180}
                level="H"
                includeMargin
              />
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Expire le {format(new Date(generatedQR.expire_at), "dd/MM/yyyy à HH:mm")}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard} className="w-full">
                <Copy className="w-4 h-4 mr-2" />
                Copier
              </Button>
              <Button variant="outline" size="sm" onClick={downloadQRCode} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </Button>
            </div>
            <Button className="w-full" onClick={resetForm}>
              Générer un autre QR Code
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Programme</Label>
              <Select value={selectedProgramme} onValueChange={setSelectedProgramme}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un programme" />
                </SelectTrigger>
                <SelectContent>
                  {programmes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} - {p.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Classe</Label>
              <Select 
                value={selectedClasse} 
                onValueChange={setSelectedClasse}
                disabled={!selectedProgramme}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nom} ({c.sous_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Module</Label>
              <Select 
                value={selectedModule} 
                onValueChange={setSelectedModule}
                disabled={!selectedClasse}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.code} - {m.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date et heure de la session</Label>
              <Input
                type="datetime-local"
                value={dateSession}
                onChange={(e) => setDateSession(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Durée de validité (minutes)</Label>
              <Select value={expirationMinutes} onValueChange={setExpirationMinutes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 heure</SelectItem>
                  <SelectItem value="120">2 heures</SelectItem>
                  <SelectItem value="240">4 heures</SelectItem>
                  <SelectItem value="480">8 heures</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full" 
              onClick={generateQRCode}
              disabled={!selectedModule || generating}
            >
              {generating ? "Génération..." : "Générer le QR Code"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
