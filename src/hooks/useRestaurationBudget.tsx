import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface RestaurationCost {
  programme_id: string | null;
  classe_id: string | null;
  total_cost: number;
  details: {
    module_id: string;
    module_titre: string;
    offre: string;
    unites: number;
    cout: number;
  }[];
}

export const useRestaurationBudget = () => {
  const { user } = useAuth();

  const calculateRestaurationCosts = async (): Promise<RestaurationCost[]> => {
    const { data: etats, error } = await supabase
      .from("etats_restauration")
      .select(`
        *,
        offres_restauration(*),
        modules(
          id, titre, classe_id,
          classes(id, programme_id)
        )
      `);

    if (error || !etats) {
      console.error("Erreur calcul restauration:", error);
      return [];
    }

    // Grouper par classe
    const costsByClasse = new Map<string, RestaurationCost>();

    etats.forEach((etat: any) => {
      const classeId = etat.modules?.classe_id;
      const programmeId = etat.modules?.classes?.programme_id;
      const cout = (etat.offres_restauration?.prix_unitaire || 0) * (etat.nombre_total_unites || 0);

      if (!classeId) return;

      if (!costsByClasse.has(classeId)) {
        costsByClasse.set(classeId, {
          programme_id: programmeId,
          classe_id: classeId,
          total_cost: 0,
          details: []
        });
      }

      const classeCost = costsByClasse.get(classeId)!;
      classeCost.total_cost += cout;
      classeCost.details.push({
        module_id: etat.module_id,
        module_titre: etat.modules?.titre || "",
        offre: `${etat.offres_restauration?.nature_restauration} - ${etat.offres_restauration?.formule_restauration}`,
        unites: etat.nombre_total_unites || 0,
        cout
      });
    });

    return Array.from(costsByClasse.values());
  };

  const syncRestaurationToBudget = async () => {
    try {
      const costs = await calculateRestaurationCosts();

      for (const cost of costs) {
        if (cost.total_cost === 0) continue;

        // Chercher si une ligne "Restauration" existe déjà pour cette classe
        const { data: existingItem } = await supabase
          .from("budget_items")
          .select("id, montant_realise")
          .eq("classe_id", cost.classe_id)
          .eq("categorie", "Restauration")
          .eq("type", "charge")
          .maybeSingle();

        const description = cost.details
          .map(d => `${d.module_titre}: ${d.unites} × (${d.offre})`)
          .join("; ");

        if (existingItem) {
          // Mettre à jour
          await supabase
            .from("budget_items")
            .update({
              montant_prevu: cost.total_cost,
              montant_realise: cost.total_cost,
              description: description.substring(0, 500)
            })
            .eq("id", existingItem.id);
        } else {
          // Créer
          await supabase
            .from("budget_items")
            .insert({
              type: "charge",
              categorie: "Restauration",
              description: description.substring(0, 500),
              montant_prevu: cost.total_cost,
              montant_realise: cost.total_cost,
              programme_id: cost.programme_id,
              classe_id: cost.classe_id,
              created_by: user?.id
            });
        }
      }

      return true;
    } catch (error) {
      console.error("Erreur sync restauration budget:", error);
      return false;
    }
  };

  const getRestaurationCostsByProgramme = async (programmeId: string) => {
    const { data, error } = await supabase
      .from("etats_restauration")
      .select(`
        *,
        offres_restauration(*),
        modules(
          id, titre, classe_id,
          classes!inner(id, programme_id)
        )
      `)
      .eq("modules.classes.programme_id", programmeId);

    if (error || !data) return 0;

    return data.reduce((sum: number, etat: any) => {
      return sum + (etat.offres_restauration?.prix_unitaire || 0) * (etat.nombre_total_unites || 0);
    }, 0);
  };

  const getRestaurationCostsByClasse = async (classeId: string) => {
    const { data, error } = await supabase
      .from("etats_restauration")
      .select(`
        *,
        offres_restauration(*),
        modules!inner(id, classe_id)
      `)
      .eq("modules.classe_id", classeId);

    if (error || !data) return 0;

    return data.reduce((sum: number, etat: any) => {
      return sum + (etat.offres_restauration?.prix_unitaire || 0) * (etat.nombre_total_unites || 0);
    }, 0);
  };

  return {
    calculateRestaurationCosts,
    syncRestaurationToBudget,
    getRestaurationCostsByProgramme,
    getRestaurationCostsByClasse
  };
};
