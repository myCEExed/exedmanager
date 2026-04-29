import { useEffect, useState } from "react";
import { resolveSignedPhotoUrl, type PhotoBucket } from "@/lib/signedPhotoUrl";

/**
 * Hook React : prend une `photo_url` (URL publique héritée ou path) et retourne
 * une URL signée fraîche (TTL 1h, mise en cache).
 *
 * Pendant la résolution, retourne `undefined` ; en cas d'échec ou d'absence,
 * retourne `null`.
 */
export function useSignedPhotoUrl(
  storedUrl: string | null | undefined,
  fallbackBucket?: PhotoBucket,
): string | null | undefined {
  const [url, setUrl] = useState<string | null | undefined>(() =>
    storedUrl ? undefined : null,
  );

  useEffect(() => {
    let cancelled = false;
    if (!storedUrl) {
      setUrl(null);
      return;
    }
    setUrl(undefined);
    resolveSignedPhotoUrl(storedUrl, fallbackBucket).then((signed) => {
      if (!cancelled) setUrl(signed);
    });
    return () => {
      cancelled = true;
    };
  }, [storedUrl, fallbackBucket]);

  return url;
}
