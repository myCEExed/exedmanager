import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileOptimizedProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component that adds mobile-friendly optimizations
 * - Better touch targets (min 44x44px)
 * - Tap highlight removal
 * - Touch manipulation optimization
 */
export const MobileOptimized = ({ children, className = "" }: MobileOptimizedProps) => {
  return (
    <div 
      className={cn(
        "tap-highlight-transparent touch-manipulation",
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * Mobile-optimized button group that stacks on mobile
 */
export const MobileButtonGroup = ({ children, className = "" }: MobileOptimizedProps) => {
  return (
    <div className={cn("button-group-mobile", className)}>
      {children}
    </div>
  );
};

/**
 * Mobile-optimized grid that adapts to screen sizes
 */
interface MobileGridProps extends MobileOptimizedProps {
  cols?: "2" | "3" | "4";
}

export const MobileGrid = ({ children, cols = "3", className = "" }: MobileGridProps) => {
  const gridClasses = {
    "2": "grid-cols-1 sm:grid-cols-2",
    "3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    "4": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridClasses[cols], className)}>
      {children}
    </div>
  );
};
