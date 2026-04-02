import { useState, useEffect, useMemo } from "react";
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
import { Plus, Trash2, Pencil, Bug, Leaf, CheckCircle, AlertTriangle, Spray } from "lucide-react";
import { toast } from "sonner";

const nivelConfig: Record<string, { label: string; cls: string }> = {
  baixo: { label: "Baixo", cls: "bg-green-100 text-green-800" },
  medio: { label: "Médio", cls: "bg-yellow-100 text-yellow-800" },
  alto: { label: "Alto", cls: "bg-orange-100 text-orange-800" },
  critico: { label: "Crítico", cls: "bg-red-100 text-red-800 animate-pulse" },
};
const tipoConfig: Record<string, { label: string; cls: string }> = {
  praga: { label: "Praga", cls: "bg-red-100 text-red-800" },
  doenca: { label: "Doença", cls: "bg-orange-100 text-orange-800" },
  daninha: { label: "Daninha", cls: "bg-green-800 text-white" },
};
const decisaoConfig: Record<string, { label: string; cls: string }> = {
  monitorar: { label: "Monitorar", cls: "bg-gray-100 text-gray-800" },
  aplicar: { label: "Aplicar Defensivo", cls: "bg-yellow-100 text-yellow-800" },
  nenhuma: { label: "Nenhuma Ação", cls: "bg-gray-50 text-gray-500" },
};

