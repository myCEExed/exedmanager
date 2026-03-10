import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/hooks/useCurrency";
import { Euro, Banknote } from "lucide-react";

export function CurrencySwitch() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex items-center gap-3 bg-card border rounded-lg px-4 py-2">
      <div className="flex items-center gap-2">
        <Euro className="w-4 h-4 text-muted-foreground" />
        <Label htmlFor="currency-switch" className="text-sm font-medium cursor-pointer">
          EUR
        </Label>
      </div>
      <Switch
        id="currency-switch"
        checked={currency === "MAD"}
        onCheckedChange={(checked) => setCurrency(checked ? "MAD" : "EUR")}
      />
      <div className="flex items-center gap-2">
        <Banknote className="w-4 h-4 text-muted-foreground" />
        <Label htmlFor="currency-switch" className="text-sm font-medium cursor-pointer">
          MAD
        </Label>
      </div>
    </div>
  );
}
