import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Loader2, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  place_id?: string;
}

interface LocationInputProps {
  id?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string, lat?: number, lon?: number) => void;
  historySuggestions?: string[];
  className?: string;
}

export const LocationInput = ({
  id,
  placeholder = "Saisir une adresse...",
  value,
  onChange,
  historySuggestions = [],
  className,
}: LocationInputProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Filtrer l'historique en fonction de la saisie
  const filteredHistory = historySuggestions.filter(
    (h) => h.toLowerCase().includes(searchTerm.toLowerCase()) && h !== searchTerm
  ).slice(0, 3);

  // Recherche via Nominatim (OpenStreetMap)
  const searchLocations = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Ajouter "Maroc" pour privilégier les résultats marocains
      const searchQuery = query.includes("Maroc") ? query : `${query}, Maroc`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'fr',
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error("Erreur de recherche de lieu:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce de la recherche
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchLocations(searchTerm);
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, searchLocations]);

  // Fermer les suggestions au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setSearchTerm(suggestion.display_name);
    onChange(suggestion.display_name, parseFloat(suggestion.lat), parseFloat(suggestion.lon));
    setShowSuggestions(false);
  };

  const handleSelectHistory = (historyItem: string) => {
    setSearchTerm(historyItem);
    onChange(historyItem);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id={id}
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          className={cn("pl-9", className)}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showSuggestions && (filteredHistory.length > 0 || suggestions.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
          <ScrollArea className="max-h-[250px]">
            <div className="p-1">
              {/* Section historique */}
              {filteredHistory.length > 0 && (
                <>
                  <div className="px-3 py-1 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <History className="h-3 w-3" />
                    Historique
                  </div>
                  {filteredHistory.map((item, index) => (
                    <div
                      key={`history-${index}`}
                      className="px-3 py-2 text-sm rounded cursor-pointer hover:bg-accent flex items-center gap-2"
                      onClick={() => handleSelectHistory(item)}
                    >
                      <History className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                  {suggestions.length > 0 && (
                    <div className="border-t my-1" />
                  )}
                </>
              )}

              {/* Section résultats OpenStreetMap */}
              {suggestions.length > 0 && (
                <>
                  <div className="px-3 py-1 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Résultats cartographie
                  </div>
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.place_id}
                      className="px-3 py-2 text-sm rounded cursor-pointer hover:bg-accent flex items-start gap-2"
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{suggestion.display_name}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

// Fonction pour calculer la distance et le temps via OSRM
export const calculateRoute = async (
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<{ distance_km: number; duration_minutes: number } | null> => {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.code === "Ok" && data.routes?.[0]) {
      const route = data.routes[0];
      return {
        distance_km: Math.round(route.distance / 1000 * 10) / 10,
        duration_minutes: Math.round(route.duration / 60),
      };
    }
    return null;
  } catch (error) {
    console.error("Erreur calcul itinéraire:", error);
    return null;
  }
};

// Geocoder une adresse pour obtenir les coordonnées
export const geocodeAddress = async (
  address: string
): Promise<{ lat: number; lon: number } | null> => {
  try {
    const searchQuery = address.includes("Maroc") ? address : `${address}, Maroc`;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
      {
        headers: {
          'Accept-Language': 'fr',
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data?.[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Erreur géocodage:", error);
    return null;
  }
};
