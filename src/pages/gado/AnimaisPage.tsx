import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ExampleDataButtons from "@/components/ExampleDataButtons";

const CAT_BADGE: Record<string, string> = {
  vaca: "bg-pink-100 text-pink-700", touro: "bg-blue-100 text-blue-700",
  bezerro: "bg-green-100 text-green-700", bezerra: "bg-emerald-100 text-emerald-700",
  novilha: "bg-yellow-100 text-yellow-700", boi: "bg-gray-200 text-gray-700",
};
const CAT_LABEL: Record<string, string> = {
  vaca: "Vaca", touro: "Touro", bezerro: "Bezerro", bezerra: "Bezerra", novilha: "Novilha", boi: "Boi",
};
const STATUS_BADGE: Record<string, string> = {
  ativo: "bg-green-100 text-green-700", vendido: "bg-blue-100 text-blue-700",
  morto: "bg-red-100 text-red-700", transferido: "bg-gray-100 text-gray-600",
};

export default function AnimaisPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [animais, setAnimais] = useState<any[]>([]);
  const [racas, setRacas] = useState<any[]>([]);
  const [pastos, setPastos] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 15;

  const [busca, setBusca] = useState("");
  const [fCat, setFCat] = useState("__all__");
  const [fPasto, setFPasto] = useState("__all__");
  const [fStatus, setFStatus] = useState("__all__");
  const [fRaca, setFRaca] = useState("__all__");

  const [form, setForm] = useState({
    brinco: "", nome: "", sexo: "macho", raca_id: "", cor: "",
    data_nascimento: "", data_entrada: new Date().toISOString().split("T")[0],
    categoria: "bezerro", origem: "nascido", pai_brinco: "", mae_brinco: "",
    pasto_id: "", lote_id: "", peso_atual: "",
  });

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [a, r, p, l] = await Promise.all([
      supabase.from("animais" as any).select("*, raca:racas!raca_id(nome), pasto:pastos!pasto_id(nome)").eq("user_id", user.id).order("brinco"),
      supabase.from("racas" as any).select("id, nome").eq("user_id", user.id).order("nome"),
      supabase.from("pastos" as any).select("id, nome").eq("user_id", user.id).order("nome"),
      supabase.from("lotes" as any).select("id, nome, pasto_id").eq("user_id", user.id).order("nome"),
    ]);
    setAnimais((a.data as any) || []);
    setRacas((r.data as any) || []);
    setPastos((p.data as any) || []);
    setLotes((l.data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = animais.filter(a => {
    if (busca && !a.brinco.toLowerCase().includes(busca.toLowerCase()) && !(a.nome || "").toLowerCase().includes(busca.toLowerCase())) return false;
    if (fCat !== "__all__" && a.categoria !== fCat) return false;
    if (fPasto !== "__all__" && a.pasto_id !== fPasto) return false;
    if (fStatus !== "__all__" && a.status !== fStatus) return false;
    if (fRaca !== "__all__" && a.raca_id !== fRaca) return false;
    return true;
  });

  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const rendimento = 52;
  const toArroba = (peso: number) => (peso * rendimento / 100 / 15).toFixed(2);

  const handleSave = async () => {
    if (!user || !form.brinco.trim() || !form.sexo || !form.categoria) {
      toast.error("Preencha os campos obrigatórios."); return;
    }
    const payload: any = {
      ...form, user_id: user.id,
      peso_atual: form.peso_atual ? parseFloat(form.peso_atual) : null,
      raca_id: form.raca_id || null, pasto_id: form.pasto_id || null, lote_id: form.lote_id || null,
      data_nascimento: form.data_nascimento || null,
    };
    const { data: inserted, error } = await (supabase.from("animais" as any).insert(payload).select("id").single() as any);
    if (error) { toast.error(error.message); return; }

    // Auto-criar movimentação de nascimento se origem = nascido
    if (form.origem === "nascido" && inserted?.id) {
      await supabase.from("movimentacoes_gado" as any).insert({
        animal_id: inserted.id,
        tipo: "nascimento",
        data: form.data_nascimento || form.data_entrada,
        quantidade: 1,
        peso_kg: form.peso_atual ? parseFloat(form.peso_atual) : null,
        user_id: user.id,
        observacao: "Nascimento registrado automaticamente",
      });
    }

    toast.success("Animal cadastrado!");
    setOpen(false);
    setForm({ brinco: "", nome: "", sexo: "macho", raca_id: "", cor: "", data_nascimento: "", data_entrada: new Date().toISOString().split("T")[0], categoria: "bezerro", origem: "nascido", pai_brinco: "", mae_brinco: "", pasto_id: "", lote_id: "", peso_atual: "" });
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este animal?")) return;
    await supabase.from("animais" as any).delete().eq("id", id);
    toast.success("Animal excluído.");
    fetchAll();
  };

  const hasExamples = animais.some(a => a.observacoes === "Dado de exemplo");

  const handleLoadExamples = async () => {
    if (!user) return;
    const findRaca = (nome: string) => racas.find(r => r.nome.toLowerCase().includes(nome.toLowerCase()))?.id || null;
    const findPasto = (nome: string) => pastos.find(p => p.nome.toLowerCase().includes(nome.toLowerCase()))?.id || null;

    const neloreId = findRaca("Nelore");
    const meioSangueId = findRaca("Meio");
    const brahmanId = findRaca("Brahman");
    const angusId = findRaca("Angus");
    const retiroNorte = findPasto("Retiro Norte");
    const piqueteMaternidade = findPasto("Piquete Maternidade");
    const pastoRepresa = findPasto("Represa");

    const exemplos = [
      { brinco: "006", nome: null, sexo: "macho", categoria: "bezerro", raca_id: neloreId, data_nascimento: "2026-01-15", data_entrada: "2026-01-15", pasto_id: piqueteMaternidade, peso_atual: 95, origem: "nascido", mae_brinco: "001", status: "ativo", observacoes: "Dado de exemplo", user_id: user.id },
      { brinco: "007", nome: null, sexo: "femea", categoria: "bezerra", raca_id: meioSangueId, data_nascimento: "2026-01-20", data_entrada: "2026-01-20", pasto_id: piqueteMaternidade, peso_atual: 88, origem: "nascido", mae_brinco: "003", status: "ativo", observacoes: "Dado de exemplo", user_id: user.id },
      { brinco: "008", nome: "Pintado", sexo: "macho", categoria: "boi", raca_id: brahmanId, data_nascimento: "2022-05-10", data_entrada: "2022-05-10", pasto_id: retiroNorte, peso_atual: 490, origem: "comprado", status: "ativo", observacoes: "Dado de exemplo", user_id: user.id },
      { brinco: "009", nome: "Formosa", sexo: "femea", categoria: "vaca", raca_id: neloreId, data_nascimento: "2020-07-30", data_entrada: "2020-07-30", pasto_id: pastoRepresa, peso_atual: 460, origem: "nascido", status: "ativo", observacoes: "Dado de exemplo", user_id: user.id },
      { brinco: "010", nome: "Guerreiro", sexo: "macho", categoria: "boi", raca_id: angusId, data_nascimento: "2022-09-18", data_entrada: "2022-09-18", pasto_id: retiroNorte, peso_atual: 535, origem: "nascido", status: "ativo", observacoes: "Dado de exemplo", user_id: user.id },
    ];

    const { error } = await supabase.from("animais" as any).insert(exemplos as any);
    if (error) { toast.error(error.message); return; }
    toast.success("5 animais de exemplo inseridos!");
    fetchAll();
  };

  const handleCleanExamples = async () => {
    if (!user) return;
    await supabase.from("animais" as any).delete().eq("observacoes", "Dado de exemplo").eq("user_id", user.id);
    toast.success("Animais de exemplo removidos.");
    fetchAll();
  };

  const lotesFiltered = form.pasto_id ? lotes.filter(l => l.pasto_id === form.pasto_id) : lotes;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Animais</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} animais encontrados</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Novo Animal</Button>
      </div>

      <ExampleDataButtons
        showLoad={animais.length < 10 && !hasExamples}
        showClean={hasExamples}
        loadLabel="Carregar Animais de Exemplo"
        loadConfirmMsg="Isso vai inserir 5 animais de exemplo (006 a 010). Deseja continuar?"
        onLoad={handleLoadExamples}
        onClean={handleCleanExamples}
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por brinco ou nome..." className="pl-9" value={busca} onChange={e => { setBusca(e.target.value); setPage(0); }} />
        </div>
        <Select value={fCat} onValueChange={v => { setFCat(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            {Object.entries(CAT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fPasto} onValueChange={v => { setFPasto(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Pasto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {pastos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={v => { setFStatus(v); setPage(0); }}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="vendido">Vendido</SelectItem>
            <SelectItem value="morto">Morto</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fRaca} onValueChange={v => { setFRaca(v); setPage(0); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Raça" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            {racas.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-[#E5E7EB]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F9FAFB] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Brinco</th>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">Categoria</th>
                  <th className="px-4 py-3 font-semibold">Raça</th>
                  <th className="px-4 py-3 font-semibold">Pasto</th>
                  <th className="px-4 py-3 font-semibold">Peso KG</th>
                  <th className="px-4 py-3 font-semibold">Peso @</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((a: any) => (
                  <tr key={a.id} className="border-b hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold">{a.brinco}</td>
                    <td className="px-4 py-3">{a.nome || "—"}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_BADGE[a.categoria] || ""}`}>{CAT_LABEL[a.categoria]}</span></td>
                    <td className="px-4 py-3">{a.raca?.nome || "—"}</td>
                    <td className="px-4 py-3">{a.pasto?.nome || "—"}</td>
                    <td className="px-4 py-3">{a.peso_atual ? Number(a.peso_atual).toFixed(1) : "—"}</td>
                    <td className="px-4 py-3">{a.peso_atual ? toArroba(Number(a.peso_atual)) : "—"}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[a.status] || ""}`}>{a.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/gado/animais/${a.id}`)}><Eye className="h-3.5 w-3.5 text-blue-600" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(a.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">Nenhum animal encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Animal</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Brinco *</Label><Input value={form.brinco} onChange={e => setForm({ ...form, brinco: e.target.value })} /></div>
            <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>Sexo *</Label>
              <Select value={form.sexo} onValueChange={v => setForm({ ...form, sexo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="macho">Macho</SelectItem><SelectItem value="femea">Fêmea</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Categoria *</Label>
              <Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CAT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Raça</Label>
              <Select value={form.raca_id || "__none__"} onValueChange={v => setForm({ ...form, raca_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">Sem raça</SelectItem>{racas.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Cor</Label><Input value={form.cor} onChange={e => setForm({ ...form, cor: e.target.value })} /></div>
            <div className="space-y-2"><Label>Data de Nascimento</Label><Input type="date" value={form.data_nascimento} onChange={e => setForm({ ...form, data_nascimento: e.target.value })} /></div>
            <div className="space-y-2"><Label>Data de Entrada</Label><Input type="date" value={form.data_entrada} onChange={e => setForm({ ...form, data_entrada: e.target.value })} /></div>
            <div className="space-y-2"><Label>Origem</Label>
              <Select value={form.origem} onValueChange={v => setForm({ ...form, origem: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="nascido">Nascido na fazenda</SelectItem><SelectItem value="comprado">Comprado</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Peso Atual (KG)</Label><Input type="number" value={form.peso_atual} onChange={e => setForm({ ...form, peso_atual: e.target.value })} /></div>
            <div className="space-y-2"><Label>Brinco do Pai</Label><Input value={form.pai_brinco} onChange={e => setForm({ ...form, pai_brinco: e.target.value })} /></div>
            <div className="space-y-2"><Label>Brinco da Mãe</Label><Input value={form.mae_brinco} onChange={e => setForm({ ...form, mae_brinco: e.target.value })} /></div>
            <div className="space-y-2"><Label>Pasto</Label>
              <Select value={form.pasto_id || "__none__"} onValueChange={v => setForm({ ...form, pasto_id: v === "__none__" ? "" : v, lote_id: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">Nenhum</SelectItem>{pastos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Lote</Label>
              <Select value={form.lote_id || "__none__"} onValueChange={v => setForm({ ...form, lote_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">Nenhum</SelectItem>{lotesFiltered.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Animal</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}