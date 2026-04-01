import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const nivelBadge: Record<string, string> = {
  baixo: "bg-green-100 text-green-800", medio: "bg-yellow-100 text-yellow-800",
  alto: "bg-orange-100 text-orange-800", critico: "bg-red-100 text-red-800",
};
const tipoBadge: Record<string, string> = {
  praga: "bg-red-100 text-red-800", doenca: "bg-purple-100 text-purple-800", daninha: "bg-yellow-100 text-yellow-800",
};

export default function PragasPage() {
  const { user } = useAuth();
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [safras, setSafras] = useState<any[]>([]);
  const [safraTalhoes, setSafraTalhoes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ safra_id: "", safra_talhao_id: "", data: new Date().toISOString().split("T")[0], tipo: "praga", nome_ocorrencia: "", nivel: "baixo", decisao: "monitorar", observacao: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("ocorrencias_mip" as any).select("*, safra_talhoes:safra_talhao_id(talhoes:talhao_id(nome), safras:safra_id(nome))").eq("user_id", user.id).order("data", { ascending: false }).limit(100);
    setOcorrencias((data as any[]) || []);
    const { data: s } = await supabase.from("safras" as any).select("id, nome").eq("user_id", user.id);
    setSafras((s as any[]) || []);
  };
  useEffect(() => { load(); }, [user]);

  const loadST = async (safraId: string) => {
    const { data } = await supabase.from("safra_talhoes" as any).select("id, talhoes:talhao_id(nome)").eq("safra_id", safraId).eq("user_id", user!.id);
    setSafraTalhoes((data as any[]) || []);
  };

  const save = async () => {
    if (!user || !form.safra_talhao_id || !form.nome_ocorrencia.trim()) return;
    await supabase.from("ocorrencias_mip" as any).insert({ safra_talhao_id: form.safra_talhao_id, data: form.data, tipo: form.tipo, nome_ocorrencia: form.nome_ocorrencia.trim(), nivel: form.nivel, decisao: form.decisao, observacao: form.observacao || null, user_id: user.id } as any);
    toast.success("Ocorrência registrada!"); setOpen(false); load();
  };

  const remove = async (id: string) => { await supabase.from("ocorrencias_mip" as any).delete().eq("id", id); toast.success("Removida."); load(); };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Pragas / MIP</h1>
        <Button onClick={() => { setForm({ safra_id: "", safra_talhao_id: "", data: new Date().toISOString().split("T")[0], tipo: "praga", nome_ocorrencia: "", nivel: "baixo", decisao: "monitorar", observacao: "" }); setSafraTalhoes([]); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Nova Ocorrência</Button>
      </div>

      <Table>
        <TableHeader><TableRow className="bg-[#F9FAFB]">
          <TableHead className="text-[11px] uppercase">Data</TableHead>
          <TableHead className="text-[11px] uppercase">Talhão</TableHead>
          <TableHead className="text-[11px] uppercase">Tipo</TableHead>
          <TableHead className="text-[11px] uppercase">Ocorrência</TableHead>
          <TableHead className="text-[11px] uppercase">Nível</TableHead>
          <TableHead className="text-[11px] uppercase">Decisão</TableHead>
          <TableHead className="text-[11px] uppercase">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {ocorrencias.map((o: any) => (
            <TableRow key={o.id} className="hover:bg-[#F8FAFC]">
              <TableCell>{new Date(o.data).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell>{o.safra_talhoes?.talhoes?.nome || "—"}</TableCell>
              <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${tipoBadge[o.tipo]}`}>{o.tipo}</span></TableCell>
              <TableCell className="font-medium">{o.nome_ocorrencia}</TableCell>
              <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${nivelBadge[o.nivel]}`}>{o.nivel}</span></TableCell>
              <TableCell>{o.decisao}</TableCell>
              <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(o.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></TableCell>
            </TableRow>
          ))}
          {ocorrencias.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhuma ocorrência registrada.</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Ocorrência MIP</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Safra *</Label>
                <Select value={form.safra_id} onValueChange={v => { setForm((p: any) => ({ ...p, safra_id: v, safra_talhao_id: "" })); loadST(v); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Talhão *</Label>
                <Select value={form.safra_talhao_id} onValueChange={v => setForm((p: any) => ({ ...p, safra_talhao_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{safraTalhoes.map((st: any) => <SelectItem key={st.id} value={st.id}>{st.talhoes?.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm((p: any) => ({ ...p, data: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm((p: any) => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="praga">Praga</SelectItem><SelectItem value="doenca">Doença</SelectItem><SelectItem value="daninha">Daninha</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Nome da Ocorrência *</Label><Input value={form.nome_ocorrencia} onChange={e => setForm((p: any) => ({ ...p, nome_ocorrencia: e.target.value }))} placeholder="Ex: Lagarta-da-soja" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nível</Label>
                <Select value={form.nivel} onValueChange={v => setForm((p: any) => ({ ...p, nivel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="baixo">Baixo</SelectItem><SelectItem value="medio">Médio</SelectItem><SelectItem value="alto">Alto</SelectItem><SelectItem value="critico">Crítico</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Decisão</Label>
                <Select value={form.decisao} onValueChange={v => setForm((p: any) => ({ ...p, decisao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="monitorar">Monitorar</SelectItem><SelectItem value="aplicar">Aplicar</SelectItem><SelectItem value="nenhuma">Nenhuma</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Observação</Label><Textarea value={form.observacao} onChange={e => setForm((p: any) => ({ ...p, observacao: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={!form.safra_talhao_id || !form.nome_ocorrencia.trim()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
