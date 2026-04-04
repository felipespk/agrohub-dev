import { useState, useEffect, useMemo } from "react";
import { criarLancamentoReceita } from "@/lib/financeiro-integration";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, Wheat, TrendingUp, TrendingDown, Droplets, Download } from "lucide-react";
import { toast } from "sonner";
import { exportarExcel } from "@/lib/export-excel";
import ExampleDataButtons from "@/components/ExampleDataButtons";

const destinoBadge: Record<string, { label: string; cls: string }> = {
  silo: { label: "Silo", cls: "bg-blue-100 text-blue-800" },
  venda_direta: { label: "Venda Direta", cls: "bg-green-100 text-green-800" },
  cooperativa: { label: "Cooperativa", cls: "bg-orange-100 text-orange-800" },
};

export default function ColheitasPage() {
  const { user } = useAuth();
  const [colheitas, setColheitas] = useState<any[]>([]);
  const [safras, setSafras] = useState<any[]>([]);
  const [culturas, setCulturas] = useState<any[]>([]);
  const [safraTalhoes, setSafraTalhoes] = useState<any[]>([]);
  const [contatos, setContatos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const PER_PAGE = 15;

  // filters
  const [fSafra, setFSafra] = useState("all");
  const [fTalhao, setFTalhao] = useState("all");
  const [fCultura, setFCultura] = useState("all");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");

  // form
  const [form, setForm] = useState<any>({
    safra_id: "", safra_talhao_id: "", data: new Date().toISOString().split("T")[0],
    quantidade: "", umidade_percentual: "", destino: "silo", observacao: "",
    comprador_id: "", preco_unitario: "",
  });
  const [areaTalhao, setAreaTalhao] = useState(0);
  const [formSafraTalhoes, setFormSafraTalhoes] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("colheitas" as any)
      .select("*, safra_talhoes:safra_talhao_id(talhoes:talhao_id(nome, area_hectares), culturas:cultura_id(nome, unidade_colheita), safras:safra_id(nome), meta_produtividade)")
      .eq("user_id", user.id).order("data", { ascending: false });
    setColheitas((data as any[]) || []);
    const { data: s } = await supabase.from("safras" as any).select("id, nome").eq("user_id", user.id);
    setSafras((s as any[]) || []);
    const { data: c } = await supabase.from("culturas" as any).select("id, nome").eq("user_id", user.id);
    setCulturas((c as any[]) || []);
    const { data: ct } = await supabase.from("contatos_financeiros").select("id, nome").eq("user_id", user.id).in("tipo", ["cliente", "ambos"]);
    setContatos((ct as any[]) || []);
  };
  useEffect(() => { load(); }, [user]);

  // load safra_talhoes for filter
  useEffect(() => {
    if (!user || fSafra === "all") { setSafraTalhoes([]); return; }
    supabase.from("safra_talhoes" as any).select("id, talhoes:talhao_id(nome, area_hectares), culturas:cultura_id(nome)")
      .eq("safra_id", fSafra).eq("user_id", user.id).then(({ data }) => setSafraTalhoes((data as any[]) || []));
  }, [fSafra, user]);

  const loadFormST = async (safraId: string) => {
    const { data } = await supabase.from("safra_talhoes" as any).select("id, talhoes:talhao_id(nome, area_hectares), culturas:cultura_id(nome, unidade_colheita)")
      .eq("safra_id", safraId).eq("user_id", user!.id);
    setFormSafraTalhoes((data as any[]) || []);
  };

  const filtered = useMemo(() => {
    let list = colheitas;
    if (fSafra !== "all") {
      const stIds = safraTalhoes.map((s: any) => s.id);
      list = list.filter(c => stIds.includes(c.safra_talhao_id));
    }
    if (fTalhao !== "all") list = list.filter(c => c.safra_talhao_id === fTalhao);
    if (fCultura !== "all") list = list.filter(c => c.safra_talhoes?.culturas?.nome === fCultura);
    if (fDateFrom) list = list.filter(c => c.data >= fDateFrom);
    if (fDateTo) list = list.filter(c => c.data <= fDateTo);
    return list;
  }, [colheitas, fSafra, fTalhao, fCultura, fDateFrom, fDateTo, safraTalhoes]);

  const totalQty = filtered.reduce((s, c) => s + Number(c.quantidade), 0);
  const avgProd = filtered.length > 0 ? filtered.reduce((s, c) => s + (Number(c.produtividade_calculada) || 0), 0) / filtered.length : 0;
  const avgUmid = filtered.filter(c => c.umidade_percentual).length > 0
    ? filtered.filter(c => c.umidade_percentual).reduce((s, c) => s + Number(c.umidade_percentual), 0) / filtered.filter(c => c.umidade_percentual).length : 0;
  const totalArea = filtered.reduce((s, c) => s + (Number(c.safra_talhoes?.talhoes?.area_hectares) || 0), 0);

  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const save = async () => {
    if (!user || !form.safra_talhao_id || !form.quantidade) return;
    const qty = parseFloat(form.quantidade);
    const prod = areaTalhao > 0 ? qty / areaTalhao : 0;
    await supabase.from("colheitas" as any).insert({
      safra_talhao_id: form.safra_talhao_id, data: form.data, quantidade: qty,
      umidade_percentual: form.umidade_percentual ? parseFloat(form.umidade_percentual) : null,
      produtividade_calculada: prod, destino: form.destino, observacao: form.observacao || null, user_id: user.id,
    } as any);

    // venda direta integration
    if (form.destino === "venda_direta" && form.preco_unitario) {
      const vt = qty * parseFloat(form.preco_unitario);
      const st = formSafraTalhoes.find((s: any) => s.id === form.safra_talhao_id);
      const cultName = st?.culturas?.nome || "Grãos";
      const talhName = st?.talhoes?.nome || "";
      // safra_id from form
      await supabase.from("comercializacao" as any).insert({
        safra_id: form.safra_id || null, cultura_id: null, comprador_id: form.comprador_id || null,
        quantidade: qty, preco_unitario: parseFloat(form.preco_unitario), valor_total: vt,
        data_venda: form.data, tipo_contrato: "avista", user_id: user.id,
      } as any);
      try {
        const { data: cc } = await supabase.from("centros_custo").select("id").eq("user_id", user.id).ilike("nome", "%lavoura%").limit(1);
        if (cc && cc.length > 0) {
          const { data: cpr } = await supabase.from("contas_pr").insert({
            tipo: "receber", descricao: `Venda colheita ${cultName} — ${talhName}`,
            valor_total: vt, valor_pago: vt, centro_custo_id: cc[0].id,
            data_vencimento: form.data, data_pagamento: form.data,
            status: "pago", user_id: user.id,
          } as any).select("id").single();
          await criarLancamentoReceita(user.id, vt, form.data, `Venda colheita ${cultName} — ${talhName}`, cc[0].id, (cpr as any)?.id);
        }
      } catch {}
    }

    toast.success(`Colheita registrada! Produtividade: ${prod.toFixed(1)} sacas/ha`);
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    await supabase.from("colheitas" as any).delete().eq("id", id);
    toast.success("Removida."); load();
  };

  const exportExcel = () => {
    exportarExcel({
      nomeArquivo: "colheitas",
      titulo: "Relatório de Colheitas",
      colunas: [
        { header: "Data", key: "data_fmt", width: 15, tipo: "texto" },
        { header: "Safra", key: "safra", width: 20, tipo: "texto" },
        { header: "Talhão", key: "talhao", width: 20, tipo: "texto" },
        { header: "Cultura", key: "cultura", width: 20, tipo: "texto" },
        { header: "Quantidade", key: "quantidade", width: 15, tipo: "numero" },
        { header: "Umidade %", key: "umidade", width: 12, tipo: "numero" },
        { header: "Produtividade", key: "produtividade", width: 15, tipo: "numero" },
        { header: "Destino", key: "destino", width: 18, tipo: "texto" },
      ],
      dados: filtered.map((c: any) => ({
        data_fmt: new Date(c.data).toLocaleDateString("pt-BR"),
        safra: c.safra_talhoes?.safras?.nome || "",
        talhao: c.safra_talhoes?.talhoes?.nome || "",
        cultura: c.safra_talhoes?.culturas?.nome || "",
        quantidade: c.quantidade,
        umidade: c.umidade_percentual || null,
        produtividade: c.produtividade_calculada || null,
        destino: c.destino || "",
      })),
    });
  };

  const hasExampleColheitas = colheitas.some((c: any) => c.observacao === "Dado de exemplo");

  const handleLoadColheitaExamples = async () => {
    if (!user) return;
    const { data: sfs } = await supabase.from("safras" as any).select("id").eq("nome", "Safra 2025/2026").eq("user_id", user.id).limit(1);
    if (!sfs || sfs.length === 0) { toast.warning("Cadastre a Safra 2025/2026 primeiro."); return; }
    const { data: sts } = await supabase.from("safra_talhoes" as any).select("id, talhoes:talhao_id(nome, area_hectares), culturas:cultura_id(nome)").eq("safra_id", (sfs as any[])[0].id).eq("user_id", user.id);
    const st1 = (sts as any[])?.find(s => s.talhoes?.nome === "Talhão 1");
    const st4 = (sts as any[])?.find(s => s.talhoes?.nome === "Talhão 4");

    const inserts: any[] = [];
    if (st1) inserts.push({ safra_talhao_id: st1.id, data: "2026-03-15", quantidade: 9750, umidade_percentual: 13.5, produtividade_calculada: 65, destino: "cooperativa", observacao: "Dado de exemplo", user_id: user.id });
    if (st4) inserts.push({ safra_talhao_id: st4.id, data: "2026-04-01", quantidade: 7200, umidade_percentual: 14.0, produtividade_calculada: 75.79, destino: "venda_direta", observacao: "Dado de exemplo", user_id: user.id });

    if (inserts.length === 0) { toast.warning("Vincule talhões à safra primeiro."); return; }
    await supabase.from("colheitas" as any).insert(inserts as any);

    // Venda direta for Talhão 4
    if (st4) {
      const vt = 7200 * 70;
      await supabase.from("comercializacao" as any).insert({
        safra_id: (sfs as any[])[0].id, quantidade: 7200, preco_unitario: 70, valor_total: vt,
        data_venda: "2026-04-01", tipo_contrato: "avista", observacao: "Dado de exemplo", user_id: user.id,
      } as any);
      try {
        const { data: cc } = await supabase.from("centros_custo").select("id").eq("user_id", user.id).ilike("nome", "%lavoura%").limit(1);
        if (cc && cc.length > 0) {
          const cultName = st4.culturas?.nome || "Grãos";
          const { data: cpr } = await supabase.from("contas_pr").insert({
            tipo: "receber", descricao: `Venda colheita ${cultName} — Talhão 4`,
            valor_total: vt, valor_pago: vt, centro_custo_id: cc[0].id,
            data_vencimento: "2026-04-01", data_pagamento: "2026-04-01",
            status: "pago", user_id: user.id,
          } as any).select("id").single();
          const { criarLancamentoReceita } = await import("@/lib/financeiro-integration");
          await criarLancamentoReceita(user.id, vt, "2026-04-01", `Venda colheita ${cultName} — Talhão 4`, cc[0].id, (cpr as any)?.id);
        }
      } catch {}
    }
    toast.success(`${inserts.length} colheitas inseridas!${st4 ? " Talhão 4 vendido por R$ 504.000." : ""}`);
    load();
  };

  const handleCleanColheitaExamples = async () => {
    if (!user) return;
    await supabase.from("colheitas" as any).delete().eq("observacao", "Dado de exemplo").eq("user_id", user.id);
    await supabase.from("comercializacao" as any).delete().eq("observacao", "Dado de exemplo").eq("user_id", user.id);
    toast.success("Colheitas de exemplo removidas.");
    load();
  };

  const openModal = () => {
    setForm({ safra_id: "", safra_talhao_id: "", data: new Date().toISOString().split("T")[0], quantidade: "", umidade_percentual: "", destino: "silo", observacao: "", comprador_id: "", preco_unitario: "" });
    setFormSafraTalhoes([]); setAreaTalhao(0); setOpen(true);
  };

  const selectedST = formSafraTalhoes.find((s: any) => s.id === form.safra_talhao_id);
  const unitLabel = selectedST?.culturas?.unidade_colheita || "sacas";
  const calcProd = form.quantidade && areaTalhao > 0 ? (parseFloat(form.quantidade) / areaTalhao) : 0;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Colheitas</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel} className="gap-2"><Download className="h-4 w-4" /> Exportar Excel</Button>
          <Button onClick={openModal} className="gap-2"><Plus className="h-4 w-4" /> Registrar Colheita</Button>
        </div>
      </div>

      <ExampleDataButtons
        showLoad={colheitas.length === 0}
        showClean={hasExampleColheitas}
        loadLabel="Carregar Colheitas de Exemplo"
        loadConfirmMsg="Isso vai inserir 2 colheitas de exemplo com venda direta integrada ao financeiro. Deseja continuar?"
        onLoad={handleLoadColheitaExamples}
        onClean={handleCleanColheitaExamples}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={fSafra} onValueChange={v => { setFSafra(v); setFTalhao("all"); setPage(0); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Safra" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas Safras</SelectItem>{safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
        </Select>
        {fSafra !== "all" && (
          <Select value={fTalhao} onValueChange={v => { setFTalhao(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Talhão" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos Talhões</SelectItem>{safraTalhoes.map((st: any) => <SelectItem key={st.id} value={st.id}>{st.talhoes?.nome}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Select value={fCultura} onValueChange={v => { setFCultura(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Cultura" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas</SelectItem>{culturas.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" value={fDateFrom} onChange={e => { setFDateFrom(e.target.value); setPage(0); }} className="w-[150px]" placeholder="De" />
        <Input type="date" value={fDateTo} onChange={e => { setFDateTo(e.target.value); setPage(0); }} className="w-[150px]" placeholder="Até" />
      </div>

      {/* Mini-cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-[#E5E7EB]"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center"><Wheat className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-xs uppercase text-muted-foreground font-medium">Total Colhido</p><p className="text-xl font-bold">{totalQty.toLocaleString("pt-BR")} sacas</p></div>
        </CardContent></Card>
        <Card className="border-[#E5E7EB]"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-xs uppercase text-muted-foreground font-medium">Produtividade Média</p><p className="text-xl font-bold">{avgProd > 0 ? `${avgProd.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} sacas/ha` : "—"}</p></div>
        </CardContent></Card>
        <Card className="border-[#E5E7EB]"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center"><Droplets className="h-5 w-5 text-cyan-600" /></div>
          <div><p className="text-xs uppercase text-muted-foreground font-medium">Umidade Média</p><p className="text-xl font-bold">{avgUmid > 0 ? `${avgUmid.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : "—"}</p></div>
        </CardContent></Card>
      </div>

      {/* Table */}
      <Table>
        <TableHeader><TableRow className="bg-[#F9FAFB]">
          <TableHead className="text-[11px] uppercase">Data</TableHead>
          <TableHead className="text-[11px] uppercase">Safra</TableHead>
          <TableHead className="text-[11px] uppercase">Talhão</TableHead>
          <TableHead className="text-[11px] uppercase">Cultura</TableHead>
          <TableHead className="text-[11px] uppercase">Quantidade</TableHead>
          <TableHead className="text-[11px] uppercase">Umidade %</TableHead>
          <TableHead className="text-[11px] uppercase">Produtividade</TableHead>
          <TableHead className="text-[11px] uppercase">Meta</TableHead>
          <TableHead className="text-[11px] uppercase">Meta vs Real</TableHead>
          <TableHead className="text-[11px] uppercase">Destino</TableHead>
          <TableHead className="text-[11px] uppercase">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {paged.map((c: any) => {
            const prod = Number(c.produtividade_calculada) || 0;
            const meta = Number(c.safra_talhoes?.meta_produtividade) || 0;
            const dest = destinoBadge[c.destino] || destinoBadge.silo;
            return (
              <TableRow key={c.id} className="hover:bg-[#F8FAFC]">
                <TableCell>{new Date(c.data).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>{c.safra_talhoes?.safras?.nome || "—"}</TableCell>
                <TableCell className="font-medium">{c.safra_talhoes?.talhoes?.nome || "—"}</TableCell>
                <TableCell>{c.safra_talhoes?.culturas?.nome || "—"}</TableCell>
                <TableCell>{Number(c.quantidade).toLocaleString("pt-BR")} {c.safra_talhoes?.culturas?.unidade_colheita?.split("/")[0] || "sacas"}</TableCell>
                <TableCell>{c.umidade_percentual ? `${Number(c.umidade_percentual).toFixed(1)}%` : "—"}</TableCell>
                <TableCell>{prod > 0 ? `${prod.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${c.safra_talhoes?.culturas?.unidade_colheita || "sacas/ha"}` : "—"}</TableCell>
                <TableCell>{meta > 0 ? `${meta.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}` : "—"}</TableCell>
                <TableCell>
                  {meta > 0 && prod > 0 ? (
                    prod >= meta
                      ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800"><TrendingUp className="h-3 w-3" />Acima</span>
                      : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800"><TrendingDown className="h-3 w-3" />Abaixo</span>
                  ) : "—"}
                </TableCell>
                <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${dest.cls}`}>{dest.label}</span></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-6">Nenhuma colheita registrada.</TableCell></TableRow>}
        </TableBody>
      </Table>

      {/* Totals footer */}
      {filtered.length > 0 && (
        <div className="text-sm text-muted-foreground bg-[#F9FAFB] p-3 rounded-md">
          Total Colhido: <strong>{totalQty.toLocaleString("pt-BR")} sacas</strong> | Produtividade Média: <strong>{avgProd.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} sacas/ha</strong> | Área Colhida: <strong>{totalArea.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} ha</strong>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground self-center">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próximo</Button>
        </div>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Registrar Colheita</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Safra *</Label>
                <Select value={form.safra_id || "none"} onValueChange={v => { const val = v === "none" ? "" : v; setForm((p: any) => ({ ...p, safra_id: val, safra_talhao_id: "" })); if (val) loadFormST(val); else setFormSafraTalhoes([]); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Selecione...</SelectItem>{safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Talhão *</Label>
                <Select value={form.safra_talhao_id || "none"} onValueChange={v => { const val = v === "none" ? "" : v; setForm((p: any) => ({ ...p, safra_talhao_id: val })); const st = formSafraTalhoes.find((s: any) => s.id === val); setAreaTalhao(Number(st?.talhoes?.area_hectares) || 0); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Selecione...</SelectItem>{formSafraTalhoes.map((st: any) => <SelectItem key={st.id} value={st.id}>{st.talhoes?.nome} — {st.culturas?.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Data *</Label><Input type="date" value={form.data} onChange={e => setForm((p: any) => ({ ...p, data: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantidade ({unitLabel}) *</Label><Input type="number" value={form.quantidade} onChange={e => setForm((p: any) => ({ ...p, quantidade: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Umidade (%)</Label><Input type="number" step="0.1" value={form.umidade_percentual} onChange={e => setForm((p: any) => ({ ...p, umidade_percentual: e.target.value }))} placeholder="Ex: 13.5" /></div>
            </div>
            {calcProd > 0 && <p className="text-sm bg-green-50 text-green-800 p-2 rounded">Produtividade: <strong>{calcProd.toFixed(1)} {unitLabel}/ha</strong></p>}
            <div className="space-y-2"><Label>Destino *</Label>
              <Select value={form.destino} onValueChange={v => setForm((p: any) => ({ ...p, destino: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="silo">Silo Próprio</SelectItem><SelectItem value="venda_direta">Venda Direta</SelectItem><SelectItem value="cooperativa">Cooperativa</SelectItem></SelectContent>
              </Select>
            </div>
            {form.destino === "venda_direta" && (
              <div className="space-y-4 border rounded-md p-3 bg-muted/30">
                <p className="text-sm font-medium">Dados da Venda Direta</p>
                <div className="space-y-2"><Label>Comprador</Label>
                  <Select value={form.comprador_id || "none"} onValueChange={v => setForm((p: any) => ({ ...p, comprador_id: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Selecione...</SelectItem>{contatos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Preço por {unitLabel.split("/")[0] || "saca"} (R$)</Label><Input type="number" step="0.01" value={form.preco_unitario} onChange={e => setForm((p: any) => ({ ...p, preco_unitario: e.target.value }))} /></div>
                {form.quantidade && form.preco_unitario && (
                  <p className="text-sm bg-green-50 text-green-800 p-2 rounded">Valor Total: <strong>R$ {(parseFloat(form.quantidade) * parseFloat(form.preco_unitario)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></p>
                )}
              </div>
            )}
            <div className="space-y-2"><Label>Observação</Label><Textarea value={form.observacao} onChange={e => setForm((p: any) => ({ ...p, observacao: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={!form.safra_talhao_id || !form.quantidade}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
