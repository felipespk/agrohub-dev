import { Beef } from "lucide-react";

export default function GadoPage() {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Beef className="h-6 w-6 text-primary" />
          <h1 className="page-title">Pecuária</h1>
        </div>
        <p className="page-subtitle">Cadastro de animais, pesagens, sanidade, compra e venda de gado.</p>
      </div>
      <div className="form-section flex flex-col items-center justify-center py-20 text-center">
        <Beef className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <p className="text-lg font-display font-semibold text-muted-foreground">Módulo Pecuária — Em breve</p>
        <p className="text-sm text-muted-foreground mt-1">Esta funcionalidade será implementada em breve.</p>
      </div>
    </div>
  );
}
