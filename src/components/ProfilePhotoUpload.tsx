import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2 } from "lucide-react";

interface ProfilePhotoUploadProps {
  userType: "stagiaire" | "enseignant";
  userId: string;
  currentPhotoUrl: string | null;
  userName: string;
  onPhotoUpdate: () => void;
}

export function ProfilePhotoUpload({
  userType,
  userId,
  currentPhotoUrl,
  userName,
  onPhotoUpdate,
}: ProfilePhotoUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(currentPhotoUrl);

  const bucketName = userType === "stagiaire" ? "stagiaire-photos" : "enseignant-photos";
  const tableName = userType === "stagiaire" ? "stagiaires" : "enseignants";

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erreur",
        description: "Le fichier doit être une image",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "L'image ne doit pas dépasser 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Bucket privé : on stocke le path. Une URL signée est générée au rendu.
      const storedPath = `${bucketName}/${fileName}`;

      // Update user record
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ photo_url: storedPath })
        .eq("id", userId);

      if (updateError) throw updateError;

      toast({
        title: "Succès",
        description: "Votre photo a été mise à jour",
      });

      onPhotoUpdate();
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de télécharger la photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photo de profil</CardTitle>
        <CardDescription>
          Téléchargez une photo pour personnaliser votre profil
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          <Avatar className="w-32 h-32">
            <AvatarImage src={photoPreview || undefined} alt={userName} />
            <AvatarFallback className="text-2xl">
              {userName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Label htmlFor="photo-upload">
              Choisir une nouvelle photo
            </Label>
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              disabled={uploading}
              className="hidden"
            />
            <Label htmlFor="photo-upload">
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                asChild
              >
                <span>
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 mr-2" />
                  )}
                  {uploading ? "Téléchargement..." : "Télécharger une photo"}
                </span>
              </Button>
            </Label>
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou WEBP (max 5MB)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
