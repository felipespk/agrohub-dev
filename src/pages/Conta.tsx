import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFarm } from "@/contexts/FarmContext";
import { useAuth } from "@/contexts/AuthContext";
import { Settings, Building2, Save, User, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function ContaPage() {
  const { farmName, setFarmName, taxaExpedicao, setTaxaExpedicao } = useFarm();
  const { user } = useAuth();
  const [nome, setNome] = useState(farmName);
  const [taxa, setTaxa] = useState(String(taxaExpedicao));

  const handleSave = () => {
    const taxaNum = parseFloat(taxa.replace(",", "."));
    if (isNaN(taxaNum) || taxaNum < 0) {
      toast.error("Taxa de expedição inválida.");
      return;
    }
    setFarmName(nome.trim());
    setTaxaExpedicao(taxaNum);
    toast.success("Configurações salvas com sucesso!");
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="page-title">Conta</h1>
        </div>
        <p className="page-subtitle">Gerencie as configurações da sua conta e personalização do sistema</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Identidade da Fazenda
            </CardTitle>
            <CardDescription>
              Personalize o sistema com o nome da sua propriedade rural
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="farm-name">Nome da Fazenda / Empresa</Label>
              <Input
                id="farm-name"
                placeholder="Ex: Fazenda Santa Clara"
                value={nome}
                onChange={e => setNome(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Este nome será exibido no menu lateral do sistema
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxa-expedicao" className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                Taxa de Expedição por Tonelada (R$)
              </Label>
              <Input
                id="taxa-expedicao"
                type="text"
                inputMode="decimal"
                placeholder="15.00"
                value={taxa}
                onChange={e => setTaxa(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Valor cobrado por tonelada expedida. Padrão: R$ 15,00/ton
              </p>
            </div>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Dados da Conta
            </CardTitle>
            <CardDescription>
              Informações do usuário logado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={user?.email || ""} disabled className="bg-muted" />
            </div>
            <p className="text-xs text-muted-foreground">
              Para alterar o e-mail ou senha, utilize as opções de recuperação de conta.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
