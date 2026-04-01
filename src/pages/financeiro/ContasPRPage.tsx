import { useState, useMemo } from "react";
import { Plus, Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useFinanceiro } from "@/contexts/FinanceiroContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatarMoeda, formatarData } from "@/lib/format";
import { toast } from "sonner";

const statusBadge: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  aberto: { variant: "secondary", label: "Aberto" },
  pago: { variant: "default", label: "Pago" },
  vencido: { variant: "destructive", label: "Vencido" },
  parcial: { variant: "outline", label: "Parcial" },
};

interface ContasPRPageProps {
  tipo: "pagar" | "receber";
}

export default function ContasPRPage({ tipo }: ContasPRPageProps) {
  const { contasPR, centrosCusto, categorias, contatos, contasBancarias, reload } = useFinanceiro();
  const { user } = useAuth();
  const isPagar = tipo === "pagar";
  const title = isPagar ? "Contas a Pagar" : "Contas a Receber";
  const contatoLabel = isPagar ? "Fornecedor" : "Cliente";
  const contatoTipos = isPagar ? ["fornecedor", "ambos"] : ["cliente", "ambos"];
  const catTipo = isPagar ? "despesa" : "receita";

  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroCentro, setFiltroCentro] = useState("todos");
  const [filtroContato, setFiltroContato] = useState("todos");
  const [filtroInicio, setFiltroInicio] = useState("");
  const [filtroFim, setFiltroFim] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [baixaOpen, setBaixaOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [baixaItem, setBaixaItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ descricao: "", valor_total: "", data_vencimento: "", contato_id: "", categoria_id: "", centro_custo_id: "", conta_bancaria_id: "", observacao: "" });
  const [baixaForm, setBaixaForm] = useState({ data_pagamento: new Date().toISOString().split("T")[0], valor_pago: "", conta_bancaria_id: "" });

  const today = new Date().toISOString().split("T")[0];

  const contas = useMemo(() => {
    let list = contasPR.filter(c => c.tipo === tipo);
    // Auto-update overdue
    list = list.map(c => {
      if (c.status === "aberto" && c.data_vencimento < today) return { ...c, status: "vencido" };
      if (Number(c.valor_pago) > 0 && Number(c.valor_pago) < Number(c.valor_total) && c.status !== "parcial") return { ...c, status: "parcial" };
      if (Number(c.valor_pago) >= Number(c.valor_total) && c.status !== "pago") return { ...c, status: "pago" };
      return c;
    });
    if (filtroStatus !== "todos") list = list.filter(c => c.status === filtroStatus);
    if (filtroCentro !== "todos") list = list.filter(c => c.centro_custo_id === filtroCentro);
    if (filtroContato !== "todos") list = list.filter(c => c.contato_id === filtroContato);
    if (filtroInicio) list = list.filter(c => c.data_vencimento >= filtroInicio);
    if (filtroFim) list = list.filter(c => c.data_vencimento <= filtroFim);
    return list;
  }, [contasPR, tipo, filtroStatus, filtroCentro, filtroContato, filtroInicio, filtroFim, today]);

  const totalAberto = contas.filter(c => ["aberto", "vencido", "parcial"].includes(c.status)).reduce((s, c) => s + (Number(c.valor_total) - Number(c.valor_pago)), 0);

  const openNew = () => {
    setEditItem(null);
    setForm({ descricao: "", valor_total: "", data_vencimento: "", contato_id: "", categoria_id: "", centro_custo_id: "", conta_bancaria_id: "", observacao: "" });
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      descricao: item.descricao, valor_total: String(item.valor_total), data_vencimento: item.data_vencimento,
      contato_id: item.contato_id || "", categoria_id: item.categoria_id || "",
      centro_custo_id: item.centro_custo_id || "", conta_bancaria_id: item.conta_bancaria_id || "",
      observacao: item.observacao || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.descricao || !form.valor_total || !form.data_vencimento || !form.centro_custo_id) {
      toast.error("Preencha descrição, valor, vencimento e centro de custo.");
      return;
    }
    setSaving(true);
    const payload = {
      tipo, descricao: form.descricao, valor_total: parseFloat(form.valor_total), data_vencimento: form.data_vencimento,
      contato_id: form.contato_id || null, categoria_id: form.categoria_id || null,
      centro_custo_id: form.centro_custo_id, conta_bancaria_id: form.conta_bancaria_id || null,
      observacao: form.observacao || null, user_id: user!.id,
    };
    if (editItem) {
      await supabase.from("contas_pr").update(payload).eq("id", editItem.id);
    } else {
      await supabase.from("contas_pr").insert({ ...payload, status: "aberto", valor_pago: 0 });
    }
    setSaving(false);
    setModalOpen(false);
    toast.success(editItem ? "Conta atualizada!" : "Conta criada!");
    reload();
  };

  const openBaixa = (item: any) => {
    setBaixaItem(item);
    setBaixaForm({ data_pagamento: today, valor_pago: String(Number(item.valor_total) - Number(item.valor_pago)), conta_bancaria_id: item.conta_bancaria_id || "" });
    setBaixaOpen(true);
  };

  const handleBaixa = async () => {
    if (!baixaForm.valor_pago || !baixaForm.conta_bancaria_id) {
      toast.error("Preencha valor e conta bancária.");
      return;
    }
    setSaving(true);
    const valorPago = parseFloat(baixaForm.valor_pago);
    const novoValorPago = Number(baixaItem.valor_pago) + valorPago;
    const novoStatus = novoValorPago >= Number(baixaItem.valor_total) ? "pago" : "parcial";

    await supabase.from("contas_pr").update({
      valor_pago: novoValorPago, status: novoStatus,
      data_pagamento: novoStatus === "pago" ? baixaForm.data_pagamento : null,
    }).eq("id", baixaItem.id);

    await supabase.from("lancamentos").insert({
      tipo: isPagar ? "despesa" : "receita", valor: valorPago, data: baixaForm.data_pagamento,
      descricao: `Baixa: ${baixaItem.descricao}`, categoria_id: baixaItem.categoria_id || null,
      centro_custo_id: baixaItem.centro_custo_id, conta_bancaria_id: baixaForm.conta_bancaria_id,
      conta_pr_id: baixaItem.id, user_id: user!.id,
    });

    // Update bank balance
    const conta = contasBancarias.find(c => c.id === baixaForm.conta_bancaria_id);
    if (conta) {
      const novoSaldo = isPagar ? Number(conta.saldo_atual) - valorPago : Number(conta.saldo_atual) + valorPago;
      await supabase.from("contas_bancarias").update({ saldo_atual: novoSaldo }).eq("id", conta.id);
    }

    setSaving(false);
    setBaixaOpen(false);
    toast.success("Baixa realizada!");
    reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta conta?")) return;
    await supabase.from("contas_pr").delete().eq("id", id);
    toast.success("Conta excluída!");
    reload();
  };

  const contatosFiltrados = contatos.filter(c => contatoTipos.includes(c.tipo));
  const categoriasFiltradas = categorias.filter(c => c.tipo === catTipo);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Gerencie suas contas a {isPagar ? "pagar" : "receber"}</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nova Conta</Button>
      </div>

      <div className="form-section">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          <div>
            <Label className="text-xs">Data Início</Label>
            <Input type="date" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Data Fim</Label>
            <Input type="date" value={filtroFim} onChange={e => setFiltroFim(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Centro de Custo</Label>
            <Select value={filtroCentro} onValueChange={setFiltroCentro}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {centrosCusto.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{contatoLabel}</Label>
            <Select value={filtroContato} onValueChange={setFiltroContato}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {contatosFiltrados.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase tracking-wider">Descrição</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">{contatoLabel}</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Categoria</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Centro de Custo</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Valor</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Vencimento</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma conta encontrada.</TableCell></TableRow>
              ) : contas.map(c => {
                const sb = statusBadge[c.status] || statusBadge.aberto;
                return (
                  <TableRow key={c.id} className="hover:bg-muted/50">
                    <TableCell className="text-sm font-medium">{c.descricao}</TableCell>
                    <TableCell className="text-sm">{c.contato?.nome || "-"}</TableCell>
                    <TableCell className="text-sm">{c.categoria?.nome || "-"}</TableCell>
                    <TableCell className="text-sm">{c.centro?.nome || "-"}</TableCell>
                    <TableCell className="text-sm text-right font-semibold">{formatarMoeda(Number(c.valor_total))}</TableCell>
                    <TableCell className="text-sm">{formatarData(c.data_vencimento)}</TableCell>
                    <TableCell><Badge variant={sb.variant} className="text-[10px]">{sb.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.status !== "pago" && (
                          <button onClick={() => openBaixa(c)} className="p-1.5 rounded hover:bg-muted" title="Dar Baixa"><Check className="h-3.5 w-3.5 text-primary" /></button>
                        )}
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted" title="Editar"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-muted" title="Excluir"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 pt-3 border-t border-border text-right">
          <span className="text-sm text-muted-foreground">Total em aberto: </span>
          <span className="text-sm font-bold text-foreground">{formatarMoeda(totalAberto)}</span>
        </div>
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
              <div><Label>{contatoLabel}</Label>
                <Select value={form.contato_id} onValueChange={v => setForm(f => ({ ...f, contato_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{contatosFiltrados.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Categoria</Label>
                <Select value={form.categoria_id} onValueChange={v => setForm(f => ({ ...f, categoria_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{categoriasFiltradas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Centro de Custo *</Label>
                <Select value={form.centro_custo_id} onValueChange={v => setForm(f => ({ ...f, centro_custo_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{centrosCusto.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Conta Bancária</Label>
                <Select value={form.conta_bancaria_id} onValueChange={v => setForm(f => ({ ...f, conta_bancaria_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{contasBancarias.filter(c => c.ativa).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Observação</Label><Textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Baixa Modal */}
      <Dialog open={baixaOpen} onOpenChange={setBaixaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Dar Baixa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Data do Pagamento</Label><Input type="date" value={baixaForm.data_pagamento} onChange={e => setBaixaForm(f => ({ ...f, data_pagamento: e.target.value }))} /></div>
            <div><Label>Valor Pago *</Label><Input type="number" step="0.01" value={baixaForm.valor_pago} onChange={e => setBaixaForm(f => ({ ...f, valor_pago: e.target.value }))} /></div>
            <div><Label>Conta Bancária *</Label>
              <Select value={baixaForm.conta_bancaria_id} onValueChange={v => setBaixaForm(f => ({ ...f, conta_bancaria_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{contasBancarias.filter(c => c.ativa).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setBaixaOpen(false)}>Cancelar</Button>
            <Button onClick={handleBaixa} disabled={saving}>{saving ? "Processando..." : "Confirmar Baixa"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
