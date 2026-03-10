import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Responsive header component optimized for mobile
 * Stacks title and actions on mobile, side-by-side on desktop
 */
export const MobileHeader = ({ 
  title, 
  description, 
  actions, 
  className = "" 
}: MobileHeaderProps) => {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", className)}>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};
