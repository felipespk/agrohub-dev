import { Settings, Sprout, Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FarmIdentitySection, AccountDataSection, SecuritySection } from "@/components/settings/GlobalSettingsSections";
import { useNavigate } from "react-router-dom";

export default function LavouraConfiguracoesPage() {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="page-title text-2xl font-bold text-foreground">Configurações da Lavoura</h1>
        </div>
        <p className="text-sm text-muted-foreground">Gerencie as configurações gerais e específicas do módulo Lavoura</p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FarmIdentitySection module="lavoura" />
          <AccountDataSection />
        </div>

        <SecuritySection />

        <h2 className="text-lg font-semibold text-foreground pt-2">Configurações da Lavoura</h2>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-[#E5E7EB] hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/lavoura/culturas")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[16px]">
                <Sprout className="h-5 w-5 text-primary" />
                Culturas e Variedades
              </CardTitle>
              <CardDescription>Cadastre as culturas e variedades que você planta.</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-primary font-medium">Gerenciar Culturas →</span>
            </CardContent>
          </Card>

          <Card className="border-[#E5E7EB]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[16px]">
                <Scale className="h-5 w-5 text-primary" />
                Unidades de Medida
              </CardTitle>
              <CardDescription>Configure as unidades padrão de colheita.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">A unidade de colheita é configurada por cultura na tela de Culturas e Variedades.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
