import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { exportarExcel } from "@/lib/export-excel";


const tipoBadge: Record<string, string> = {
  plantio: "bg-green-800 text-white", adubacao: "bg-blue-100 text-blue-800",
  pulverizacao: "bg-red-100 text-red-800", irrigacao: "bg-cyan-100 text-cyan-800",
  capina: "bg-yellow-100 text-yellow-800", colheita: "bg-amber-100 text-amber-800",
  outro: "bg-gray-100 text-gray-800",
};

export default function AtividadesPage() {
  const { user } = useAuth();
  const { effectiveUserId, isImpersonating } = useEffectiveUser();
  const [atividades, setAtividades] = useState<any[]>([]);
  const [safras, setSafras] = useState<any[]>([]);
  const [safraTalhoes, setSafraTalhoes] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [filterSafra, setFilterSafra] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [safraTalhoesFilter, setSafraTalhoesFilter] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ safra_id: "", safra_talhao_id: "", tipo: "plantio", data: new Date().toISOString().split("T")[0], area_coberta_ha: "", insumo_id: "", quantidade_insumo: "", maquina_id: "", horas_maquina: "", operador: "", condicao_climatica: "", observacao: "" });
  const [custoCalc, setCustoCalc] = useState(0);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("atividades_campo" as any).select("*, safra_talhoes:safra_talhao_id(safras:safra_id(nome), talhoes:talhao_id(nome)), insumos:insumo_id(nome, unidade_medida), maquinas:maquina_id(nome)").eq("user_id", effectiveUserId).order("data", { ascending: false }).limit(100);
    setAtividades((data as any[]) || []);
    const { data: s } = await supabase.from("safras" as any).select("id, nome").eq("user_id", effectiveUserId).order("created_at", { ascending: false });
    setSafras((s as any[]) || []);
    const { data: ins } = await supabase.from("insumos" as any).select("id, nome, preco_unitario, unidade_medida").eq("user_id", effectiveUserId);
    setInsumos((ins as any[]) || []);
    const { data: maq } = await supabase.from("maquinas" as any).select("id, nome, custo_hora").eq("user_id", effectiveUserId);
    setMaquinas((maq as any[]) || []);
  };
  useEffect(() => { load(); }, [user]);

  // Load safra_talhoes for filter
  useEffect(() => {
    if (!user || filterSafra === "all") { setSafraTalhoesFilter([]); return; }
    supabase.from("safra_talhoes" as any).select("id").eq("safra_id", filterSafra).eq("user_id", effectiveUserId)
      .then(({ data }) => setSafraTalhoesFilter((data as any[]) || []));
  }, [filterSafra, user]);

  const loadSafraTalhoes = async (safraId: string) => {
    const { data } = await supabase.from("safra_talhoes" as any).select("id, talhoes:talhao_id(nome, area_hectares)").eq("safra_id", safraId).eq("user_id", user!.id);
    setSafraTalhoes((data as any[]) || []);
  };

  useEffect(() => {
    // Calculate cost
    const insumo = insumos.find(i => i.id === form.insumo_id);
    const maquina = maquinas.find(m => m.id === form.maquina_id);
    const insumoCost = insumo ? (parseFloat(form.quantidade_insumo) || 0) * Number(insumo.preco_unitario) : 0;
    const maqCost = maquina ? (parseFloat(form.horas_maquina) || 0) * Number(maquina.custo_hora) : 0;
    setCustoCalc(insumoCost + maqCost);
  }, [form.insumo_id, form.quantidade_insumo, form.maquina_id, form.horas_maquina, insumos, maquinas]);

  const save = async () => {
    if (!user || !form.safra_talhao_id || !form.tipo) return;
    const payload: any = {
      safra_talhao_id: form.safra_talhao_id, tipo: form.tipo, data: form.data,
      area_coberta_ha: form.area_coberta_ha ? parseFloat(form.area_coberta_ha) : null,
      insumo_id: form.insumo_id || null, quantidade_insumo: form.quantidade_insumo ? parseFloat(form.quantidade_insumo) : null,
      maquina_id: form.maquina_id || null, horas_maquina: form.horas_maquina ? parseFloat(form.horas_maquina) : null,
      operador: form.operador || null, condicao_climatica: form.condicao_climatica || null,
      observacao: form.observacao || null, custo_total: custoCalc, user_id: user.id,
    };
    const { error } = await supabase.from("atividades_campo" as any).insert(payload);
    if (error) { toast.error("Erro ao salvar atividade."); return; }

    // Stock deduction if insumo used
    if (form.insumo_id && form.quantidade_insumo) {
      const qty = parseFloat(form.quantidade_insumo);
      await supabase.from("movimentacoes_insumo" as any).insert({ insumo_id: form.insumo_id, tipo: "saida", quantidade: qty, data: form.data, user_id: user.id } as any);
      const insumo = insumos.find(i => i.id === form.insumo_id);
      if (insumo) {
        const newStock = Math.max(0, Number(insumo.estoque_atual) - qty);
        await supabase.from("insumos" as any).update({ estoque_atual: newStock } as any).eq("id", form.insumo_id);
        if (newStock < Number(insumo.estoque_minimo)) {
          toast.warning(`Atenção: estoque de ${insumo.nome} abaixo do mínimo!`);
        }
      }
    }

    toast.success("Atividade registrada!"); setOpen(false); load();
  };

  const remove = async (id: string) => {
    await supabase.from("atividades_campo" as any).delete().eq("id", id);
    toast.success("Atividade removida."); load();
  };

  const filtered = atividades.filter(a => {
    if (filterSafra !== "all") {
      const safraSTIds = safraTalhoesFilter.map(st => st.id);
      if (!safraSTIds.includes(a.safra_talhao_id)) return false;
    }
    if (filterTipo !== "all" && a.tipo !== filterTipo) return false;
    return true;
  });

  const exportExcel = () => {
    exportarExcel({
      nomeArquivo: "caderno-de-campo",
      titulo: "Caderno de Campo",
      colunas: [
        { header: "Data", key: "data_fmt", width: 15, tipo: "texto" },
        { header: "Safra", key: "safra", width: 20, tipo: "texto" },
        { header: "Talhão", key: "talhao", width: 20, tipo: "texto" },
        { header: "Tipo", key: "tipo", width: 15, tipo: "texto" },
        { header: "Insumo", key: "insumo", width: 25, tipo: "texto" },
        { header: "Máquina", key: "maquina", width: 25, tipo: "texto" },
        { header: "Área (ha)", key: "area", width: 12, tipo: "numero" },
        { header: "Custo (R$)", key: "custo", width: 18, tipo: "moeda" },
      ],
      dados: filtered.map((a: any) => ({
        data_fmt: new Date(a.data).toLocaleDateString("pt-BR"),
        safra: a.safra_talhoes?.safras?.nome || "",
        talhao: a.safra_talhoes?.talhoes?.nome || "",
        tipo: a.tipo,
        insumo: a.insumos?.nome || "",
        maquina: a.maquinas?.nome || "",
        area: a.area_coberta_ha || null,
        custo: a.custo_total || null,
      })),
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Caderno de Campo</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel} className="gap-2"><Download className="h-4 w-4" /> Exportar Excel</Button>
          <Button onClick={() => { setForm({ safra_id: "", safra_talhao_id: "", tipo: "plantio", data: new Date().toISOString().split("T")[0], area_coberta_ha: "", insumo_id: "", quantidade_insumo: "", maquina_id: "", horas_maquina: "", operador: "", condicao_climatica: "", observacao: "" }); setSafraTalhoes([]); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Nova Atividade</Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={filterSafra} onValueChange={setFilterSafra}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Safra" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Safras</SelectItem>
            {safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            {["plantio", "adubacao", "pulverizacao", "irrigacao", "capina", "colheita", "outro"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-[#F9FAFB]">
            <TableHead className="text-[11px] uppercase">Data</TableHead>
            <TableHead className="text-[11px] uppercase">Safra</TableHead>
            <TableHead className="text-[11px] uppercase">Talhão</TableHead>
            <TableHead className="text-[11px] uppercase">Tipo</TableHead>
            <TableHead className="text-[11px] uppercase">Insumo</TableHead>
            <TableHead className="text-[11px] uppercase">Máquina</TableHead>
            <TableHead className="text-[11px] uppercase">Área (ha)</TableHead>
            <TableHead className="text-[11px] uppercase">Custo (R$)</TableHead>
            <TableHead className="text-[11px] uppercase">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((a: any) => (
            <TableRow key={a.id} className="hover:bg-[#F8FAFC]">
              <TableCell>{new Date(a.data).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell>{a.safra_talhoes?.safras?.nome || "—"}</TableCell>
              <TableCell>{a.safra_talhoes?.talhoes?.nome || "—"}</TableCell>
              <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${tipoBadge[a.tipo] || tipoBadge.outro}`}>{a.tipo}</span></TableCell>
              <TableCell className="text-sm">{a.insumos ? `${a.insumos.nome}${a.quantidade_insumo ? ` — ${Number(a.quantidade_insumo).toLocaleString("pt-BR")} ${a.insumos.unidade_medida || ""}` : ""}` : "—"}</TableCell>
              <TableCell>{a.maquinas?.nome || "—"}</TableCell>
              <TableCell>{a.area_coberta_ha ? Number(a.area_coberta_ha).toLocaleString("pt-BR", { minimumFractionDigits: 1 }) : "—"}</TableCell>
              <TableCell>{Number(a.custo_total) > 0 ? `R$ ${Number(a.custo_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</TableCell>
              <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(a.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Nenhuma atividade registrada.</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[640px]">
          <DialogHeader><DialogTitle>Nova Atividade</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Safra *</Label>
                <Select value={form.safra_id} onValueChange={v => { setForm((p: any) => ({ ...p, safra_id: v, safra_talhao_id: "" })); loadSafraTalhoes(v); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Talhão *</Label>
                <Select value={form.safra_talhao_id} onValueChange={v => { const st = safraTalhoes.find((s: any) => s.id === v); setForm((p: any) => ({ ...p, safra_talhao_id: v, area_coberta_ha: st?.talhoes?.area_hectares ? String(st.talhoes.area_hectares) : "" })); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{safraTalhoes.map((st: any) => <SelectItem key={st.id} value={st.id}>{st.talhoes?.nome || "?"}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm((p: any) => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["plantio", "adubacao", "pulverizacao", "irrigacao", "capina", "colheita", "outro"].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Data *</Label><Input type="date" value={form.data} onChange={e => setForm((p: any) => ({ ...p, data: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Área Coberta (ha)</Label><Input type="number" value={form.area_coberta_ha} onChange={e => setForm((p: any) => ({ ...p, area_coberta_ha: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Insumo</Label>
                <Select value={form.insumo_id || "none"} onValueChange={v => setForm((p: any) => ({ ...p, insumo_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Nenhum</SelectItem>{insumos.map(i => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Quantidade</Label><Input type="number" value={form.quantidade_insumo} onChange={e => setForm((p: any) => ({ ...p, quantidade_insumo: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Máquina</Label>
                <Select value={form.maquina_id || "none"} onValueChange={v => setForm((p: any) => ({ ...p, maquina_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{maquinas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Horas</Label><Input type="number" value={form.horas_maquina} onChange={e => setForm((p: any) => ({ ...p, horas_maquina: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Operador</Label><Input value={form.operador} onChange={e => setForm((p: any) => ({ ...p, operador: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Condição Climática</Label><Input value={form.condicao_climatica} onChange={e => setForm((p: any) => ({ ...p, condicao_climatica: e.target.value }))} placeholder="Ex: Ensolarado, 28°C" /></div>
            </div>
            <div className="space-y-2"><Label>Observação</Label><Textarea value={form.observacao} onChange={e => setForm((p: any) => ({ ...p, observacao: e.target.value }))} /></div>
            {custoCalc > 0 && <div className="bg-muted p-3 rounded-md text-sm font-medium">Custo estimado: R$ {custoCalc.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!form.safra_talhao_id || !form.tipo}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
