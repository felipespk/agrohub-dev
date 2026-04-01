import { useState, useEffect } from "react";
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
import { Plus, Trash2, ShoppingCart, DollarSign } from "lucide-react";
import { toast } from "sonner";

const contratoBadge: Record<string, string> = {
  avista: "bg-green-100 text-green-800", prazo: "bg-blue-100 text-blue-800", barter: "bg-purple-100 text-purple-800",
};

export default function ComercializacaoPage() {
  const { user } = useAuth();
  const [vendas, setVendas] = useState<any[]>([]);
  const [safras, setSafras] = useState<any[]>([]);
  const [culturas, setCulturas] = useState<any[]>([]);
  const [contatos, setContatos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ safra_id: "", cultura_id: "", comprador_id: "", quantidade: "", preco_unitario: "", data_venda: new Date().toISOString().split("T")[0], tipo_contrato: "avista", observacao: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("comercializacao" as any).select("*, safras:safra_id(nome), culturas:cultura_id(nome), contatos_financeiros:comprador_id(nome)").eq("user_id", user.id).order("data_venda", { ascending: false });
    setVendas((data as any[]) || []);
    const { data: s } = await supabase.from("safras" as any).select("id, nome").eq("user_id", user.id);
    setSafras((s as any[]) || []);
    const { data: c } = await supabase.from("culturas" as any).select("id, nome").eq("user_id", user.id);
    setCulturas((c as any[]) || []);
    const { data: ct } = await supabase.from("contatos_financeiros").select("id, nome").eq("user_id", user.id).in("tipo", ["cliente", "ambos"]);
    setContatos((ct as any[]) || []);
  };
  useEffect(() => { load(); }, [user]);

  const valorTotal = form.quantidade && form.preco_unitario ? parseFloat(form.quantidade) * parseFloat(form.preco_unitario) : 0;

  const save = async () => {
    if (!user || !form.quantidade || !form.preco_unitario) return;
    await supabase.from("comercializacao" as any).insert({
      safra_id: form.safra_id || null, cultura_id: form.cultura_id || null, comprador_id: form.comprador_id || null,
      quantidade: parseFloat(form.quantidade), preco_unitario: parseFloat(form.preco_unitario), valor_total: valorTotal,
      data_venda: form.data_venda, tipo_contrato: form.tipo_contrato, observacao: form.observacao || null, user_id: user.id,
    } as any);
    // Financial integration
    try {
      const { data: cc } = await supabase.from("centros_custo").select("id").eq("user_id", user.id).ilike("nome", "%lavoura%").limit(1);
      if (cc && cc.length > 0) {
        const cultura = culturas.find(c => c.id === form.cultura_id);
        await supabase.from("contas_pr").insert({ tipo: "receber", descricao: `Venda: ${cultura?.nome || "Grãos"} — ${parseFloat(form.quantidade).toLocaleString("pt-BR")} sacas`, valor_total: valorTotal, centro_custo_id: cc[0].id, data_vencimento: form.data_venda, status: "aberto", user_id: user.id } as any);
      }
    } catch {}
    toast.success("Venda registrada!"); setOpen(false); load();
  };

  const remove = async (id: string) => { await supabase.from("comercializacao" as any).delete().eq("id", id); toast.success("Removida."); load(); };

  const totalVendas = vendas.reduce((s, v) => s + Number(v.valor_total), 0);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Comercialização</h1>
        <Button onClick={() => { setForm({ safra_id: "", cultura_id: "", comprador_id: "", quantidade: "", preco_unitario: "", data_venda: new Date().toISOString().split("T")[0], tipo_contrato: "avista", observacao: "" }); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Nova Venda</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-[#E5E7EB]"><CardContent className="p-4 flex items-center gap-3"><ShoppingCart className="h-5 w-5 text-blue-600" /><div><p className="text-xs text-muted-foreground uppercase">Total de Vendas</p><p className="text-xl font-bold">{vendas.length}</p></div></CardContent></Card>
        <Card className="border-[#E5E7EB]"><CardContent className="p-4 flex items-center gap-3"><DollarSign className="h-5 w-5 text-green-600" /><div><p className="text-xs text-muted-foreground uppercase">Valor Total</p><p className="text-xl font-bold text-green-600">R$ {totalVendas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div></CardContent></Card>
      </div>

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
          {vendas.map((v: any) => (
            <TableRow key={v.id} className="hover:bg-[#F8FAFC]">
              <TableCell>{new Date(v.data_venda).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell>{v.safras?.nome || "—"}</TableCell>
              <TableCell>{v.culturas?.nome || "—"}</TableCell>
              <TableCell>{v.contatos_financeiros?.nome || "—"}</TableCell>
              <TableCell>{Number(v.quantidade).toLocaleString("pt-BR")}</TableCell>
              <TableCell>R$ {Number(v.preco_unitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
              <TableCell className="font-medium">R$ {Number(v.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
              <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${contratoBadge[v.tipo_contrato] || contratoBadge.avista}`}>{v.tipo_contrato === "avista" ? "À Vista" : v.tipo_contrato === "prazo" ? "A Prazo" : "Barter"}</span></TableCell>
              <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(v.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></TableCell>
            </TableRow>
          ))}
          {vendas.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Nenhuma venda registrada.</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Venda</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Safra</Label>
                <Select value={form.safra_id} onValueChange={v => setForm((p: any) => ({ ...p, safra_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Cultura</Label>
                <Select value={form.cultura_id} onValueChange={v => setForm((p: any) => ({ ...p, cultura_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{culturas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Comprador</Label>
              <Select value={form.comprador_id} onValueChange={v => setForm((p: any) => ({ ...p, comprador_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{contatos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantidade *</Label><Input type="number" value={form.quantidade} onChange={e => setForm((p: any) => ({ ...p, quantidade: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Preço Unitário (R$) *</Label><Input type="number" value={form.preco_unitario} onChange={e => setForm((p: any) => ({ ...p, preco_unitario: e.target.value }))} /></div>
            </div>
            {valorTotal > 0 && <p className="text-sm bg-muted p-2 rounded">Valor Total: <strong>R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></p>}
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
