import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardButtonGroupProps {
  children: ReactNode;
  className?: string;
}

/**
 * Composant pour gérer les groupes de boutons dans les cartes
 * Garantit que les boutons restent toujours dans leurs conteneurs
 * avec un comportement responsive optimal
 * 
 * Caractéristiques :
 * - flex-wrap : permet aux boutons de passer à la ligne si nécessaire
 * - gap-2 : espacement uniforme entre les boutons
 * - min-w-[100px] : largeur minimale pour chaque bouton (à appliquer aux boutons enfants)
 * - flex-1 : répartition équitable de l'espace (à appliquer aux boutons enfants)
 * 
 * Usage :
 * ```tsx
 * <CardButtonGroup>
 *   <Button className="flex-1 min-w-[100px]">Action 1</Button>
 *   <Button className="flex-1 min-w-[100px]">Action 2</Button>
 * </CardButtonGroup>
 * ```
 */
export const CardButtonGroup = ({ children, className = "" }: CardButtonGroupProps) => {
  return (
    <div className={cn("mt-4 flex flex-wrap gap-2", className)}>
      {children}
    </div>
  );
};
