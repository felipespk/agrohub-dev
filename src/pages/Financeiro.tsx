import { DollarSign } from "lucide-react";

export default function FinanceiroPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          <h1 className="page-title">Financeiro</h1>
        </div>
        <p className="page-subtitle">Contas a pagar e receber, fluxo de caixa, controle por atividade.</p>
      </div>
      <div className="form-section flex flex-col items-center justify-center py-20 text-center">
        <DollarSign className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <p className="text-lg font-display font-semibold text-muted-foreground">Módulo Financeiro — Em breve</p>
        <p className="text-sm text-muted-foreground mt-1">Esta funcionalidade será implementada em breve.</p>
      </div>
    </div>
  );
}
