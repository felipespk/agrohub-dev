import { useState, useEffect } from "react";
import { Settings, Tag, Target, DollarSign, ArrowRight, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FarmIdentitySection, AccountDataSection, SecuritySection } from "@/components/settings/GlobalSettingsSections";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function FinanceiroConfiguracoesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [moeda, setMoeda] = useState("BRL");
  const [formatoNumero, setFormatoNumero] = useState("br");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("moeda, formato_numero").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data) {
          if (data.moeda) setMoeda(data.moeda as string);
          if (data.formato_numero) setFormatoNumero(data.formato_numero as string);
        }
      });
  }, [user]);

  const handleSaveFormato = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from("profiles").update({ moeda, formato_numero: formatoNumero } as any).eq("user_id", user.id);
      toast.success("Configurações de moeda salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="page-title">Configurações do Financeiro</h1>
        </div>
        <p className="page-subtitle">Gerencie as configurações gerais e específicas do módulo Financeiro</p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FarmIdentitySection />
          <AccountDataSection />
        </div>

        <SecuritySection />

        <h2 className="text-lg font-semibold text-foreground pt-2">Configurações do Financeiro</h2>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-[#E5E7EB] cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate("/financeiro/categorias")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[16px]">
                <Tag className="h-5 w-5 text-primary" />
                Categorias Padrão
              </CardTitle>
              <CardDescription>Gerencie as categorias financeiras do plano de contas.</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-primary font-medium flex items-center gap-1">
                Gerenciar Categorias <ArrowRight className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>

          <Card className="border-[#E5E7EB] cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate("/financeiro/centros-custo")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[16px]">
                <Target className="h-5 w-5 text-primary" />
                Centros de Custo
              </CardTitle>
              <CardDescription>Configure as atividades da fazenda para controle de custos.</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-primary font-medium flex items-center gap-1">
                Gerenciar Centros de Custo <ArrowRight className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>

          <Card className="border-[#E5E7EB]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[16px]">
                <DollarSign className="h-5 w-5 text-primary" />
                Moeda e Formatação
              </CardTitle>
              <CardDescription>Configurações de moeda e formato numérico.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Select value={moeda} onValueChange={setMoeda}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">R$ — Real Brasileiro</SelectItem>
                    <SelectItem value="USD">US$ — Dólar Americano</SelectItem>
                    <SelectItem value="EUR">€ — Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Formato de número</Label>
                <Select value={formatoNumero} onValueChange={setFormatoNumero}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="br">1.234,56 (Brasil)</SelectItem>
                    <SelectItem value="us">1,234.56 (EUA/Internacional)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveFormato} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
              <p className="text-xs text-muted-foreground">Preparação para internacionalização futura. A formatação atual do sistema permanece em R$ pt-BR.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
