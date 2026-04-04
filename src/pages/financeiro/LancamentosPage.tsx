import { useState, useMemo } from "react";
import { Plus, Download, ArrowUp, ArrowDown, ArrowLeftRight, Search } from "lucide-react";
import { exportarExcel } from "@/lib/export-excel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useFinanceiro } from "@/contexts/FinanceiroContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatarMoeda, formatarData } from "@/lib/format";
import { toast } from "sonner";

const tipoConfig: Record<string, { icon: any; bg: string; text: string; label: string }> = {
  receita: { icon: ArrowUp, bg: "bg-emerald-50", text: "text-emerald-700", label: "Receita" },
  despesa: { icon: ArrowDown, bg: "bg-red-50", text: "text-red-700", label: "Despesa" },
  transferencia: { icon: ArrowLeftRight, bg: "bg-blue-50", text: "text-blue-700", label: "Transferência" },
};

export default function LancamentosPage() {
  const { lancamentos, centrosCusto, categorias, contatos, contasBancarias, reload } = useFinanceiro();
  const { user } = useAuth();

  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCentro, setFiltroCentro] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroInicio, setFiltroInicio] = useState("");
  const [filtroFim, setFiltroFim] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 10;

  const [form, setForm] = useState({ tipo: "receita", data: new Date().toISOString().split("T")[0], valor: "", descricao: "", categoria_id: "", centro_custo_id: "", conta_bancaria_id: "", conta_destino_id: "", contato_id: "" });

  const filtered = useMemo(() => {
    let list = [...lancamentos];
    if (busca) list = list.filter(l => (l.descricao || "").toLowerCase().includes(busca.toLowerCase()));
    if (filtroTipo !== "todos") list = list.filter(l => l.tipo === filtroTipo);
    if (filtroCentro !== "todos") list = list.filter(l => l.centro_custo_id === filtroCentro);
    if (filtroCategoria !== "todos") list = list.filter(l => l.categoria_id === filtroCategoria);
    if (filtroInicio) list = list.filter(l => l.data >= filtroInicio);
    if (filtroFim) list = list.filter(l => l.data <= filtroFim);
    return list;
  }, [lancamentos, busca, filtroTipo, filtroCentro, filtroCategoria, filtroInicio, filtroFim]);

  const totalReceitas = filtered.filter(l => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0);
  const totalDespesas = filtered.filter(l => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0);
  const saldo = totalReceitas - totalDespesas;

  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const openNew = () => { setForm({ tipo: "receita", data: new Date().toISOString().split("T")[0], valor: "", descricao: "", categoria_id: "", centro_custo_id: "", conta_bancaria_id: "", conta_destino_id: "", contato_id: "" }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.valor || !form.data || !form.centro_custo_id) { toast.error("Preencha valor, data e centro de custo."); return; }
    if (form.tipo === "transferencia" && !form.conta_destino_id) { toast.error("Selecione a conta destino."); return; }
    setSaving(true);
    const valor = parseFloat(form.valor);
    await supabase.from("lancamentos").insert({ tipo: form.tipo, valor, data: form.data, descricao: form.descricao || null, categoria_id: form.tipo === "transferencia" ? null : (form.categoria_id || null), centro_custo_id: form.centro_custo_id, conta_bancaria_id: form.conta_bancaria_id || null, conta_destino_id: form.tipo === "transferencia" ? form.conta_destino_id : null, contato_id: form.tipo === "transferencia" ? null : (form.contato_id || null), user_id: user!.id });
    if (form.conta_bancaria_id) { const conta = contasBancarias.find(c => c.id === form.conta_bancaria_id); if (conta) { const delta = form.tipo === "receita" ? valor : -valor; await supabase.from("contas_bancarias").update({ saldo_atual: Number(conta.saldo_atual) + delta }).eq("id", conta.id); } }
    if (form.tipo === "transferencia" && form.conta_destino_id) { const dest = contasBancarias.find(c => c.id === form.conta_destino_id); if (dest) { await supabase.from("contas_bancarias").update({ saldo_atual: Number(dest.saldo_atual) + valor }).eq("id", dest.id); } }
    setSaving(false); setModalOpen(false); toast.success("Lançamento criado!"); reload();
  };

  const exportExcel = () => {
    exportarExcel({
      nomeArquivo: "lancamentos",
      titulo: "Relatório de Lançamentos",
      subtitulo: `Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
      colunas: [
        { header: "Data", key: "data_fmt", width: 15, tipo: "texto" },
        { header: "Descrição", key: "descricao", width: 35, tipo: "texto" },
        { header: "Tipo", key: "tipo", width: 15, tipo: "texto" },
        { header: "Categoria", key: "categoria_nome", width: 20, tipo: "texto" },
        { header: "Centro de Custo", key: "centro_nome", width: 20, tipo: "texto" },
        { header: "Conta", key: "conta_nome", width: 20, tipo: "texto" },
        { header: "Valor (R$)", key: "valor_num", width: 18, tipo: "moeda" },
      ],
      dados: filtered.map(l => ({
        data_fmt: formatarData(l.data),
        descricao: l.descricao || "",
        tipo: l.tipo,
        categoria_nome: l.categoria?.nome || "",
        centro_nome: l.centro?.nome || "",
        conta_nome: l.conta?.nome || "",
        valor_num: l.tipo === "despesa" ? -Number(l.valor) : Number(l.valor),
      })),
      totalizadores: [
        { label: "Receitas:", valor: `+R$ ${totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, positivo: true },
        { label: "Despesas:", valor: `-R$ ${totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, positivo: false },
        { label: "Saldo:", valor: `R$ ${saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, positivo: saldo >= 0 },
      ],
    });
  };

  const catsFiltradas = form.tipo === "receita" ? categorias.filter(c => c.tipo === "receita") : form.tipo === "despesa" ? categorias.filter(c => c.tipo === "despesa") : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">Lançamentos</h1><p className="text-sm text-muted-foreground mt-1">Registro de receitas, despesas e transferências</p></div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportExcel} className="gap-2"><Download className="h-4 w-4" /> Exportar Excel</Button>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Lançamento</Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-5">
          <div className="col-span-2 sm:col-span-1"><Label className="text-xs">Buscar</Label><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Descrição..." value={busca} onChange={e => { setBusca(e.target.value); setPage(0); }} /></div></div>
          <div><Label className="text-xs">Tipo</Label><Select value={filtroTipo} onValueChange={v => { setFiltroTipo(v); setPage(0); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="receita">Receita</SelectItem><SelectItem value="despesa">Despesa</SelectItem><SelectItem value="transferencia">Transferência</SelectItem></SelectContent></Select></div>
          <div><Label className="text-xs">Centro de Custo</Label><Select value={filtroCentro} onValueChange={v => { setFiltroCentro(v); setPage(0); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem>{centrosCusto.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Categoria</Label><Select value={filtroCategoria} onValueChange={v => { setFiltroCategoria(v); setPage(0); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas</SelectItem>{categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">De</Label><Input type="date" value={filtroInicio} onChange={e => { setFiltroInicio(e.target.value); setPage(0); }} /></div>
          <div><Label className="text-xs">Até</Label><Input type="date" value={filtroFim} onChange={e => { setFiltroFim(e.target.value); setPage(0); }} /></div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="bg-muted/30">
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Data</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Descrição</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Tipo</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Categoria</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Centro Custo</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Conta</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right">Valor</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum lançamento encontrado.</TableCell></TableRow>
              ) : paged.map(l => {
                const tc = tipoConfig[l.tipo] || tipoConfig.receita;
                const TIcon = tc.icon;
                const centro = centrosCusto.find(cc => cc.id === l.centro_custo_id);
                return (
                  <TableRow key={l.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm">{formatarData(l.data)}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{l.descricao || "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${tc.bg} ${tc.text}`}>
                        <TIcon className="h-3 w-3" />{tc.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.categoria?.nome || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {centro ? <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: centro.cor || "#6B7280" }} />{centro.nome}</span> : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.conta?.nome || "—"}</TableCell>
                    <TableCell className={`text-sm text-right font-semibold ${l.tipo === "receita" ? "text-emerald-600" : l.tipo === "despesa" ? "text-red-500" : "text-blue-600"}`}>
                      {l.tipo === "receita" ? "+" : l.tipo === "despesa" ? "-" : ""}{formatarMoeda(Number(l.valor))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-6 text-sm">
            <span>Receitas: <span className="font-bold text-emerald-600">+{formatarMoeda(totalReceitas)}</span></span>
            <span>Despesas: <span className="font-bold text-red-500">-{formatarMoeda(totalDespesas)}</span></span>
            <span>Saldo: <span className={`font-bold ${saldo >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatarMoeda(saldo)}</span></span>
          </div>
          {totalPages > 1 && (
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)} className={`w-8 h-8 rounded text-xs font-medium ${page === i ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}>{i + 1}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tipo *</Label><Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v, categoria_id: "", contato_id: "", conta_destino_id: "" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="receita">Receita</SelectItem><SelectItem value="despesa">Despesa</SelectItem><SelectItem value="transferencia">Transferência</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data *</Label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
              <div><Label>Valor *</Label><Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} /></div>
            </div>
            <div><Label>Descrição</Label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            {form.tipo !== "transferencia" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Categoria</Label><Select value={form.categoria_id} onValueChange={v => setForm(f => ({ ...f, categoria_id: v }))}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{catsFiltradas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Contato</Label><Select value={form.contato_id} onValueChange={v => setForm(f => ({ ...f, contato_id: v }))}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{contatos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Centro de Custo *</Label><Select value={form.centro_custo_id} onValueChange={v => setForm(f => ({ ...f, centro_custo_id: v }))}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{centrosCusto.filter(c => c.ativo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Conta Bancária</Label><Select value={form.conta_bancaria_id} onValueChange={v => setForm(f => ({ ...f, conta_bancaria_id: v }))}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{contasBancarias.filter(c => c.ativa).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
            </div>
            {form.tipo === "transferencia" && (
              <div><Label>Conta Destino *</Label><Select value={form.conta_destino_id} onValueChange={v => setForm(f => ({ ...f, conta_destino_id: v }))}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{contasBancarias.filter(c => c.ativa && c.id !== form.conta_bancaria_id).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
            )}
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
