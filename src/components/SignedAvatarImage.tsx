import { forwardRef } from "react";
import { AvatarImage } from "@/components/ui/avatar";
import { useSignedPhotoUrl } from "@/hooks/useSignedPhotoUrl";
import type { PhotoBucket } from "@/lib/signedPhotoUrl";

type AvatarImageProps = React.ComponentProps<typeof AvatarImage>;

interface SignedAvatarImageProps extends Omit<AvatarImageProps, "src"> {
  /** URL publique héritée OU path stocké dans `photo_url` */
  photoUrl: string | null | undefined;
  fallbackBucket?: PhotoBucket;
}

/**
 * Drop-in pour <AvatarImage src={...}> qui résout automatiquement les URLs
 * signées pour les buckets photos privés (stagiaire-photos, enseignant-photos).
 */
export const SignedAvatarImage = forwardRef<
  React.ElementRef<typeof AvatarImage>,
  SignedAvatarImageProps
>(({ photoUrl, fallbackBucket, ...rest }, ref) => {
  const signed = useSignedPhotoUrl(photoUrl, fallbackBucket);
  // Pendant le chargement (undefined) ou en échec (null) : ne pas rendre <img>,
  // ainsi le fallback de l'Avatar s'affiche.
  if (!signed) return null;
  return <AvatarImage ref={ref} src={signed} {...rest} />;
});
SignedAvatarImage.displayName = "SignedAvatarImage";
