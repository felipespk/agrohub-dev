import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";

const catBadge: Record<string, string> = {
  semente: "bg-green-100 text-green-800", fertilizante: "bg-blue-100 text-blue-800",
  defensivo: "bg-red-100 text-red-800", combustivel: "bg-yellow-100 text-yellow-800",
  outro: "bg-gray-100 text-gray-800",
};

export default function InsumosPage() {
  const { user } = useAuth();
  const [insumos, setInsumos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [openEntrada, setOpenEntrada] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [form, setForm] = useState({ nome: "", categoria: "semente", unidade_medida: "kg", preco_unitario: "", estoque_atual: "0", estoque_minimo: "0" });
  const [entradaForm, setEntradaForm] = useState({ insumo_id: "", quantidade: "", data: new Date().toISOString().split("T")[0], valor_total: "", fornecedor_id: "" });
  const [contatos, setContatos] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("insumos" as any).select("*").eq("user_id", user.id).order("nome");
    setInsumos((data as any[]) || []);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    supabase.from("contatos_financeiros").select("id, nome").eq("user_id", user.id).in("tipo", ["fornecedor", "ambos"]).then(({ data }) => setContatos((data as any[]) || []));
  }, [user]);

  const save = async () => {
    if (!user || !form.nome.trim()) return;
    const payload: any = { nome: form.nome.trim(), categoria: form.categoria, unidade_medida: form.unidade_medida, preco_unitario: parseFloat(form.preco_unitario) || 0, estoque_atual: parseFloat(form.estoque_atual) || 0, estoque_minimo: parseFloat(form.estoque_minimo) || 0, user_id: user.id };
    if (editItem) {
      await supabase.from("insumos" as any).update(payload).eq("id", editItem.id);
      toast.success("Insumo atualizado!");
    } else {
      await supabase.from("insumos" as any).insert(payload);
      toast.success("Insumo cadastrado!");
    }
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    await supabase.from("insumos" as any).delete().eq("id", id);
    toast.success("Insumo removido."); load();
  };

  const saveEntrada = async () => {
    if (!user || !entradaForm.insumo_id || !entradaForm.quantidade) return;
    const qty = parseFloat(entradaForm.quantidade);
    await supabase.from("movimentacoes_insumo" as any).insert({ insumo_id: entradaForm.insumo_id, tipo: "entrada", quantidade: qty, data: entradaForm.data, fornecedor_id: entradaForm.fornecedor_id || null, valor_total: entradaForm.valor_total ? parseFloat(entradaForm.valor_total) : null, user_id: user.id } as any);
    const insumo = insumos.find(i => i.id === entradaForm.insumo_id);
    if (insumo) {
      await supabase.from("insumos" as any).update({ estoque_atual: Number(insumo.estoque_atual) + qty } as any).eq("id", entradaForm.insumo_id);
    }
    // Financial integration — create contas_pr for purchases with value
    if (entradaForm.valor_total && parseFloat(entradaForm.valor_total) > 0) {
      try {
        const { data: cc } = await supabase.from("centros_custo").select("id").eq("user_id", user.id).ilike("nome", "%lavoura%").limit(1);
        if (cc && cc.length > 0) {
          await supabase.from("contas_pr").insert({
            tipo: "pagar", descricao: `Compra insumo: ${insumo?.nome}`, valor_total: parseFloat(entradaForm.valor_total),
            centro_custo_id: cc[0].id, contato_id: entradaForm.fornecedor_id || null,
            data_vencimento: entradaForm.data, status: "aberto", user_id: user.id,
          } as any);
        }
      } catch {}
    }
    toast.success("Entrada registrada!"); setOpenEntrada(false); load();
  };

  const filtered = insumos.filter(i => {
    if (search && !i.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== "all" && i.categoria !== filterCat) return false;
    return true;
  });

  const totalItems = insumos.length;
  const lowStock = insumos.filter(i => Number(i.estoque_atual) < Number(i.estoque_minimo)).length;
  const totalValue = insumos.reduce((s, i) => s + Number(i.estoque_atual) * Number(i.preco_unitario), 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Estoque de Insumos</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setEntradaForm({ insumo_id: "", quantidade: "", data: new Date().toISOString().split("T")[0], valor_total: "", fornecedor_id: "" }); setOpenEntrada(true); }}>Registrar Entrada</Button>
          <Button onClick={() => { setEditItem(null); setForm({ nome: "", categoria: "semente", unidade_medida: "kg", preco_unitario: "", estoque_atual: "0", estoque_minimo: "0" }); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Novo Insumo</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-[#E5E7EB]"><CardContent className="p-4 flex items-center gap-3"><Package className="h-5 w-5 text-blue-600" /><div><p className="text-xs text-muted-foreground uppercase">Total de Itens</p><p className="text-xl font-bold">{totalItems}</p></div></CardContent></Card>
        <Card className="border-[#E5E7EB]"><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className={`h-5 w-5 ${lowStock > 0 ? "text-red-500" : "text-green-500"}`} /><div><p className="text-xs text-muted-foreground uppercase">Estoque Baixo</p><p className={`text-xl font-bold ${lowStock > 0 ? "text-red-600" : ""}`}>{lowStock}</p></div></CardContent></Card>
        <Card className="border-[#E5E7EB]"><CardContent className="p-4 flex items-center gap-3"><Package className="h-5 w-5 text-green-600" /><div><p className="text-xs text-muted-foreground uppercase">Valor em Estoque</p><p className="text-xl font-bold">R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div></CardContent></Card>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Buscar insumo..." value={search} onChange={e => setSearch(e.target.value)} className="w-[240px]" />
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas Categorias</SelectItem>{["semente", "fertilizante", "defensivo", "combustivel", "outro"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-[#F9FAFB]">
            <TableHead className="text-[11px] uppercase">Nome</TableHead>
            <TableHead className="text-[11px] uppercase">Categoria</TableHead>
            <TableHead className="text-[11px] uppercase">Unidade</TableHead>
            <TableHead className="text-[11px] uppercase">Preço Unit.</TableHead>
            <TableHead className="text-[11px] uppercase">Estoque</TableHead>
            <TableHead className="text-[11px] uppercase">Mínimo</TableHead>
            <TableHead className="text-[11px] uppercase">Valor Estoque</TableHead>
            <TableHead className="text-[11px] uppercase">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((i: any) => {
            const isBaixo = Number(i.estoque_atual) < Number(i.estoque_minimo);
            return (
              <TableRow key={i.id} className="hover:bg-[#F8FAFC]">
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${catBadge[i.categoria] || catBadge.outro}`}>{i.categoria}</span></TableCell>
                <TableCell>{i.unidade_medida}</TableCell>
                <TableCell>R$ {Number(i.preco_unitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className={isBaixo ? "text-red-600 font-bold" : ""}>{isBaixo && <AlertTriangle className="h-3.5 w-3.5 inline mr-1 text-red-500" />}{Number(i.estoque_atual).toLocaleString("pt-BR")}</TableCell>
                <TableCell>{Number(i.estoque_minimo).toLocaleString("pt-BR")}</TableCell>
                <TableCell>R$ {(Number(i.estoque_atual) * Number(i.preco_unitario)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem(i); setForm({ nome: i.nome, categoria: i.categoria, unidade_medida: i.unidade_medida, preco_unitario: String(i.preco_unitario), estoque_atual: String(i.estoque_atual), estoque_minimo: String(i.estoque_minimo) }); setOpen(true); }}><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(i.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                </TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Nenhum insumo cadastrado.</TableCell></TableRow>}
        </TableBody>
      </Table>

      {/* New/Edit Insumo */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Editar Insumo" : "Novo Insumo"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Categoria *</Label>
                <Select value={form.categoria} onValueChange={v => setForm(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["semente", "fertilizante", "defensivo", "combustivel", "outro"].map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Unidade *</Label>
                <Select value={form.unidade_medida} onValueChange={v => setForm(p => ({ ...p, unidade_medida: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["litros", "kg", "sacas", "unidade", "tonelada"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Preço Unitário (R$)</Label><Input type="number" value={form.preco_unitario} onChange={e => setForm(p => ({ ...p, preco_unitario: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Estoque Atual</Label><Input type="number" value={form.estoque_atual} onChange={e => setForm(p => ({ ...p, estoque_atual: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Estoque Mínimo</Label><Input type="number" value={form.estoque_minimo} onChange={e => setForm(p => ({ ...p, estoque_minimo: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={!form.nome.trim()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entrada */}
      <Dialog open={openEntrada} onOpenChange={setOpenEntrada}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Entrada</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Insumo *</Label>
              <Select value={entradaForm.insumo_id} onValueChange={v => setEntradaForm(p => ({ ...p, insumo_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{insumos.map(i => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Quantidade *</Label><Input type="number" value={entradaForm.quantidade} onChange={e => setEntradaForm(p => ({ ...p, quantidade: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={entradaForm.data} onChange={e => setEntradaForm(p => ({ ...p, data: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Valor Total (R$)</Label><Input type="number" value={entradaForm.valor_total} onChange={e => setEntradaForm(p => ({ ...p, valor_total: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenEntrada(false)}>Cancelar</Button><Button onClick={saveEntrada} disabled={!entradaForm.insumo_id || !entradaForm.quantidade}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