export default function PragasPage() {
  const { user } = useAuth();
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [safras, setSafras] = useState<any[]>([]);
  const [safraTalhoes, setSafraTalhoes] = useState<any[]>([]);
  const [formSafraTalhoes, setFormSafraTalhoes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const PER_PAGE = 15;

  const [fSafra, setFSafra] = useState("all");
  const [fTalhao, setFTalhao] = useState("all");
  const [fTipo, setFTipo] = useState("all");
  const [fNivel, setFNivel] = useState("all");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo] = useState("");

  const [form, setForm] = useState<any>({
    safra_id: "", safra_talhao_id: "", data: new Date().toISOString().split("T")[0],
    tipo: "praga", nome_ocorrencia: "", nivel: "baixo", decisao: "monitorar", observacao: "",
  });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("ocorrencias_mip" as any)
      .select("*, safra_talhoes:safra_talhao_id(talhoes:talhao_id(nome), safras:safra_id(nome))")
      .eq("user_id", user.id).order("data", { ascending: false });
    setOcorrencias((data as any[]) || []);
    const { data: s } = await supabase.from("safras" as any).select("id, nome").eq("user_id", user.id);
    setSafras((s as any[]) || []);
  };
  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user || fSafra === "all") { setSafraTalhoes([]); return; }
    supabase.from("safra_talhoes" as any).select("id, talhoes:talhao_id(nome)")
      .eq("safra_id", fSafra).eq("user_id", user.id).then(({ data }) => setSafraTalhoes((data as any[]) || []));
  }, [fSafra, user]);

  const loadFormST = async (safraId: string) => {
    const { data } = await supabase.from("safra_talhoes" as any).select("id, talhoes:talhao_id(nome)")
      .eq("safra_id", safraId).eq("user_id", user!.id);
    setFormSafraTalhoes((data as any[]) || []);
  };

  const filtered = useMemo(() => {
    let list = ocorrencias;
    if (fSafra !== "all") {
      const stIds = safraTalhoes.map((s: any) => s.id);
      list = list.filter(o => stIds.includes(o.safra_talhao_id));
    }
    if (fTalhao !== "all") list = list.filter(o => o.safra_talhao_id === fTalhao);
    if (fTipo !== "all") list = list.filter(o => o.tipo === fTipo);
    if (fNivel !== "all") list = list.filter(o => o.nivel === fNivel);
    if (fDateFrom) list = list.filter(o => o.data >= fDateFrom);
    if (fDateTo) list = list.filter(o => o.data <= fDateTo);
    return list;
  }, [ocorrencias, fSafra, fTalhao, fTipo, fNivel, fDateFrom, fDateTo, safraTalhoes]);

  const countCritico = filtered.filter(o => o.nivel === "critico").length;
  const countAlto = filtered.filter(o => o.nivel === "alto").length;
  const countAplicar = filtered.filter(o => o.decisao === "aplicar").length;

  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const save = async () => {
    if (!user || !form.safra_talhao_id || !form.nome_ocorrencia.trim()) return;
    await supabase.from("ocorrencias_mip" as any).insert({
      safra_talhao_id: form.safra_talhao_id, data: form.data, tipo: form.tipo,
      nome_ocorrencia: form.nome_ocorrencia.trim(), nivel: form.nivel, decisao: form.decisao,
      observacao: form.observacao || null, user_id: user.id,
    } as any);
    if (form.decisao === "aplicar") {
      toast.warning("Ocorrência registrada. Registre a pulverização no Caderno de Campo.", { duration: 6000 });
    } else {
      toast.success("Ocorrência registrada!");
    }
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    await supabase.from("ocorrencias_mip" as any).delete().eq("id", id);
    toast.success("Removida."); load();
  };

  const openModal = () => {
    setForm({ safra_id: "", safra_talhao_id: "", data: new Date().toISOString().split("T")[0], tipo: "praga", nome_ocorrencia: "", nivel: "baixo", decisao: "monitorar", observacao: "" });
    setFormSafraTalhoes([]); setOpen(true);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Monitoramento de Pragas (MIP)</h1>
        <Button onClick={openModal} className="gap-2"><Plus className="h-4 w-4" /> Nova Ocorrência</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={fSafra} onValueChange={v => { setFSafra(v); setFTalhao("all"); setPage(0); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Safra" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas Safras</SelectItem>{safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
        </Select>
        {fSafra !== "all" && (
          <Select value={fTalhao} onValueChange={v => { setFTalhao(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Talhão" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem>{safraTalhoes.map((st: any) => <SelectItem key={st.id} value={st.id}>{st.talhoes?.nome}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Select value={fTipo} onValueChange={v => { setFTipo(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="praga">Praga</SelectItem><SelectItem value="doenca">Doença</SelectItem><SelectItem value="daninha">Daninha</SelectItem></SelectContent>
        </Select>
        <Select value={fNivel} onValueChange={v => { setFNivel(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Nível" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="baixo">Baixo</SelectItem><SelectItem value="medio">Médio</SelectItem><SelectItem value="alto">Alto</SelectItem><SelectItem value="critico">Crítico</SelectItem></SelectContent>
        </Select>
        <Input type="date" value={fDateFrom} onChange={e => { setFDateFrom(e.target.value); setPage(0); }} className="w-[150px]" />
        <Input type="date" value={fDateTo} onChange={e => { setFDateTo(e.target.value); setPage(0); }} className="w-[150px]" />
      </div>

      {/* Mini-cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-[#E5E7EB]"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><Bug className="h-5 w-5 text-gray-600" /></div>
          <div><p className="text-xs uppercase text-muted-foreground font-medium">Total</p><p className="text-xl font-bold">{filtered.length}</p></div>
        </CardContent></Card>
        <Card className="border-[#E5E7EB]"><CardContent className="p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${countCritico > 0 ? "bg-red-50" : "bg-green-50"}`}>
            {countCritico > 0 ? <AlertTriangle className="h-5 w-5 text-red-600" /> : <CheckCircle className="h-5 w-5 text-green-600" />}
          </div>
          <div><p className="text-xs uppercase text-muted-foreground font-medium">Nível Crítico</p><p className={`text-xl font-bold ${countCritico > 0 ? "text-red-600" : ""}`}>{countCritico}</p></div>
        </CardContent></Card>
        <Card className="border-[#E5E7EB]"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-orange-600" /></div>
          <div><p className="text-xs uppercase text-muted-foreground font-medium">Nível Alto</p><p className="text-xl font-bold">{countAlto}</p></div>
        </CardContent></Card>
        <Card className="border-[#E5E7EB]"><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center"><Spray className="h-5 w-5 text-yellow-600" /></div>
          <div><p className="text-xs uppercase text-muted-foreground font-medium">Aguardando Aplicação</p><p className="text-xl font-bold">{countAplicar}</p></div>
        </CardContent></Card>
      </div>

      {/* Table */}
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
          {paged.map((o: any) => {
            const nivel = nivelConfig[o.nivel] || nivelConfig.baixo;
            const tipo = tipoConfig[o.tipo] || tipoConfig.praga;
            const decisao = decisaoConfig[o.decisao] || decisaoConfig.monitorar;
            const rowBg = o.nivel === "critico" ? "bg-red-50/50" : o.nivel === "alto" ? "bg-yellow-50/50" : "";
            return (
              <TableRow key={o.id} className={`hover:bg-[#F8FAFC] ${rowBg}`}>
                <TableCell>{new Date(o.data).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="font-medium">{o.safra_talhoes?.talhoes?.nome || "—"}</TableCell>
                <TableCell><span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${tipo.cls}`}>
                  {o.tipo === "praga" && <Bug className="h-3 w-3" />}{o.tipo === "daninha" && <Leaf className="h-3 w-3" />}{tipo.label}
                </span></TableCell>
                <TableCell className="font-medium">{o.nome_ocorrencia}</TableCell>
                <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${nivel.cls}`}>{nivel.label}</span></TableCell>
                <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${decisao.cls}`}>{decisao.label}</span></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(o.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhuma ocorrência registrada.</TableCell></TableRow>}
        </TableBody>
      </Table>

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
          <DialogHeader><DialogTitle>Nova Ocorrência MIP</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Safra *</Label>
                <Select value={form.safra_id || "none"} onValueChange={v => { const val = v === "none" ? "" : v; setForm((p: any) => ({ ...p, safra_id: val, safra_talhao_id: "" })); if (val) loadFormST(val); else setFormSafraTalhoes([]); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Selecione...</SelectItem>{safras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Talhão *</Label>
                <Select value={form.safra_talhao_id || "none"} onValueChange={v => setForm((p: any) => ({ ...p, safra_talhao_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Selecione...</SelectItem>{formSafraTalhoes.map((st: any) => <SelectItem key={st.id} value={st.id}>{st.talhoes?.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data *</Label><Input type="date" value={form.data} onChange={e => setForm((p: any) => ({ ...p, data: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm((p: any) => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="praga">Praga</SelectItem><SelectItem value="doenca">Doença</SelectItem><SelectItem value="daninha">Daninha</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Nome da Ocorrência *</Label><Input value={form.nome_ocorrencia} onChange={e => setForm((p: any) => ({ ...p, nome_ocorrencia: e.target.value }))} placeholder="Ex: Lagarta-da-soja, Ferrugem asiática" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nível *</Label>
                <Select value={form.nivel} onValueChange={v => setForm((p: any) => ({ ...p, nivel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="baixo">Baixo</SelectItem><SelectItem value="medio">Médio</SelectItem><SelectItem value="alto">Alto</SelectItem><SelectItem value="critico">Crítico</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Decisão *</Label>
                <Select value={form.decisao} onValueChange={v => setForm((p: any) => ({ ...p, decisao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="monitorar">Monitorar</SelectItem><SelectItem value="aplicar">Aplicar Defensivo</SelectItem><SelectItem value="nenhuma">Nenhuma Ação</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacao} onChange={e => setForm((p: any) => ({ ...p, observacao: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={!form.safra_talhao_id || !form.nome_ocorrencia.trim()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
