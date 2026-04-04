import { useState, useMemo } from "react";
import { Plus, Check, Pencil, Trash2, Search, Download } from "lucide-react";
import { exportarExcel } from "@/lib/export-excel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useFinanceiro } from "@/contexts/FinanceiroContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatarMoeda, formatarData } from "@/lib/format";
import { toast } from "sonner";

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  aberto: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400", label: "Aberto" },
  pago: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Pago" },
  vencido: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", label: "Vencido" },
  parcial: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Parcial" },
};

interface ContasPRPageProps { tipo: "pagar" | "receber"; }

export default function ContasPRPage({ tipo }: ContasPRPageProps) {
  const { contasPR, centrosCusto, categorias, contatos, contasBancarias, reload } = useFinanceiro();
  const { user } = useAuth();
  const isPagar = tipo === "pagar";
  const title = isPagar ? "Contas a Pagar" : "Contas a Receber";
  const contatoLabel = isPagar ? "Fornecedor" : "Cliente";
  const contatoTipos = isPagar ? ["fornecedor", "ambos"] : ["cliente", "ambos"];
  const catTipo = isPagar ? "despesa" : "receita";

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroCentro, setFiltroCentro] = useState("todos");
  const [filtroInicio, setFiltroInicio] = useState("");
  const [filtroFim, setFiltroFim] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [baixaOpen, setBaixaOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [baixaItem, setBaixaItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 10;

  const [form, setForm] = useState({ descricao: "", valor_total: "", data_vencimento: "", contato_id: "", categoria_id: "", centro_custo_id: "", conta_bancaria_id: "", observacao: "" });
  const [baixaForm, setBaixaForm] = useState({ data_pagamento: new Date().toISOString().split("T")[0], valor_pago: "", conta_bancaria_id: "" });

  const today = new Date().toISOString().split("T")[0];

  const contas = useMemo(() => {
    let list = contasPR.filter(c => c.tipo === tipo);
    list = list.map(c => {
      if (c.status === "aberto" && c.data_vencimento < today) return { ...c, status: "vencido" };
      if (Number(c.valor_pago) > 0 && Number(c.valor_pago) < Number(c.valor_total) && c.status !== "parcial") return { ...c, status: "parcial" };
      if (Number(c.valor_pago) >= Number(c.valor_total) && c.status !== "pago") return { ...c, status: "pago" };
      return c;
    });
    if (busca) list = list.filter(c => c.descricao.toLowerCase().includes(busca.toLowerCase()));
    if (filtroStatus !== "todos") list = list.filter(c => c.status === filtroStatus);
    if (filtroCentro !== "todos") list = list.filter(c => c.centro_custo_id === filtroCentro);
    if (filtroInicio) list = list.filter(c => c.data_vencimento >= filtroInicio);
    if (filtroFim) list = list.filter(c => c.data_vencimento <= filtroFim);
    return list;
  }, [contasPR, tipo, busca, filtroStatus, filtroCentro, filtroInicio, filtroFim, today]);

  const totalAberto = contas.filter(c => c.status === "aberto").reduce((s, c) => s + (Number(c.valor_total) - Number(c.valor_pago)), 0);
  const totalVencido = contas.filter(c => c.status === "vencido").reduce((s, c) => s + (Number(c.valor_total) - Number(c.valor_pago)), 0);
  const totalPago = contas.filter(c => c.status === "pago").reduce((s, c) => s + Number(c.valor_total), 0);

  const paged = contas.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(contas.length / perPage);

  const openNew = () => { setEditItem(null); setForm({ descricao: "", valor_total: "", data_vencimento: "", contato_id: "", categoria_id: "", centro_custo_id: "", conta_bancaria_id: "", observacao: "" }); setModalOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setForm({ descricao: item.descricao, valor_total: String(item.valor_total), data_vencimento: item.data_vencimento, contato_id: item.contato_id || "", categoria_id: item.categoria_id || "", centro_custo_id: item.centro_custo_id || "", conta_bancaria_id: item.conta_bancaria_id || "", observacao: item.observacao || "" }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.descricao || !form.valor_total || !form.data_vencimento || !form.centro_custo_id) { toast.error("Preencha descrição, valor, vencimento e centro de custo."); return; }
    setSaving(true);
    const payload = { tipo, descricao: form.descricao, valor_total: parseFloat(form.valor_total), data_vencimento: form.data_vencimento, contato_id: form.contato_id || null, categoria_id: form.categoria_id || null, centro_custo_id: form.centro_custo_id, conta_bancaria_id: form.conta_bancaria_id || null, observacao: form.observacao || null, user_id: user!.id };
    if (editItem) { await supabase.from("contas_pr").update(payload).eq("id", editItem.id); }
    else { await supabase.from("contas_pr").insert({ ...payload, status: "aberto", valor_pago: 0 }); }
    setSaving(false); setModalOpen(false); toast.success(editItem ? "Conta atualizada!" : "Conta criada!"); reload();
  };

  const openBaixa = (item: any) => { setBaixaItem(item); setBaixaForm({ data_pagamento: today, valor_pago: String(Number(item.valor_total) - Number(item.valor_pago)), conta_bancaria_id: item.conta_bancaria_id || "" }); setBaixaOpen(true); };

  const handleBaixa = async () => {
    if (!baixaForm.valor_pago || !baixaForm.conta_bancaria_id) { toast.error("Preencha valor e conta bancária."); return; }
    setSaving(true);
    const valorPago = parseFloat(baixaForm.valor_pago);
    const novoValorPago = Number(baixaItem.valor_pago) + valorPago;
    const novoStatus = novoValorPago >= Number(baixaItem.valor_total) ? "pago" : "parcial";
    await supabase.from("contas_pr").update({ valor_pago: novoValorPago, status: novoStatus, data_pagamento: novoStatus === "pago" ? baixaForm.data_pagamento : null }).eq("id", baixaItem.id);
    await supabase.from("lancamentos").insert({ tipo: isPagar ? "despesa" : "receita", valor: valorPago, data: baixaForm.data_pagamento, descricao: `Baixa: ${baixaItem.descricao}`, categoria_id: baixaItem.categoria_id || null, centro_custo_id: baixaItem.centro_custo_id, conta_bancaria_id: baixaForm.conta_bancaria_id, conta_pr_id: baixaItem.id, user_id: user!.id });
    const conta = contasBancarias.find(c => c.id === baixaForm.conta_bancaria_id);
    if (conta) {
      const novoSaldo = isPagar ? Number(conta.saldo_atual) - valorPago : Number(conta.saldo_atual) + valorPago;
      await supabase.from("contas_bancarias").update({ saldo_atual: novoSaldo }).eq("id", conta.id);
    }
    setSaving(false); setBaixaOpen(false); toast.success("Baixa realizada!"); reload();
  };

  const handleDelete = async (id: string) => { if (!confirm("Excluir esta conta?")) return; await supabase.from("contas_pr").delete().eq("id", id); toast.success("Conta excluída!"); reload(); };

  const contatosFiltrados = contatos.filter(c => contatoTipos.includes(c.tipo));
  const categoriasFiltradas = categorias.filter(c => c.tipo === catTipo);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas contas a {isPagar ? "pagar" : "receber"}</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nova Conta</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-card rounded-lg border border-border p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{isPagar ? "Total em Aberto" : "Total a Receber"}</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{formatarMoeda(totalAberto)}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Vencido</p>
          <p className={`text-xl font-bold mt-1 ${totalVencido > 0 ? "text-red-500 animate-pulse" : "text-foreground"}`}>{formatarMoeda(totalVencido)}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{isPagar ? "Total Pago" : "Total Recebido"}</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatarMoeda(totalPago)}</p>
        </div>
      </div>

      {/* Filters + Table */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-xs">Buscar</Label>
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Descrição..." value={busca} onChange={e => { setBusca(e.target.value); setPage(0); }} /></div>
          </div>
          <div><Label className="text-xs">Status</Label>
            <Select value={filtroStatus} onValueChange={v => { setFiltroStatus(v); setPage(0); }}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="aberto">Aberto</SelectItem><SelectItem value="pago">Pago</SelectItem><SelectItem value="vencido">Vencido</SelectItem><SelectItem value="parcial">Parcial</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Centro de Custo</Label>
            <Select value={filtroCentro} onValueChange={v => { setFiltroCentro(v); setPage(0); }}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos</SelectItem>{centrosCusto.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">De</Label><Input type="date" value={filtroInicio} onChange={e => { setFiltroInicio(e.target.value); setPage(0); }} /></div>
          <div><Label className="text-xs">Até</Label><Input type="date" value={filtroFim} onChange={e => { setFiltroFim(e.target.value); setPage(0); }} /></div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="bg-muted/30">
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Status</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Descrição</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{contatoLabel}</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Categoria</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Centro Custo</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right">Valor</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Vencimento</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma conta encontrada.</TableCell></TableRow>
              ) : paged.map(c => {
                const sc = statusConfig[c.status] || statusConfig.aberto;
                const isVencido = c.status === "vencido";
                const centro = centrosCusto.find(cc => cc.id === c.centro_custo_id);
                return (
                  <TableRow key={c.id} className={`hover:bg-muted/30 ${isVencido ? "bg-red-50/50" : ""}`}>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{c.descricao}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.contato?.nome || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.categoria?.nome || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {centro ? (
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: centro.cor || "#6B7280" }} />{centro.nome}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-right font-semibold">{formatarMoeda(Number(c.valor_total))}</TableCell>
                    <TableCell className={`text-sm ${isVencido ? "text-red-500 font-medium" : ""}`}>{formatarData(c.data_vencimento)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {c.status !== "pago" && <button onClick={() => openBaixa(c)} className="p-1.5 rounded hover:bg-emerald-50" title="Dar Baixa"><Check className="h-4 w-4 text-emerald-600" /></button>}
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted" title="Editar"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-red-50" title="Excluir"><Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">{contas.length} registro(s)</span>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)} className={`w-8 h-8 rounded text-xs font-medium ${page === i ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}>{i + 1}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Editar" : "Nova"} Conta a {isPagar ? "Pagar" : "Receber"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Descrição *</Label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor *</Label><Input type="number" step="0.01" value={form.valor_total} onChange={e => setForm(f => ({ ...f, valor_total: e.target.value }))} /></div>
              <div><Label>Vencimento *</Label><Input type="date" value={form.data_vencimento} onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{contatoLabel}</Label><Select value={form.contato_id} onValueChange={v => setForm(f => ({ ...f, contato_id: v }))}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{contatosFiltrados.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Categoria</Label><Select value={form.categoria_id} onValueChange={v => setForm(f => ({ ...f, categoria_id: v }))}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{categoriasFiltradas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Centro de Custo *</Label><Select value={form.centro_custo_id} onValueChange={v => setForm(f => ({ ...f, centro_custo_id: v }))}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{centrosCusto.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Conta Bancária</Label><Select value={form.conta_bancaria_id} onValueChange={v => setForm(f => ({ ...f, conta_bancaria_id: v }))}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{contasBancarias.filter(c => c.ativa).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Observação</Label><Textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Baixa Modal */}
      <Dialog open={baixaOpen} onOpenChange={setBaixaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar {isPagar ? "Pagamento" : "Recebimento"}</DialogTitle></DialogHeader>
          {baixaItem && (
            <div className="bg-muted/30 rounded-lg p-3 mb-2 text-sm space-y-1">
              <p>Valor total: <span className="font-semibold">{formatarMoeda(Number(baixaItem.valor_total))}</span></p>
              <p>Já pago: <span className="font-semibold">{formatarMoeda(Number(baixaItem.valor_pago))}</span></p>
              <p>Restante: <span className="font-bold text-primary">{formatarMoeda(Number(baixaItem.valor_total) - Number(baixaItem.valor_pago))}</span></p>
            </div>
          )}
          <div className="space-y-3">
            <div><Label>Data do Pagamento</Label><Input type="date" value={baixaForm.data_pagamento} onChange={e => setBaixaForm(f => ({ ...f, data_pagamento: e.target.value }))} /></div>
            <div><Label>Valor Pago *</Label><Input type="number" step="0.01" value={baixaForm.valor_pago} onChange={e => setBaixaForm(f => ({ ...f, valor_pago: e.target.value }))} /></div>
            <div><Label>Conta Bancária *</Label><Select value={baixaForm.conta_bancaria_id} onValueChange={v => setBaixaForm(f => ({ ...f, conta_bancaria_id: v }))}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{contasBancarias.filter(c => c.ativa).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setBaixaOpen(false)}>Cancelar</Button><Button onClick={handleBaixa} disabled={saving}>{saving ? "Processando..." : "Confirmar Baixa"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
