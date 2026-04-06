import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFarm } from "@/contexts/FarmContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useMasterPassword } from "@/hooks/useMasterPassword";
import { Settings, Building2, Save, User, ShieldCheck, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function ContaPage() {
  const { farmName, setFarmName, loading } = useFarm();
  const { user } = useAuth();
  const { effectiveUserId, isImpersonating } = useEffectiveUser();
  const { hasPassword, refresh: refreshMasterPw } = useMasterPassword();
  const [nome, setNome] = useState(farmName);

  // Master password fields
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState("");

  useEffect(() => { setNome(farmName); }, [farmName]);

  const handleSave = () => {
    setFarmName(nome.trim());
    toast.success("Configurações salvas com sucesso!");
  };

  const handleSaveMasterPw = async () => {
    setPwError("");
    if (hasPassword && !currentPw.trim()) { setPwError("Informe a senha atual para alterar."); return; }
    if (newPw.length < 4) { setPwError("A senha deve ter pelo menos 4 caracteres."); return; }
    if (newPw !== confirmPw) { setPwError("As senhas não conferem."); return; }

    setSavingPw(true);
    try {
      const body: Record<string, string> = { action: "set", password: newPw };
      if (hasPassword) body.current_password = currentPw;

      const { data, error } = await supabase.functions.invoke("master-password", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(hasPassword ? "Senha Master atualizada com sucesso!" : "Senha Master cadastrada com sucesso!");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      refreshMasterPw();
    } catch (e: any) {
      const msg = e.message || "Erro ao salvar senha.";
      setPwError(msg);
      toast.error(msg);
    } finally {
      setSavingPw(false);
    }
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
            <CardDescription>Personalize o sistema com o nome da sua propriedade rural</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="farm-name">Nome da Fazenda / Empresa</Label>
              {loading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Input id="farm-name" placeholder="Ex: Fazenda Santa Clara" value={nome} onChange={e => setNome(e.target.value)} />
              )}
              <p className="text-xs text-muted-foreground">Este nome será exibido no menu lateral do sistema</p>
            </div>
            <Button onClick={handleSave} className="gap-2" disabled={loading}>
              <Save className="h-4 w-4" /> Salvar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Dados da Conta
            </CardTitle>
            <CardDescription>Informações do usuário logado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={user?.email || ""} disabled className="bg-muted" />
            </div>
            <p className="text-xs text-muted-foreground">Para alterar o e-mail ou senha, utilize as opções de recuperação de conta.</p>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Segurança e Auditoria
            </CardTitle>
            <CardDescription>
              Configure a Senha Master para proteger edições/exclusões de registros com mais de 48 horas.
              {hasPassword && (
                <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Lock className="h-3.5 w-3.5" /> Ativa
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 text-sm space-y-1">
                <p className="font-medium">Como funciona a Trava de 48h:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  <li>Registros com <strong>menos de 48h</strong> podem ser editados/excluídos livremente.</li>
                  <li>Após 48h, um <Lock className="inline h-3 w-3" /> cadeado aparece e a Senha Master é exigida.</li>
                  <li>A senha é criptografada e nunca armazenada em texto plano.</li>
                </ul>
              </div>

              {/* Current password — only shown when changing an existing password */}
              {hasPassword && (
                <div className="space-y-2">
                  <Label>Senha Atual</Label>
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      value={currentPw}
                      onChange={e => { setCurrentPw(e.target.value); setPwError(""); }}
                      placeholder="Informe a senha atual"
                      className="pr-10"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10" onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>{hasPassword ? "Nova Senha Master" : "Criar Senha Master"}</Label>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    value={newPw}
                    onChange={e => { setNewPw(e.target.value); setPwError(""); }}
                    placeholder="Mínimo 4 caracteres"
                    className="pr-10"
                  />
                  {!hasPassword && (
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10" onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirmar Senha Master</Label>
                <Input
                  type={showPw ? "text" : "password"}
                  value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); setPwError(""); }}
                  placeholder="Repita a senha"
                />
              </div>
              {pwError && <p className="text-sm font-medium text-destructive">{pwError}</p>}
              <Button onClick={handleSaveMasterPw} disabled={savingPw} className="gap-2">
                <Lock className="h-4 w-4" /> {savingPw ? "Salvando..." : hasPassword ? "Atualizar Senha Master" : "Cadastrar Senha Master"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
