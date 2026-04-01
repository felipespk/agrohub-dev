import { useState, useMemo } from "react";
import { Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useFinanceiro } from "@/contexts/FinanceiroContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatarMoeda, formatarData } from "@/lib/format";
import { toast } from "sonner";

export default function LancamentosPage() {
  const { lancamentos, centrosCusto, categorias, contatos, contasBancarias, reload } = useFinanceiro();
  const { user } = useAuth();

  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCentro, setFiltroCentro] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroConta, setFiltroConta] = useState("todos");
  const [filtroInicio, setFiltroInicio] = useState("");
  const [filtroFim, setFiltroFim] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ tipo: "receita", data: new Date().toISOString().split("T")[0], valor: "", descricao: "", categoria_id: "", centro_custo_id: "", conta_bancaria_id: "", conta_destino_id: "", contato_id: "" });

  const filtered = useMemo(() => {
    let list = [...lancamentos];
    if (filtroTipo !== "todos") list = list.filter(l => l.tipo === filtroTipo);
    if (filtroCentro !== "todos") list = list.filter(l => l.centro_custo_id === filtroCentro);
    if (filtroCategoria !== "todos") list = list.filter(l => l.categoria_id === filtroCategoria);
    if (filtroConta !== "todos") list = list.filter(l => l.conta_bancaria_id === filtroConta);
    if (filtroInicio) list = list.filter(l => l.data >= filtroInicio);
    if (filtroFim) list = list.filter(l => l.data <= filtroFim);
    return list;
  }, [lancamentos, filtroTipo, filtroCentro, filtroCategoria, filtroConta, filtroInicio, filtroFim]);

  const totalReceitas = filtered.filter(l => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0);
  const totalDespesas = filtered.filter(l => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0);
  const saldo = totalReceitas - totalDespesas;

  const openNew = () => {
    setForm({ tipo: "receita", data: new Date().toISOString().split("T")[0], valor: "", descricao: "", categoria_id: "", centro_custo_id: "", conta_bancaria_id: "", conta_destino_id: "", contato_id: "" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.valor || !form.data || !form.centro_custo_id) {
      toast.error("Preencha valor, data e centro de custo.");
      return;
    }
    if (form.tipo === "transferencia" && !form.conta_destino_id) {
      toast.error("Selecione a conta destino.");
      return;
    }
    setSaving(true);
    const valor = parseFloat(form.valor);

    await supabase.from("lancamentos").insert({
      tipo: form.tipo, valor, data: form.data, descricao: form.descricao || null,
      categoria_id: form.tipo === "transferencia" ? null : (form.categoria_id || null),
      centro_custo_id: form.centro_custo_id,
      conta_bancaria_id: form.conta_bancaria_id || null,
      conta_destino_id: form.tipo === "transferencia" ? form.conta_destino_id : null,
      contato_id: form.tipo === "transferencia" ? null : (form.contato_id || null),
      user_id: user!.id,
    });

    // Update bank balance
    if (form.conta_bancaria_id) {
      const conta = contasBancarias.find(c => c.id === form.conta_bancaria_id);
      if (conta) {
        const delta = form.tipo === "receita" ? valor : -valor;
        await supabase.from("contas_bancarias").update({ saldo_atual: Number(conta.saldo_atual) + delta }).eq("id", conta.id);
      }
    }
    if (form.tipo === "transferencia" && form.conta_destino_id) {
      const dest = contasBancarias.find(c => c.id === form.conta_destino_id);
      if (dest) {
        await supabase.from("contas_bancarias").update({ saldo_atual: Number(dest.saldo_atual) + valor }).eq("id", dest.id);
      }
    }

    setSaving(false);
    setModalOpen(false);
    toast.success("Lançamento criado!");
    reload();
  };

  const exportCSV = () => {
    const header = "Data;Descrição;Tipo;Categoria;Centro de Custo;Conta;Valor\n";
    const rows = filtered.map(l => {
      const sign = l.tipo === "receita" ? "" : l.tipo === "despesa" ? "-" : "";
      return `${formatarData(l.data)};${l.descricao || ""};${l.tipo};${l.categoria?.nome || ""};${l.centro?.nome || ""};${l.conta?.nome || ""};${sign}${formatarMoeda(Number(l.valor))}`;
    }).join("\n");
    const footer = `\nReceitas: ${formatarMoeda(totalReceitas)};Despesas: ${formatarMoeda(totalDespesas)};Saldo: ${formatarMoeda(saldo)}`;
    const blob = new Blob(["\uFEFF" + header + rows + footer], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "lancamentos.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const catsFiltradas = form.tipo === "receita" ? categorias.filter(c => c.tipo === "receita") : form.tipo === "despesa" ? categorias.filter(c => c.tipo === "despesa") : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Lançamentos</h1>
          <p className="page-subtitle">Registro de receitas, despesas e transferências</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCSV} className="gap-2"><Download className="h-4 w-4" /> Exportar CSV</Button>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Lançamento</Button>
        </div>
      </div>

      <div className="form-section">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-4">
          <div><Label className="text-xs">Data Início</Label><Input type="date" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)} /></div>
          <div><Label className="text-xs">Data Fim</Label><Input type="date" value={filtroFim} onChange={e => setFiltroFim(e.target.value)} /></div>
          <div><Label className="text-xs">Tipo</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="receita">Receita</SelectItem><SelectItem value="despesa">Despesa</SelectItem><SelectItem value="transferencia">Transferência</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Centro de Custo</Label>
            <Select value={filtroCentro} onValueChange={setFiltroCentro}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos</SelectItem>{centrosCusto.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Categoria</Label>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todas</SelectItem>{categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Conta</Label>
            <Select value={filtroConta} onValueChange={setFiltroConta}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todas</SelectItem>{contasBancarias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs uppercase tracking-wider">Data</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Descrição</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Tipo</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Categoria</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Centro de Custo</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Conta</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">Valor</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum lançamento encontrado.</TableCell></TableRow>
              ) : filtered.map(l => (
                <TableRow key={l.id} className="hover:bg-muted/50">
                  <TableCell className="text-sm">{formatarData(l.data)}</TableCell>
                  <TableCell className="text-sm">{l.descricao || "-"}</TableCell>
                  <TableCell><Badge variant={l.tipo === "receita" ? "default" : l.tipo === "despesa" ? "destructive" : "secondary"} className="text-[10px]">{l.tipo}</Badge></TableCell>
                  <TableCell className="text-sm">{l.categoria?.nome || "-"}</TableCell>
                  <TableCell className="text-sm">{l.centro?.nome || "-"}</TableCell>
                  <TableCell className="text-sm">{l.conta?.nome || "-"}</TableCell>
                  <TableCell className={`text-sm text-right font-semibold ${l.tipo === "receita" ? "text-emerald-600" : l.tipo === "despesa" ? "text-destructive" : "text-blue-600"}`}>
                    {l.tipo === "receita" ? "+" : l.tipo === "despesa" ? "-" : ""}{formatarMoeda(Number(l.valor))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-6 justify-end text-sm">
          <span>Receitas: <span className="font-bold text-emerald-600">{formatarMoeda(totalReceitas)}</span></span>
          <span>Despesas: <span className="font-bold text-destructive">{formatarMoeda(totalDespesas)}</span></span>
          <span>Saldo: <span className={`font-bold ${saldo >= 0 ? "text-emerald-600" : "text-destructive"}`}>{formatarMoeda(saldo)}</span></span>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v, categoria_id: "", contato_id: "", conta_destino_id: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="receita">Receita</SelectItem><SelectItem value="despesa">Despesa</SelectItem><SelectItem value="transferencia">Transferência</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data *</Label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
              <div><Label>Valor *</Label><Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} /></div>
            </div>
            <div><Label>Descrição</Label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            {form.tipo !== "transferencia" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Categoria</Label>
                  <Select value={form.categoria_id} onValueChange={v => setForm(f => ({ ...f, categoria_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{catsFiltradas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Contato</Label>
                  <Select value={form.contato_id} onValueChange={v => setForm(f => ({ ...f, contato_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{contatos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}
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
            {form.tipo === "transferencia" && (
              <div><Label>Conta Destino *</Label>
                <Select value={form.conta_destino_id} onValueChange={v => setForm(f => ({ ...f, conta_destino_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{contasBancarias.filter(c => c.ativa && c.id !== form.conta_bancaria_id).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
