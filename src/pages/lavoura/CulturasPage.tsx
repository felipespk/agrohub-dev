import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Sprout } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_CULTURES = [
  { nome: "Soja", unidade_colheita: "sacas/ha", ciclo_medio_dias: 120 },
  { nome: "Milho", unidade_colheita: "sacas/ha", ciclo_medio_dias: 150 },
  { nome: "Arroz", unidade_colheita: "sacas/ha", ciclo_medio_dias: 130 },
  { nome: "Feijão", unidade_colheita: "sacas/ha", ciclo_medio_dias: 90 },
  { nome: "Trigo", unidade_colheita: "sacas/ha", ciclo_medio_dias: 120 },
  { nome: "Algodão", unidade_colheita: "arrobas/ha", ciclo_medio_dias: 180 },
  { nome: "Café", unidade_colheita: "sacas/ha", ciclo_medio_dias: 365 },
  { nome: "Cana-de-açúcar", unidade_colheita: "ton/ha", ciclo_medio_dias: 365 },
];

export default function CulturasPage() {
  const { user } = useAuth();
  const { effectiveUserId, isImpersonating } = useEffectiveUser();
  const [culturas, setCulturas] = useState<any[]>([]);
  const [variedades, setVariedades] = useState<Record<string, any[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openCultura, setOpenCultura] = useState(false);
  const [openVariedade, setOpenVariedade] = useState(false);
  const [editCultura, setEditCultura] = useState<any>(null);
  const [formC, setFormC] = useState({ nome: "", unidade_colheita: "sacas/ha", ciclo_medio_dias: "" });
  const [formV, setFormV] = useState({ cultura_id: "", nome: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("culturas" as any).select("*").eq("user_id", effectiveUserId).order("nome");
    const list = (data as any[]) || [];
    if (list.length === 0) {
      // Seed defaults
      const inserts = DEFAULT_CULTURES.map(c => ({ ...c, user_id: user.id }));
      await supabase.from("culturas" as any).insert(inserts as any);
      const { data: seeded } = await supabase.from("culturas" as any).select("*").eq("user_id", effectiveUserId).order("nome");
      setCulturas((seeded as any[]) || []);
      return;
    }
    setCulturas(list);
  };
  useEffect(() => { load(); }, [user]);

  const loadVariedades = async (culturaId: string) => {
    const { data } = await supabase.from("variedades_cultura" as any).select("*").eq("cultura_id", culturaId).eq("user_id", effectiveUserId).order("nome");
    setVariedades(prev => ({ ...prev, [culturaId]: (data as any[]) || [] }));
  };

  const saveCultura = async () => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    if (!user || !formC.nome.trim()) return;
    const payload: any = { nome: formC.nome.trim(), unidade_colheita: formC.unidade_colheita, ciclo_medio_dias: formC.ciclo_medio_dias ? parseInt(formC.ciclo_medio_dias) : null, user_id: user.id };
    if (editCultura) {
      await supabase.from("culturas" as any).update(payload).eq("id", editCultura.id);
      toast.success("Cultura atualizada!");
    } else {
      await supabase.from("culturas" as any).insert(payload);
      toast.success("Cultura cadastrada!");
    }
    setOpenCultura(false); load();
  };

  const removeCultura = async (id: string) => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    await supabase.from("culturas" as any).delete().eq("id", id);
    toast.success("Cultura removida."); load();
  };

  const saveVariedade = async () => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    if (!user || !formV.cultura_id || !formV.nome.trim()) return;
    await supabase.from("variedades_cultura" as any).insert({ cultura_id: formV.cultura_id, nome: formV.nome.trim(), user_id: user.id } as any);
    toast.success("Variedade adicionada!"); setOpenVariedade(false); loadVariedades(formV.cultura_id);
  };

  const removeVariedade = async (id: string, culturaId: string) => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    await supabase.from("variedades_cultura" as any).delete().eq("id", id);
    toast.success("Variedade removida."); loadVariedades(culturaId);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Culturas e Variedades</h1>
        <Button onClick={() => { setEditCultura(null); setFormC({ nome: "", unidade_colheita: "sacas/ha", ciclo_medio_dias: "" }); setOpenCultura(true); }} className="gap-2"><Plus className="h-4 w-4" /> Nova Cultura</Button>
      </div>

      <div className="space-y-3">
        {culturas.map((c: any) => {
          const isExpanded = expanded === c.id;
          const vars = variedades[c.id] || [];
          return (
            <Card key={c.id} className="border-[#E5E7EB]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => { if (isExpanded) { setExpanded(null); } else { setExpanded(c.id); loadVariedades(c.id); } }}>
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <Sprout className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-foreground">{c.nome}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{c.unidade_colheita}</span>
                    {c.ciclo_medio_dias && <span className="text-xs text-muted-foreground">{c.ciclo_medio_dias} dias</span>}
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditCultura(c); setFormC({ nome: c.nome, unidade_colheita: c.unidade_colheita, ciclo_medio_dias: c.ciclo_medio_dias ? String(c.ciclo_medio_dias) : "" }); setOpenCultura(true); }}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCultura(c.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-3 pl-10 space-y-2 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Variedades ({vars.length})</span>
                      <Button size="sm" variant="outline" onClick={() => { setFormV({ cultura_id: c.id, nome: "" }); setOpenVariedade(true); }} className="gap-1"><Plus className="h-3 w-3" /> Adicionar</Button>
                    </div>
                    {vars.map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between bg-muted/50 rounded px-3 py-1.5">
                        <span className="text-sm">{v.nome}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeVariedade(v.id, c.id)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                      </div>
                    ))}
                    {vars.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma variedade cadastrada.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={openCultura} onOpenChange={setOpenCultura}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCultura ? "Editar Cultura" : "Nova Cultura"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={formC.nome} onChange={e => setFormC(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Unidade de Colheita</Label>
              <Select value={formC.unidade_colheita} onValueChange={v => setFormC(p => ({ ...p, unidade_colheita: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["sacas/ha", "ton/ha", "kg/ha", "arrobas/ha"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Ciclo Médio (dias)</Label><Input type="number" value={formC.ciclo_medio_dias} onChange={e => setFormC(p => ({ ...p, ciclo_medio_dias: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenCultura(false)}>Cancelar</Button><Button onClick={saveCultura} disabled={!formC.nome.trim()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openVariedade} onOpenChange={setOpenVariedade}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Variedade</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome da Variedade *</Label><Input value={formV.nome} onChange={e => setFormV(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: TMG 2381" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenVariedade(false)}>Cancelar</Button><Button onClick={saveVariedade} disabled={!formV.nome.trim()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
