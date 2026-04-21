import { Settings, Wheat, ListTree, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FarmIdentitySection, AccountDataSection, SecuritySection } from "@/components/settings/GlobalSettingsSections";
import { useNavigate } from "react-router-dom";

export default function SecadorConfiguracoesPage() {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="page-title">Configurações do Secador</h1>
        </div>
        <p className="page-subtitle">Gerencie as configurações gerais e específicas do módulo Secador</p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FarmIdentitySection />
          <AccountDataSection />
        </div>

        <SecuritySection />

        <h2 className="text-lg font-semibold text-foreground pt-2">Configurações do Secador</h2>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-[#E5E7EB] cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate("/cadastro")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[16px]">
                <Wheat className="h-5 w-5 text-primary" />
                Tipos de Grãos
              </CardTitle>
              <CardDescription>Cadastre os tipos de grãos que o secador recebe.</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-primary font-medium flex items-center gap-1">
                Gerenciar Tipos de Grãos <ArrowRight className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>

          <Card className="border-[#E5E7EB] cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate("/cadastro")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[16px]">
                <ListTree className="h-5 w-5 text-primary" />
                Variedades
              </CardTitle>
              <CardDescription>Gerencie as variedades de cada tipo de grão (pai-filho).</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-primary font-medium flex items-center gap-1">
                Gerenciar Variedades <ArrowRight className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>

          <Card className="border-[#E5E7EB] cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate("/quebra-tecnica")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[16px]">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Quebra Técnica
              </CardTitle>
              <CardDescription>Configure os percentuais de desconto por umidade e impureza.</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-primary font-medium flex items-center gap-1">
                Gerenciar Quebra Técnica <ArrowRight className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
