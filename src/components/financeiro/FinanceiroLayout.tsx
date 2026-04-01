import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FinanceiroSidebar } from "./FinanceiroSidebar";
import { Wheat } from "lucide-react";

export function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <FinanceiroSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border bg-card px-4 gap-3 shrink-0">
            <SidebarTrigger className="text-muted-foreground" />
            <div className="flex items-center gap-2 md:hidden">
              <Wheat className="h-5 w-5 text-primary" />
              <span className="font-bold text-foreground text-sm">AgroHub</span>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
