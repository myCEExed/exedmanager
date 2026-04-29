import { useSignedPhotoUrl } from "@/hooks/useSignedPhotoUrl";
import type { PhotoBucket } from "@/lib/signedPhotoUrl";

interface SignedPhotoImgProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  photoUrl: string | null | undefined;
  fallbackBucket?: PhotoBucket;
  /** Élément à afficher pendant le chargement / en cas d'échec */
  fallback?: React.ReactNode;
}

/**
 * Drop-in pour <img src={photo_url}> — résout l'URL signée à la volée.
 */
export function SignedPhotoImg({
  photoUrl,
  fallbackBucket,
  fallback = null,
  alt = "",
  ...rest
}: SignedPhotoImgProps) {
  const signed = useSignedPhotoUrl(photoUrl, fallbackBucket);
  if (!signed) return <>{fallback}</>;
  return <img src={signed} alt={alt} {...rest} />;
}
