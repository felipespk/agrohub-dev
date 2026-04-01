import { useState, useEffect, useCallback } from "react";
import { Settings, Tag, Scale, Weight, Save, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FarmIdentitySection, AccountDataSection, SecuritySection } from "@/components/settings/GlobalSettingsSections";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Raca {
  id: string;
  nome: string;
}

export default function GadoConfiguracoesPage() {
  const { user } = useAuth();

  // Raças state
  const [racas, setRacas] = useState<Raca[]>([]);
  const [novaRaca, setNovaRaca] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [loadingRacas, setLoadingRacas] = useState(true);

  // Gado settings
  const [rendimento, setRendimento] = useState("52");
  const [unidadePeso, setUnidadePeso] = useState("KG");
  const [exibirConversao, setExibirConversao] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchRacas = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("racas" as any).select("id, nome").eq("user_id", user.id).order("nome");
    setRacas((data as any as Raca[]) || []);
    setLoadingRacas(false);
  }, [user]);

  useEffect(() => {
    fetchRacas();
  }, [fetchRacas]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("rendimento_carcaca, unidade_peso, exibir_conversao").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data) {
          if (data.rendimento_carcaca != null) setRendimento(String(data.rendimento_carcaca));
          if (data.unidade_peso) setUnidadePeso(data.unidade_peso as string);
          if (data.exibir_conversao != null) setExibirConversao(data.exibir_conversao as boolean);
        }
      });
  }, [user]);

  const addRaca = async () => {
    if (!user || !novaRaca.trim()) return;
    const { error } = await supabase.from("racas" as any).insert({ nome: novaRaca.trim(), user_id: user.id } as any);
    if (error) { toast.error("Erro ao adicionar raça."); return; }
    toast.success("Raça adicionada!");
    setNovaRaca("");
    fetchRacas();
  };

  const saveEdit = async () => {
    if (!editId || !editNome.trim()) return;
    await supabase.from("racas" as any).update({ nome: editNome.trim() } as any).eq("id", editId);
    setEditId(null);
    fetchRacas();
  };

  const deleteRaca = async (id: string) => {
    await supabase.from("racas" as any).delete().eq("id", id);
    toast.success("Raça removida.");
    fetchRacas();
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setSavingSettings(true);
    try {
      await supabase.from("profiles").update({
        rendimento_carcaca: parseFloat(rendimento),
        unidade_peso: unidadePeso,
        exibir_conversao: exibirConversao,
      } as any).eq("user_id", user.id);
      toast.success("Configurações do gado salvas!");
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="page-title">Configurações do Gado</h1>
        </div>
        <p className="page-subtitle">Gerencie as configurações gerais e específicas do módulo Pecuária</p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FarmIdentitySection />
          <AccountDataSection />
        </div>

        <SecuritySection />

        <h2 className="text-lg font-semibold text-foreground pt-2">Configurações do Gado</h2>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Raças */}
          <Card className="border-[#E5E7EB]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[16px]">
                <Tag className="h-5 w-5 text-primary" />
                Raças Padrão
              </CardTitle>
              <CardDescription>Cadastre as raças de gado da fazenda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Nova raça..." value={novaRaca} onChange={e => setNovaRaca(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addRaca()} />
                <Button size="icon" onClick={addRaca} disabled={!novaRaca.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {loadingRacas ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : racas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma raça cadastrada.</p>
              ) : (
                <ul className="space-y-1.5">
                  {racas.map(r => (
                    <li key={r.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      {editId === r.id ? (
                        <>
                          <Input value={editNome} onChange={e => setEditNome(e.target.value)} className="h-7 text-sm flex-1"
                            onKeyDown={e => e.key === "Enter" && saveEdit()} />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}><Check className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditId(null)}><X className="h-3.5 w-3.5" /></Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1">{r.nome}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditId(r.id); setEditNome(r.nome); }}>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteRaca(r.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Rendimento de Carcaça */}
          <Card className="border-[#E5E7EB]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[16px]">
                <Scale className="h-5 w-5 text-primary" />
                Rendimento de Carcaça
              </CardTitle>
              <CardDescription>Configure o percentual padrão de rendimento de carcaça usado no cálculo de arrobas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Rendimento de Carcaça (%)</Label>
                <Input type="number" value={rendimento} onChange={e => setRendimento(e.target.value)}
                  min={40} max={60} step={0.5} />
                <p className="text-xs text-muted-foreground">
                  Padrão brasileiro para gado de corte: 50-54%. Este valor é usado para converter peso vivo em arrobas (@).
                  <br />Fórmula: Peso Vivo × Rendimento / 15 = Arrobas.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Unidade de Peso */}
          <Card className="border-[#E5E7EB]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[16px]">
                <Weight className="h-5 w-5 text-primary" />
                Unidade de Peso
              </CardTitle>
              <CardDescription>Configure a unidade de peso padrão exibida no sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Unidade Primária</Label>
                <Select value={unidadePeso} onValueChange={setUnidadePeso}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KG">KG — Quilogramas</SelectItem>
                    <SelectItem value="ARR">@ — Arrobas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={exibirConversao} onCheckedChange={setExibirConversao} />
                <Label className="cursor-pointer">Mostrar peso em KG e @ lado a lado</Label>
              </div>
              <p className="text-xs text-muted-foreground">Quando ativado, o sistema mostra ambas unidades em tabelas e fichas de animais.</p>
            </CardContent>
          </Card>
        </div>

        <Button onClick={handleSaveSettings} disabled={savingSettings} className="gap-2">
          <Save className="h-4 w-4" /> {savingSettings ? "Salvando..." : "Salvar Configurações do Gado"}
        </Button>
      </div>
    </div>
  );
}
