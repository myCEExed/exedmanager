import { ReactNode } from "react";
import { Table } from "@/components/ui/table";

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

export const ResponsiveTable = ({ children, className = "" }: ResponsiveTableProps) => {
  return (
    <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="inline-block min-w-full align-middle">
        <Table className={className}>{children}</Table>
      </div>
    </div>
  );
};
