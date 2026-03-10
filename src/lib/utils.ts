import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Convertit les liens courts youtu.be en liens youtube.com pour éviter
 * les environnements qui bloquent le domaine youtu.be.
 */
export function normalizeYouTubeUrl(input: string): string {
  try {
    const u = new URL(input);
    const hostname = u.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname === "youtu.be") {
      const videoId = u.pathname.split("/").filter(Boolean)[0];
      if (!videoId) return input;

      const out = new URL("https://www.youtube.com/watch");
      out.searchParams.set("v", videoId);

      // Conserver les paramètres additionnels (ex: si=...)
      u.searchParams.forEach((value, key) => {
        if (key === "v") return;
        out.searchParams.set(key, value);
      });

      return out.toString();
    }

    return input;
  } catch {
    return input;
  }
}

