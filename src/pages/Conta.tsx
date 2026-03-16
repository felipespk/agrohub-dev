import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFarm } from "@/contexts/FarmContext";
import { useAuth } from "@/contexts/AuthContext";
import { Settings, Building2, Save, User } from "lucide-react";
import { toast } from "sonner";

export default function ContaPage() {
  const { farmName, setFarmName, loading } = useFarm();
  const { user } = useAuth();
  const [nome, setNome] = useState(farmName);

  // Sync local input when DB value arrives
  useEffect(() => {
    setNome(farmName);
  }, [farmName]);

  const handleSave = () => {
    setFarmName(nome.trim());
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
              {loading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Input
                  id="farm-name"
                  placeholder="Ex: Fazenda Santa Clara"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Este nome será exibido no menu lateral do sistema
              </p>
            </div>
            <Button onClick={handleSave} className="gap-2" disabled={loading}>
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
