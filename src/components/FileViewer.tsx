import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Eye, X, FileText, Music, Video, FileSpreadsheet, Presentation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FileViewerProps {
  fileName: string;
  fileType: string | null;
  storageBucket: string;
  storagePath: string;
  title: string;
}

export function FileViewer({ fileName, fileType, storageBucket, storagePath, title }: FileViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getSignedUrl = async () => {
    try {
      const { data, error } = await supabase.storage
        .from(storageBucket)
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error: any) {
      console.error("Error getting signed URL:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'accéder au fichier",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const url = await getSignedUrl();
      if (url) {
        // Create a temporary link and trigger download
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        
        toast({
          title: "Téléchargement démarré",
          description: `${fileName} est en cours de téléchargement`,
        });
      }
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Erreur de téléchargement",
        description: "Impossible de télécharger le fichier",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    const url = await getSignedUrl();
    if (url) {
      setFileUrl(url);
      setIsOpen(true);
    }
    setLoading(false);
  };

  const getFileIcon = () => {
    if (!fileType) return <FileText className="w-4 h-4" />;
    
    if (fileType.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
    if (fileType.includes("word") || fileType.includes("document")) return <FileText className="w-4 h-4 text-blue-500" />;
    if (fileType.includes("sheet") || fileType.includes("excel")) return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
    if (fileType.includes("presentation") || fileType.includes("powerpoint")) return <Presentation className="w-4 h-4 text-orange-500" />;
    if (fileType.includes("audio")) return <Music className="w-4 h-4 text-purple-500" />;
    if (fileType.includes("video")) return <Video className="w-4 h-4 text-pink-500" />;
    
    return <FileText className="w-4 h-4" />;
  };

  const canPreview = () => {
    if (!fileType) return false;
    
    // Types that can be previewed in browser
    const previewableTypes = [
      "application/pdf",
      "image/",
      "audio/",
      "video/",
      "text/",
    ];
    
    return previewableTypes.some(type => fileType.includes(type.replace("/", "")));
  };

  const renderPreview = () => {
    if (!fileUrl || !fileType) return null;

    // PDF - use object tag for better compatibility
    if (fileType.includes("pdf")) {
      return (
        <div className="space-y-4">
          <object
            data={fileUrl}
            type="application/pdf"
            className="w-full h-[70vh] rounded-lg border"
          >
            <div className="flex flex-col items-center justify-center p-8 space-y-4 bg-muted rounded-lg h-[70vh]">
              <FileText className="w-16 h-16 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                Votre navigateur ne peut pas afficher ce PDF directement.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => window.open(fileUrl, "_blank")}>
                  <Eye className="w-4 h-4 mr-2" />
                  Ouvrir dans un nouvel onglet
                </Button>
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            </div>
          </object>
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, "_blank")}>
              <Eye className="w-4 h-4 mr-2" />
              Ouvrir dans un nouvel onglet
            </Button>
          </div>
        </div>
      );
    }

    // Images
    if (fileType.startsWith("image/")) {
      return (
        <img
          src={fileUrl}
          alt={title}
          className="max-w-full max-h-[70vh] object-contain mx-auto rounded-lg"
        />
      );
    }

    // Audio
    if (fileType.startsWith("audio/")) {
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <Music className="w-24 h-24 text-primary" />
          <audio controls className="w-full max-w-md">
            <source src={fileUrl} type={fileType} />
            Votre navigateur ne supporte pas la lecture audio.
          </audio>
        </div>
      );
    }

    // Video
    if (fileType.startsWith("video/")) {
      return (
        <video
          controls
          className="w-full max-h-[70vh] rounded-lg"
          autoPlay={false}
        >
          <source src={fileUrl} type={fileType} />
          Votre navigateur ne supporte pas la lecture vidéo.
        </video>
      );
    }

    // Office documents - use Google Docs Viewer or Office Online
    if (
      fileType.includes("word") ||
      fileType.includes("document") ||
      fileType.includes("sheet") ||
      fileType.includes("excel") ||
      fileType.includes("presentation") ||
      fileType.includes("powerpoint")
    ) {
      // Use Microsoft Office Online viewer
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
      
      return (
        <div className="space-y-4">
          <iframe
            src={officeViewerUrl}
            className="w-full h-[70vh] rounded-lg border"
            title={title}
          />
          <p className="text-sm text-muted-foreground text-center">
            Si la prévisualisation ne fonctionne pas, 
            <Button variant="link" className="px-1" onClick={handleDownload}>
              téléchargez le fichier
            </Button>
            pour le visualiser.
          </p>
        </div>
      );
    }

    // Text files
    if (fileType.startsWith("text/")) {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-[70vh] rounded-lg border bg-background"
          title={title}
        />
      );
    }

    // Default: can't preview
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        {getFileIcon()}
        <p className="text-muted-foreground">
          Prévisualisation non disponible pour ce type de fichier
        </p>
        <Button onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" />
          Télécharger
        </Button>
      </div>
    );
  };

  return (
    <>
      <div className="flex gap-2">
        {canPreview() && (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={loading}
          >
            <Eye className="w-4 h-4 mr-1" />
            Voir
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={loading}
        >
          <Download className="w-4 h-4 mr-1" />
          {loading ? "..." : "Télécharger"}
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getFileIcon()}
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {renderPreview()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper function to extract storage path from full URL or path
export function extractStoragePath(url: string, bucketName: string): string {
  // If it's already just a filename/path
  if (!url.includes("http")) return url;
  
  // Extract from full Supabase URL
  const bucketIndex = url.indexOf(`/storage/v1/object/public/${bucketName}/`);
  if (bucketIndex !== -1) {
    return decodeURIComponent(url.substring(bucketIndex + `/storage/v1/object/public/${bucketName}/`.length));
  }
  
  // Try to extract just the filename
  const parts = url.split("/");
  return parts[parts.length - 1];
}
