import { useState, useEffect, useMemo } from "react";
import { criarLancamentoReceita } from "@/lib/financeiro-integration";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ShoppingCart, DollarSign, TrendingUp, Download } from "lucide-react";
import { toast } from "sonner";
import { exportarExcel } from "@/lib/export-excel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const contratoBadge: Record<string, { label: string; cls: string }> = {
  avista: { label: "À Vista", cls: "bg-green-100 text-green-800" },
  prazo: { label: "A Prazo", cls: "bg-yellow-100 text-yellow-800" },
  barter: { label: "Barter", cls: "bg-blue-100 text-blue-800" },
};

export default function ComercializacaoPage() {
  const { user } = useAuth();
  const { effectiveUserId, isImpersonating } = useEffectiveUser();
  const [vendas, setVendas] = useState<any[]>([]);
  const [safras, setSafras] = useState<any[]>([]);
  const [culturas, setCulturas] = useState<any[]>([]);
  const [contatos, setContatos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const PER_PAGE = 15;

  const [fSafra, setFSafra] = useState("all");
  const [fCultura, setFCultura] = useState("all");
  const [fComprador, setFComprador] = useState("all");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");

  const [form, setForm] = useState<any>({
    safra_id: "", cultura_id: "", comprador_id: "", quantidade: "", preco_unitario: "",
    data_venda: new Date().toISOString().split("T")[0], tipo_contrato: "avista", observacao: "",
  });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("comercializacao" as any)
      .select("*, safras:safra_id(nome), culturas:cultura_id(nome), contatos_financeiros:comprador_id(nome)")
      .eq("user_id", effectiveUserId).order("data_venda", { ascending: false });
    setVendas((data as any[]) || []);
    const { data: s } = await supabase.from("safras" as any).select("id, nome").eq("user_id", effectiveUserId);
    setSafras((s as any[]) || []);
    const { data: c } = await supabase.from("culturas" as any).select("id, nome").eq("user_id", effectiveUserId);
    setCulturas((c as any[]) || []);
    const { data: ct } = await supabase.from("contatos_financeiros").select("id, nome").eq("user_id", effectiveUserId).in("tipo", ["cliente", "ambos"]);
    setContatos((ct as any[]) || []);
  };
  useEffect(() => { load(); }, [user]);

  const filtered = useMemo(() => {
    let list = vendas;
    if (fSafra !== "all") list = list.filter(v => v.safra_id === fSafra);
    if (fCultura !== "all") list = list.filter(v => v.cultura_id === fCultura);
    if (fComprador !== "all") list = list.filter(v => v.comprador_id === fComprador);
    if (fDateFrom) list = list.filter(v => v.data_venda >= fDateFrom);
    if (fDateTo) list = list.filter(v => v.data_venda <= fDateTo);
    return list;
  }, [vendas, fSafra, fCultura, fComprador, fDateFrom, fDateTo]);

  const totalQty = filtered.reduce((s, v) => s + Number(v.quantidade), 0);
  const totalValor = filtered.reduce((s, v) => s + Number(v.valor_total), 0);
  const avgPreco = filtered.length > 0 ? filtered.reduce((s, v) => s + Number(v.preco_unitario), 0) / filtered.length : 0;

  // chart data by month
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(v => {
      const d = new Date(v.data_venda);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + Number(v.valor_total);
    });
    return Object.entries(map).sort().map(([m, v]) => {
      const [y, mo] = m.split("-");
      return { mes: `${mo}/${y}`, valor: v };
    });
  }, [filtered]);

  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const formValorTotal = form.quantidade && form.preco_unitario ? parseFloat(form.quantidade) * parseFloat(form.preco_unitario) : 0;

  const save = async () => {
    if (!user || !form.quantidade || !form.preco_unitario) return;
    const vt = formValorTotal;
    await supabase.from("comercializacao" as any).insert({
      safra_id: form.safra_id || null, cultura_id: form.cultura_id || null, comprador_id: form.comprador_id || null,
      quantidade: parseFloat(form.quantidade), preco_unitario: parseFloat(form.preco_unitario), valor_total: vt,
      data_venda: form.data_venda, tipo_contrato: form.tipo_contrato, observacao: form.observacao || null, user_id: user.id,
    } as any);
    // Financial integration
    try {
      const { data: cc } = await supabase.from("centros_custo").select("id").eq("user_id", effectiveUserId).ilike("nome", "%lavoura%").limit(1);
      if (cc && cc.length > 0) {
        const cultura = culturas.find(c => c.id === form.cultura_id);
        const comprador = contatos.find(c => c.id === form.comprador_id);
        const desc = `Venda ${cultura?.nome || "Grãos"} — ${parseFloat(form.quantidade).toLocaleString("pt-BR")} sacas${comprador ? ` para ${comprador.nome}` : ""}`;

        if (form.tipo_contrato === "avista") {
          const { data: cpr } = await supabase.from("contas_pr").insert({
            tipo: "receber", descricao: desc, valor_total: vt, valor_pago: vt,
            centro_custo_id: cc[0].id, data_vencimento: form.data_venda, data_pagamento: form.data_venda,
            status: "pago", user_id: user.id,
          } as any).select("id").single();
          await criarLancamentoReceita(user.id, vt, form.data_venda, desc, cc[0].id, (cpr as any)?.id);
        } else {
          const venc = new Date(form.data_venda);
          venc.setDate(venc.getDate() + 30);
          await supabase.from("contas_pr").insert({
            tipo: "receber", descricao: desc, valor_total: vt,
            centro_custo_id: cc[0].id, data_vencimento: venc.toISOString().split("T")[0],
            status: "aberto", user_id: user.id,
          } as any);
        }
      }
    } catch {}
    toast.success(`Venda registrada! Valor: R$ ${vt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    await supabase.from("comercializacao" as any).delete().eq("id", id);
    toast.success("Removida."); load();
  };

  const exportExcel = () => {
    exportarExcel({
      nomeArquivo: "comercializacao",
      titulo: "Relatório de Comercialização",
      colunas: [
        { header: "Data", key: "data_fmt", width: 15, tipo: "texto" },
        { header: "Safra", key: "safra", width: 20, tipo: "texto" },
        { header: "Cultura", key: "cultura", width: 20, tipo: "texto" },
        { header: "Comprador", key: "comprador", width: 25, tipo: "texto" },
        { header: "Quantidade", key: "quantidade", width: 15, tipo: "numero" },
        { header: "Preço Unit.", key: "preco", width: 15, tipo: "moeda" },
        { header: "Valor Total", key: "total", width: 18, tipo: "moeda" },
        { header: "Contrato", key: "contrato", width: 15, tipo: "texto" },
      ],
      dados: filtered.map((v: any) => ({
        data_fmt: new Date(v.data_venda).toLocaleDateString("pt-BR"),
        safra: v.safras?.nome || "",
        cultura: v.culturas?.nome || "",
        comprador: v.contatos_financeiros?.nome || "",
        quantidade: v.quantidade,
        preco: v.preco_unitario,
        total: v.valor_total,
        contrato: v.tipo_contrato || "",
      })),
    });
  };

  const openModal = () => {
    setForm({ safra_id: "", cultura_id: "", comprador_id: "", quantidade: "", preco_unitario: "", data_venda: new Date().toISOString().split("T")[0], tipo_contrato: "avista", observacao: "" });
    setOpen(true);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Comercialização</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel} className="gap-2"><Download className="h-4 w-4" /> Exportar Excel</Button>
          <Button onClick={openModal} className="gap-2"><Plus className="h-4 w-4" /> Nova Venda</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={fSafra} onValueChange={v => { setFSafra(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Safra" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas Safras</SelectItem>{safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fCultura} onValueChange={v => { setFCultura(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Cultura" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas</SelectItem>{culturas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fComprador} onValueChange={v => { setFComprador(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Comprador" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem>{contatos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" value={fDateFrom} onChange={e => { setFDateFrom(e.target.value); setPage(0); }} className="w-[150px]" />
        <Input type="date" value={fDateTo} onChange={e => { setFDateTo(e.target.value); setPage(0); }} className="w-[150px]" />
      </div>

      {/* Mini-cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-[#E5E7EB]"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center"><ShoppingCart className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-xs uppercase text-muted-foreground font-medium">Volume Vendido</p><p className="text-xl font-bold">{totalQty.toLocaleString("pt-BR")} sacas</p></div>
        </CardContent></Card>
        <Card className="border-[#E5E7EB]"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center"><DollarSign className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-xs uppercase text-muted-foreground font-medium">Receita Total</p><p className="text-xl font-bold text-green-600">R$ {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
        </CardContent></Card>
        <Card className="border-[#E5E7EB]"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-xs uppercase text-muted-foreground font-medium">Preço Médio</p><p className="text-xl font-bold">R$ {avgPreco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/saca</p></div>
        </CardContent></Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="border-[#E5E7EB]">
          <CardHeader><CardTitle className="text-base">Vendas por Mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                <Bar dataKey="valor" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Table>
        <TableHeader><TableRow className="bg-[#F9FAFB]">
          <TableHead className="text-[11px] uppercase">Data</TableHead>
          <TableHead className="text-[11px] uppercase">Safra</TableHead>
          <TableHead className="text-[11px] uppercase">Cultura</TableHead>
          <TableHead className="text-[11px] uppercase">Comprador</TableHead>
          <TableHead className="text-[11px] uppercase">Quantidade</TableHead>
          <TableHead className="text-[11px] uppercase">Preço Unit.</TableHead>
          <TableHead className="text-[11px] uppercase">Valor Total</TableHead>
          <TableHead className="text-[11px] uppercase">Contrato</TableHead>
          <TableHead className="text-[11px] uppercase">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {paged.map((v: any) => {
            const ct = contratoBadge[v.tipo_contrato] || contratoBadge.avista;
            return (
              <TableRow key={v.id} className="hover:bg-[#F8FAFC]">
                <TableCell>{new Date(v.data_venda).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>{v.safras?.nome || "—"}</TableCell>
                <TableCell>{v.culturas?.nome || "—"}</TableCell>
                <TableCell className="font-medium">{v.contatos_financeiros?.nome || "—"}</TableCell>
                <TableCell>{Number(v.quantidade).toLocaleString("pt-BR")}</TableCell>
                <TableCell>R$ {Number(v.preco_unitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="font-medium text-green-600">R$ {Number(v.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${ct.cls}`}>{ct.label}</span></TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(v.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Nenhuma venda registrada.</TableCell></TableRow>}
        </TableBody>
      </Table>

      {/* Totals */}
      {filtered.length > 0 && (
        <div className="text-sm text-muted-foreground bg-[#F9FAFB] p-3 rounded-md">
          Total Vendido: <strong>{totalQty.toLocaleString("pt-BR")} sacas</strong> | Receita Total: <strong className="text-green-600">R$ {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> | Preço Médio: <strong>R$ {avgPreco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/saca</strong>
        </div>
      )}

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
          <DialogHeader><DialogTitle>Nova Venda</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Safra *</Label>
                <Select value={form.safra_id || "none"} onValueChange={v => setForm((p: any) => ({ ...p, safra_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Selecione...</SelectItem>{safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Cultura *</Label>
                <Select value={form.cultura_id || "none"} onValueChange={v => setForm((p: any) => ({ ...p, cultura_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Selecione...</SelectItem>{culturas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Comprador *</Label>
              <Select value={form.comprador_id || "none"} onValueChange={v => setForm((p: any) => ({ ...p, comprador_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent><SelectItem value="none">Selecione...</SelectItem>{contatos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantidade *</Label><Input type="number" value={form.quantidade} onChange={e => setForm((p: any) => ({ ...p, quantidade: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Preço Unitário (R$) *</Label><Input type="number" step="0.01" value={form.preco_unitario} onChange={e => setForm((p: any) => ({ ...p, preco_unitario: e.target.value }))} /></div>
            </div>
            {formValorTotal > 0 && <p className="text-sm bg-green-50 text-green-800 p-2 rounded">Valor Total: <strong>R$ {formValorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data da Venda</Label><Input type="date" value={form.data_venda} onChange={e => setForm((p: any) => ({ ...p, data_venda: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Tipo de Contrato</Label>
                <Select value={form.tipo_contrato} onValueChange={v => setForm((p: any) => ({ ...p, tipo_contrato: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="avista">À Vista</SelectItem><SelectItem value="prazo">A Prazo</SelectItem><SelectItem value="barter">Barter</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Observação</Label><Textarea value={form.observacao} onChange={e => setForm((p: any) => ({ ...p, observacao: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={!form.quantidade || !form.preco_unitario}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
