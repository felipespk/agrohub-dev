import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, MapPin, ChevronDown, ChevronUp, Pencil, Trash2, Search, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

export default function PastosPage() {
  const { user } = useAuth();
  const [pastos, setPastos] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [animais, setAnimais] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Create modals
  const [openPasto, setOpenPasto] = useState(false);
  const [openLote, setOpenLote] = useState(false);
  const [formPasto, setFormPasto] = useState({ nome: "", area_hectares: "", capacidade_cabecas: "" });
  const [formLote, setFormLote] = useState({ nome: "", pasto_id: "" });

  // Edit modals
  const [editPasto, setEditPasto] = useState<any>(null);
  const [editLote, setEditLote] = useState<any>(null);
  const [formEditPasto, setFormEditPasto] = useState({ nome: "", area_hectares: "", capacidade_cabecas: "" });
  const [formEditLote, setFormEditLote] = useState({ nome: "", pasto_id: "" });

  // Move animals modal
  const [moveOpen, setMoveOpen] = useState(false);
  const [movePastoOrigemId, setMovePastoOrigemId] = useState("");
  const [moveSelectedIds, setMoveSelectedIds] = useState<Set<string>>(new Set());
  const [movePastoDestino, setMovePastoDestino] = useState("");
  const [moveLoteDestino, setMoveLoteDestino] = useState("");
  const [moveSearch, setMoveSearch] = useState("");

  // Profile config
  const [valorArroba, setValorArroba] = useState(300);
  const [rendimento, setRendimento] = useState(52);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [p, l, a, prof] = await Promise.all([
      supabase.from("pastos" as any).select("*").eq("user_id", user.id).order("nome"),
      supabase.from("lotes" as any).select("*").eq("user_id", user.id).order("nome"),
      supabase.from("animais" as any).select("id, brinco, nome, categoria, peso_atual, pasto_id, lote_id").eq("user_id", user.id).eq("status", "ativo"),
      supabase.from("profiles").select("valor_arroba, rendimento_carcaca").eq("user_id", user.id).maybeSingle(),
    ]);
    setPastos((p.data as any) || []);
    setLotes((l.data as any) || []);
    setAnimais((a.data as any) || []);
    if (prof.data) {
      setValorArroba(Number(prof.data.valor_arroba) || 300);
      setRendimento(Number(prof.data.rendimento_carcaca) || 52);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // === Create Pasto ===
  const handleSavePasto = async () => {
    if (!user || !formPasto.nome.trim()) return;
    await supabase.from("pastos" as any).insert({
      nome: formPasto.nome.trim(),
      area_hectares: formPasto.area_hectares ? parseFloat(formPasto.area_hectares) : null,
      capacidade_cabecas: formPasto.capacidade_cabecas ? parseInt(formPasto.capacidade_cabecas) : null,
      user_id: user.id,
    } as any);
    toast.success("Pasto criado!");
    setOpenPasto(false);
    setFormPasto({ nome: "", area_hectares: "", capacidade_cabecas: "" });
    fetchAll();
  };

  // === Create Lote ===
  const handleSaveLote = async () => {
    if (!user || !formLote.nome.trim()) return;
    await supabase.from("lotes" as any).insert({
      nome: formLote.nome.trim(), pasto_id: formLote.pasto_id || null, user_id: user.id,
    } as any);
    toast.success("Lote criado!");
    setOpenLote(false);
    setFormLote({ nome: "", pasto_id: "" });
    fetchAll();
  };

  // === Edit Pasto ===
  const openEditPasto = (p: any) => {
    setEditPasto(p);
    setFormEditPasto({
      nome: p.nome || "",
      area_hectares: p.area_hectares != null ? String(p.area_hectares) : "",
      capacidade_cabecas: p.capacidade_cabecas != null ? String(p.capacidade_cabecas) : "",
    });
  };
  const handleUpdatePasto = async () => {
    if (!editPasto || !formEditPasto.nome.trim()) return;
    await supabase.from("pastos" as any).update({
      nome: formEditPasto.nome.trim(),
      area_hectares: formEditPasto.area_hectares ? parseFloat(formEditPasto.area_hectares) : null,
      capacidade_cabecas: formEditPasto.capacidade_cabecas ? parseInt(formEditPasto.capacidade_cabecas) : null,
    } as any).eq("id", editPasto.id);
    toast.success("Pasto atualizado!");
    setEditPasto(null);
    fetchAll();
  };

  // === Delete Pasto ===
  const handleDeletePasto = async (p: any) => {
    const count = animais.filter(a => a.pasto_id === p.id).length;
    if (count > 0) { toast.error("Mova os animais para outro pasto antes de excluir."); return; }
    if (!confirm(`Tem certeza que deseja excluir o pasto "${p.nome}"?`)) return;
    await supabase.from("pastos" as any).delete().eq("id", p.id);
    toast.success("Pasto excluído.");
    if (expanded === p.id) setExpanded(null);
    fetchAll();
  };

  // === Edit Lote ===
  const openEditLote = (l: any) => {
    setEditLote(l);
    setFormEditLote({ nome: l.nome || "", pasto_id: l.pasto_id || "" });
  };
  const handleUpdateLote = async () => {
    if (!editLote || !formEditLote.nome.trim()) return;
    await supabase.from("lotes" as any).update({
      nome: formEditLote.nome.trim(),
      pasto_id: formEditLote.pasto_id || null,
    } as any).eq("id", editLote.id);
    toast.success("Lote atualizado!");
    setEditLote(null);
    fetchAll();
  };

  // === Delete Lote ===
  const handleDeleteLote = async (l: any) => {
    const count = animais.filter(a => a.lote_id === l.id).length;
    if (count > 0) { toast.error("Mova os animais para outro lote antes de excluir."); return; }
    if (!confirm(`Tem certeza que deseja excluir o lote "${l.nome}"?`)) return;
    await supabase.from("lotes" as any).delete().eq("id", l.id);
    toast.success("Lote excluído.");
    fetchAll();
  };

  // === Move Animals ===
  const openMoveModal = (pastoId: string) => {
    setMovePastoOrigemId(pastoId);
    setMoveSelectedIds(new Set());
    setMovePastoDestino("");
    setMoveLoteDestino("");
    setMoveSearch("");
    setMoveOpen(true);
  };

  const moveAnimaisOrigem = useMemo(() => {
    const list = animais.filter(a => a.pasto_id === movePastoOrigemId);
    const q = moveSearch.toLowerCase();
    if (!q) return list;
    return list.filter(a => a.brinco?.toLowerCase().includes(q) || a.nome?.toLowerCase().includes(q));
  }, [animais, movePastoOrigemId, moveSearch]);

  const lotesDestinoFiltrados = useMemo(() => {
    if (!movePastoDestino) return [];
    return lotes.filter(l => l.pasto_id === movePastoDestino);
  }, [lotes, movePastoDestino]);

  const handleMoveAnimals = async () => {
    if (!user || moveSelectedIds.size === 0) { toast.error("Selecione pelo menos um animal."); return; }
    if (!movePastoDestino) { toast.error("Selecione o pasto destino."); return; }
    const ids = Array.from(moveSelectedIds);
    const pastoOrigem = pastos.find(p => p.id === movePastoOrigemId);
    const pastoDestObj = pastos.find(p => p.id === movePastoDestino);
    for (const animalId of ids) {
      await supabase.from("animais" as any).update({
        pasto_id: movePastoDestino,
        lote_id: moveLoteDestino || null,
      } as any).eq("id", animalId);
      await supabase.from("movimentacoes_gado" as any).insert({
        animal_id: animalId,
        tipo: "transferencia",
        data: new Date().toISOString().split("T")[0],
        pasto_origem_id: movePastoOrigemId || null,
        pasto_destino_id: movePastoDestino,
        quantidade: 1,
        user_id: user.id,
      } as any);
    }
    toast.success(`${ids.length} animais movidos para ${pastoDestObj?.nome || "novo pasto"}!`);
    setMoveOpen(false);
    fetchAll();
  };

  const toggleMoveAnimal = (id: string) => {
    setMoveSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // === Helpers ===
  const calcValorEst = (peso: number) => (peso * rendimento / 100 / 15) * valorArroba;

  const CAT_BADGE: Record<string, string> = {
    vaca: "bg-pink-100 text-pink-700", touro: "bg-blue-100 text-blue-700",
    boi: "bg-amber-100 text-amber-700", novilha: "bg-purple-100 text-purple-700",
    bezerro: "bg-green-100 text-green-700", bezerra: "bg-teal-100 text-teal-700",
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Pastos e Lotes</h1>
        <div className="flex gap-3">
          <Button onClick={() => setOpenPasto(true)} className="gap-2"><Plus className="h-4 w-4" /> Novo Pasto</Button>
          <Button variant="outline" onClick={() => setOpenLote(true)} className="gap-2"><Plus className="h-4 w-4" /> Novo Lote</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pastos.map(p => {
          const animaisPasto = animais.filter(a => a.pasto_id === p.id);
          const count = animaisPasto.length;
          const cap = p.capacidade_cabecas || 0;
          const pct = cap > 0 ? (count / cap) * 100 : 0;
          const barColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-green-500";
          const isExpanded = expanded === p.id;
          const lotesPasto = lotes.filter(l => l.pasto_id === p.id);

          const pesoTotal = animaisPasto.reduce((s, a) => s + (Number(a.peso_atual) || 0), 0);
          const pesoMedio = count > 0 ? pesoTotal / count : 0;
          const valorEstimado = animaisPasto.reduce((s, a) => s + (a.peso_atual ? calcValorEst(Number(a.peso_atual)) : 0), 0);

          return (
            <Card key={p.id} className="border-[#E5E7EB]">
              <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : p.id)}>
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />{p.nome}</div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEditPasto(p); }}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleDeletePasto(p); }}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                    </Button>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardTitle>
                {p.area_hectares != null && <p className="text-sm text-muted-foreground">{Number(p.area_hectares).toFixed(1)} ha</p>}
              </CardHeader>
              <CardContent className="space-y-2">
                {cap > 0 ? (
                  <>
                    <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-sm text-muted-foreground">{count} / {cap} cabeças</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{count} cabeças · <span className="italic">Capacidade não definida</span></p>
                )}

                {count > 0 && (
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Peso médio: <strong className="text-foreground">{pesoMedio > 0 ? `${pesoMedio.toFixed(0)} kg` : "—"}</strong></span>
                    <span>Valor est.: <strong className="text-foreground">R$ {valorEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                  </div>
                )}

                {isExpanded && (
                  <div className="mt-4 space-y-3" onClick={e => e.stopPropagation()}>
                    {/* Lotes */}
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Lotes</p>
                      {lotesPasto.length > 0 ? (
                        <div className="space-y-1">
                          {lotesPasto.map(l => {
                            const animaisLote = animais.filter(a => a.lote_id === l.id);
                            return (
                              <div key={l.id} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                                <span className="text-sm">{l.nome} <span className="text-muted-foreground">({animaisLote.length} animais)</span></span>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditLote(l)}>
                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDeleteLote(l)}>
                                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground italic">Nenhum lote cadastrado</span>
                          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => { setFormLote({ nome: "", pasto_id: p.id }); setOpenLote(true); }}>
                            <Plus className="h-3 w-3" /> Criar Lote
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Animais */}
                    {animaisPasto.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Animais</p>
                          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => openMoveModal(p.id)}>
                            <ArrowRightLeft className="h-3 w-3" /> Mover Animais
                          </Button>
                        </div>
                        <table className="w-full text-xs">
                          <thead><tr className="text-left text-muted-foreground"><th className="pb-1">Brinco</th><th className="pb-1">Nome</th><th className="pb-1">Cat.</th><th className="pb-1">Peso</th></tr></thead>
                          <tbody>
                            {animaisPasto.slice(0, 10).map(a => (
                              <tr key={a.id} className="border-t">
                                <td className="py-1 font-mono">{a.brinco}</td>
                                <td className="py-1">{a.nome || "—"}</td>
                                <td className="py-1">{a.categoria}</td>
                                <td className="py-1">{a.peso_atual ? `${Number(a.peso_atual).toFixed(0)} kg` : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {animaisPasto.length > 10 && <p className="text-xs text-muted-foreground mt-1">...e mais {animaisPasto.length - 10}</p>}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {pastos.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">Nenhum pasto cadastrado</p>}
      </div>

      {/* === Create Pasto Modal === */}
      <Dialog open={openPasto} onOpenChange={setOpenPasto}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Pasto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={formPasto.nome} onChange={e => setFormPasto({ ...formPasto, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>Área (hectares)</Label><Input type="number" value={formPasto.area_hectares} onChange={e => setFormPasto({ ...formPasto, area_hectares: e.target.value })} /></div>
            <div className="space-y-2"><Label>Capacidade (cabeças)</Label><Input type="number" value={formPasto.capacidade_cabecas} onChange={e => setFormPasto({ ...formPasto, capacidade_cabecas: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => setOpenPasto(false)}>Cancelar</Button><Button onClick={handleSavePasto}>Salvar</Button></div>
        </DialogContent>
      </Dialog>

      {/* === Create Lote Modal === */}
      <Dialog open={openLote} onOpenChange={setOpenLote}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Lote</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={formLote.nome} onChange={e => setFormLote({ ...formLote, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>Pasto</Label>
              <Select value={formLote.pasto_id || "__none__"} onValueChange={v => setFormLote({ ...formLote, pasto_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">Nenhum</SelectItem>{pastos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => setOpenLote(false)}>Cancelar</Button><Button onClick={handleSaveLote}>Salvar</Button></div>
        </DialogContent>
      </Dialog>

      {/* === Edit Pasto Modal === */}
      <Dialog open={!!editPasto} onOpenChange={v => { if (!v) setEditPasto(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar Pasto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={formEditPasto.nome} onChange={e => setFormEditPasto({ ...formEditPasto, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>Área (hectares)</Label><Input type="number" value={formEditPasto.area_hectares} onChange={e => setFormEditPasto({ ...formEditPasto, area_hectares: e.target.value })} /></div>
            <div className="space-y-2"><Label>Capacidade (cabeças)</Label><Input type="number" value={formEditPasto.capacidade_cabecas} onChange={e => setFormEditPasto({ ...formEditPasto, capacidade_cabecas: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => setEditPasto(null)}>Cancelar</Button><Button onClick={handleUpdatePasto}>Salvar</Button></div>
        </DialogContent>
      </Dialog>

      {/* === Edit Lote Modal === */}
      <Dialog open={!!editLote} onOpenChange={v => { if (!v) setEditLote(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar Lote</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={formEditLote.nome} onChange={e => setFormEditLote({ ...formEditLote, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>Pasto</Label>
              <Select value={formEditLote.pasto_id || "__none__"} onValueChange={v => setFormEditLote({ ...formEditLote, pasto_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">Nenhum</SelectItem>{pastos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2"><Button variant="outline" onClick={() => setEditLote(null)}>Cancelar</Button><Button onClick={handleUpdateLote}>Salvar</Button></div>
        </DialogContent>
      </Dialog>

      {/* === Move Animals Modal === */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Mover Animais</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Destino */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Pasto Destino *</Label>
                <Select value={movePastoDestino || "__none__"} onValueChange={v => { setMovePastoDestino(v === "__none__" ? "" : v); setMoveLoteDestino(""); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione</SelectItem>
                    {pastos.filter(p => p.id !== movePastoOrigemId).map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lote Destino</Label>
                <Select value={moveLoteDestino || "__none__"} onValueChange={v => setMoveLoteDestino(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {lotesDestinoFiltrados.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search & quick actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar brinco ou nome..." value={moveSearch} onChange={e => setMoveSearch(e.target.value)} className="pl-8 h-9" />
              </div>
              <Button variant="outline" size="sm" onClick={() => setMoveSelectedIds(new Set(moveAnimaisOrigem.map(a => a.id)))}>Selecionar Todos</Button>
              <Button variant="outline" size="sm" onClick={() => setMoveSelectedIds(new Set())}>Selecionar Nenhum</Button>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{moveSelectedIds.size} animais selecionados</p>

            {/* Animal list */}
            <div className="border rounded-md max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 w-8"></th>
                    <th className="px-3 py-2">Brinco</th>
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Categoria</th>
                    <th className="px-3 py-2 text-right">Peso</th>
                  </tr>
                </thead>
                <tbody>
                  {moveAnimaisOrigem.map(a => {
                    const checked = moveSelectedIds.has(a.id);
                    return (
                      <tr key={a.id} className={`border-b cursor-pointer transition-colors ${checked ? "bg-green-50" : "hover:bg-muted/30"}`} onClick={() => toggleMoveAnimal(a.id)}>
                        <td className="px-3 py-1.5">
                          <Checkbox checked={checked} onCheckedChange={() => toggleMoveAnimal(a.id)} className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600" onClick={e => e.stopPropagation()} />
                        </td>
                        <td className="px-3 py-1.5 font-mono font-bold">{a.brinco}</td>
                        <td className="px-3 py-1.5">{a.nome || "—"}</td>
                        <td className="px-3 py-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${CAT_BADGE[a.categoria?.toLowerCase()] || "bg-gray-100 text-gray-700"}`}>{a.categoria}</span>
                        </td>
                        <td className="px-3 py-1.5 text-right">{a.peso_atual ? `${Number(a.peso_atual).toFixed(0)} kg` : "—"}</td>
                      </tr>
                    );
                  })}
                  {moveAnimaisOrigem.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum animal neste pasto</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setMoveOpen(false)}>Cancelar</Button>
            <Button onClick={handleMoveAnimals} disabled={moveSelectedIds.size === 0 || !movePastoDestino}>
              Mover {moveSelectedIds.size > 0 ? `(${moveSelectedIds.size})` : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
