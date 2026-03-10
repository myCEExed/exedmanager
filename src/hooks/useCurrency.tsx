import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Currency = "EUR" | "MAD";

interface ExchangeRate {
  id: string;
  taux_eur_to_mad: number;
  date_application: string;
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  exchangeRate: number;
  convertAmount: (amount: number, from: Currency, to?: Currency) => number;
  formatAmount: (amount: number, fromCurrency?: Currency) => string;
  refreshExchangeRate: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [exchangeRate, setExchangeRate] = useState<number>(10.80);

  const loadExchangeRate = async () => {
    try {
      const { data, error } = await supabase
        .from("taux_change")
        .select("*")
        .lte("date_application", new Date().toISOString().split('T')[0])
        .order("date_application", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("Could not load exchange rate, using default:", error.message);
        return;
      }
      if (data) {
        setExchangeRate(Number(data.taux_eur_to_mad));
      }
    } catch (error) {
      console.error("Error loading exchange rate:", error);
    }
  };

  useEffect(() => {
    loadExchangeRate();
    
    // Subscribe to changes in exchange rates
    const channel = supabase
      .channel("taux_change_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "taux_change",
        },
        () => {
          loadExchangeRate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const convertAmount = (amount: number, from: Currency, to?: Currency): number => {
    const targetCurrency = to || currency;
    
    if (from === targetCurrency) {
      return amount;
    }

    if (from === "EUR" && targetCurrency === "MAD") {
      return amount * exchangeRate;
    }

    if (from === "MAD" && targetCurrency === "EUR") {
      return amount / exchangeRate;
    }

    return amount;
  };

  const formatAmount = (amount: number, fromCurrency: Currency = "EUR"): string => {
    const converted = convertAmount(amount, fromCurrency);
    const symbol = currency === "EUR" ? "€" : "MAD";
    
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted) + " " + symbol;
  };

  const refreshExchangeRate = async () => {
    await loadExchangeRate();
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        exchangeRate,
        convertAmount,
        formatAmount,
        refreshExchangeRate,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
