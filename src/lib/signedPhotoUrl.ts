import { supabase } from "@/integrations/supabase/client";

/**
 * Buckets de photos privés. Les URLs publiques héritées sont converties à la volée
 * en URLs signées (TTL 1h).
 */
const PHOTO_BUCKETS = ["stagiaire-photos", "enseignant-photos"] as const;
type PhotoBucket = (typeof PHOTO_BUCKETS)[number];

const SIGNED_TTL_SECONDS = 3600; // 1h
// Cache: rafraîchissement avant expiration réelle
const REFRESH_BEFORE_MS = 5 * 60 * 1000; // 5 min

interface CachedEntry {
  url: string;
  expiresAt: number;
}

const cache = new Map<string, CachedEntry>();
const inflight = new Map<string, Promise<string | null>>();

/**
 * Extrait le bucket et le path depuis une valeur stockée dans `photo_url`.
 * Accepte :
 *  - une URL publique Supabase héritée : `.../storage/v1/object/public/<bucket>/<path>`
 *  - une URL signée Supabase : `.../storage/v1/object/sign/<bucket>/<path>?token=...`
 *  - un path nu : `<bucket>/<path>` ou simplement `<path>` (bucket implicite via paramètre)
 */
function parseStoredPhoto(
  stored: string,
  fallbackBucket?: PhotoBucket,
): { bucket: PhotoBucket; path: string } | null {
  if (!stored) return null;

  // Tenter de parser comme URL Supabase
  const match = stored.match(
    /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/,
  );
  if (match) {
    const bucket = match[1] as PhotoBucket;
    const path = decodeURIComponent(match[2]);
    if ((PHOTO_BUCKETS as readonly string[]).includes(bucket)) {
      return { bucket, path };
    }
    return null;
  }

  // Path nu — utiliser fallback
  if (!stored.startsWith("http")) {
    if (fallbackBucket) {
      return { bucket: fallbackBucket, path: stored.replace(/^\/+/, "") };
    }
  }

  return null;
}

/**
 * Résout une `photo_url` stockée (publique héritée ou path) en URL signée valide.
 * Renvoie `null` si impossible (ex : URL externe, bucket inconnu, erreur réseau).
 *
 * Mise en cache en mémoire pour éviter de re-signer à chaque rendu.
 */
export async function resolveSignedPhotoUrl(
  stored: string | null | undefined,
  fallbackBucket?: PhotoBucket,
): Promise<string | null> {
  if (!stored) return null;

  const parsed = parseStoredPhoto(stored, fallbackBucket);
  if (!parsed) {
    // Si ce n'est pas une URL Supabase reconnue, retourner tel quel
    return stored.startsWith("http") ? stored : null;
  }

  const cacheKey = `${parsed.bucket}/${parsed.path}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt - REFRESH_BEFORE_MS > now) {
    return cached.url;
  }

  const existing = inflight.get(cacheKey);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const { data, error } = await supabase.storage
        .from(parsed.bucket)
        .createSignedUrl(parsed.path, SIGNED_TTL_SECONDS);
      if (error || !data?.signedUrl) {
        return null;
      }
      cache.set(cacheKey, {
        url: data.signedUrl,
        expiresAt: now + SIGNED_TTL_SECONDS * 1000,
      });
      return data.signedUrl;
    } catch (err) {
      console.error("resolveSignedPhotoUrl error", err);
      return null;
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, promise);
  return promise;
}

/**
 * Variante batch : résout plusieurs URLs en parallèle.
 */
export async function resolveSignedPhotoUrls(
  storedList: Array<string | null | undefined>,
  fallbackBucket?: PhotoBucket,
): Promise<Array<string | null>> {
  return Promise.all(storedList.map((s) => resolveSignedPhotoUrl(s, fallbackBucket)));
}

export type { PhotoBucket };
