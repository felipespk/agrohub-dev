import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MapPin, ChevronDown, ChevronUp, Pencil, Trash2, ArrowRightLeft, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { PastoMiniMapa } from "@/components/gado/PastoMiniMapa";

export default function PastosPage() {
  const { user } = useAuth();
  const { effectiveUserId, isImpersonating } = useEffectiveUser();
  const [pastos, setPastos] = useState<any[]>([]);
  const [lotes, setLotes] = useState<any[]>([]);
  const [animais, setAnimais] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Create modals
  const [openPasto, setOpenPasto] = useState(false);
  const [openLote, setOpenLote] = useState(false);
  const [formPasto, setFormPasto] = useState({ nome: "", area_hectares: "", capacidade_cabecas: "", cor: "#16A34A" });
  const [formLote, setFormLote] = useState({ nome: "", pasto_id: "" });

  // Edit modals
  const [editPasto, setEditPasto] = useState<any>(null);
  const [editLote, setEditLote] = useState<any>(null);
  const [formEditPasto, setFormEditPasto] = useState({ nome: "", area_hectares: "", capacidade_cabecas: "", cor: "#16A34A" });
  const [formEditLote, setFormEditLote] = useState({ nome: "", pasto_id: "" });

  // Move animals modal (by quantity)
  const [moveOpen, setMoveOpen] = useState(false);
  const [movePastoOrigemId, setMovePastoOrigemId] = useState("");
  const [moveLoteOrigemId, setMoveLoteOrigemId] = useState("");
  const [moveQtd, setMoveQtd] = useState("");
  const [movePastoDestino, setMovePastoDestino] = useState("");
  const [moveLoteDestino, setMoveLoteDestino] = useState("");

  // Profile config
  const [valorArroba, setValorArroba] = useState(300);
  const [rendimento, setRendimento] = useState(52);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [p, l, a, prof] = await Promise.all([
      supabase.from("pastos" as any).select("id, nome, area_hectares, capacidade_cabecas, coordenadas, centro_lat, centro_lng, foto_url, cor").eq("user_id", effectiveUserId).order("nome"),
      supabase.from("lotes" as any).select("*").eq("user_id", effectiveUserId).order("nome"),
      supabase.from("animais" as any).select("id, brinco, nome, categoria, peso_atual, pasto_id, lote_id").eq("user_id", effectiveUserId).eq("status", "ativo"),
      supabase.from("profiles").select("valor_arroba, rendimento_carcaca").eq("user_id", effectiveUserId).maybeSingle(),
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
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    if (!user || !formPasto.nome.trim()) return;
    await supabase.from("pastos" as any).insert({
      nome: formPasto.nome.trim(),
      area_hectares: formPasto.area_hectares ? parseFloat(formPasto.area_hectares) : null,
      capacidade_cabecas: formPasto.capacidade_cabecas ? parseInt(formPasto.capacidade_cabecas) : null,
      cor: formPasto.cor || null,
      user_id: user.id,
    } as any);
    toast.success("Pasto criado!");
    setOpenPasto(false);
    setFormPasto({ nome: "", area_hectares: "", capacidade_cabecas: "", cor: "#16A34A" });
    fetchAll();
  };

  // === Create Lote ===
  const handleSaveLote = async () => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
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
      cor: p.cor || "#16A34A",
    });
  };
  const handleUpdatePasto = async () => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    if (!editPasto || !formEditPasto.nome.trim()) return;
    await supabase.from("pastos" as any).update({
      nome: formEditPasto.nome.trim(),
      area_hectares: formEditPasto.area_hectares ? parseFloat(formEditPasto.area_hectares) : null,
      capacidade_cabecas: formEditPasto.capacidade_cabecas ? parseInt(formEditPasto.capacidade_cabecas) : null,
      cor: formEditPasto.cor || null,
    } as any).eq("id", editPasto.id);
    toast.success("Pasto atualizado!");
    setEditPasto(null);
    fetchAll();
  };

  // === Delete Pasto ===
  const handleDeletePasto = async (p: any) => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    const count = animais.filter(a => a.pasto_id === p.id).length;
    if (count > 0) { toast.error("Mova os animais para outro pasto antes de excluir."); return; }
    if (!confirm(`Tem certeza que deseja excluir o pasto "${p.nome}"?`)) return;

    // 1) Limpa referências em lotes (lotes podem ainda apontar para este pasto)
    const { error: errLotes } = await supabase
      .from("lotes" as any)
      .update({ pasto_id: null } as any)
      .eq("pasto_id", p.id);
    if (errLotes) {
      console.error("Erro ao desvincular lotes:", errLotes);
      toast.error(`Não foi possível desvincular os lotes: ${errLotes.message}`);
      return;
    }

    // 2) Limpa referências em animais inativos/históricos (status != ativo)
    await supabase.from("animais" as any).update({ pasto_id: null } as any).eq("pasto_id", p.id);

    // 3) Limpa referências em movimentações
    await supabase.from("movimentacoes_gado" as any).update({ pasto_origem_id: null } as any).eq("pasto_origem_id", p.id);
    await supabase.from("movimentacoes_gado" as any).update({ pasto_destino_id: null } as any).eq("pasto_destino_id", p.id);

    // 4) Apaga o pasto e captura erro real
    const { error } = await supabase.from("pastos" as any).delete().eq("id", p.id);
    if (error) {
      console.error("Erro ao excluir pasto:", error);
      toast.error(`Falha ao excluir: ${error.message}`);
      return;
    }

    toast.success("Pasto excluído.");
    if (expanded === p.id) setExpanded(null);
    // Atualização otimista + refetch
    setPastos(prev => prev.filter(x => x.id !== p.id));
    fetchAll();
  };

  // === Upload de foto do pasto ===
  const handleUploadFoto = async (pastoId: string, file: File) => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    if (!user) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem muito grande (máx 5MB)."); return; }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${pastoId}-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("pasto-fotos").upload(path, file, { upsert: true });
    if (upErr) { toast.error(`Erro no upload: ${upErr.message}`); return; }

    const { data: pub } = supabase.storage.from("pasto-fotos").getPublicUrl(path);
    const { error: updErr } = await supabase.from("pastos" as any).update({ foto_url: pub.publicUrl } as any).eq("id", pastoId);
    if (updErr) { toast.error(`Erro ao salvar: ${updErr.message}`); return; }

    toast.success("Foto atualizada!");
    fetchAll();
  };

  const handleRemoveFoto = async (pastoId: string) => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    await supabase.from("pastos" as any).update({ foto_url: null } as any).eq("id", pastoId);
    fetchAll();
  };

  // === Edit Lote ===
  const openEditLote = (l: any) => {
    setEditLote(l);
    setFormEditLote({ nome: l.nome || "", pasto_id: l.pasto_id || "" });
  };
  const handleUpdateLote = async () => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
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
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    const count = animais.filter(a => a.lote_id === l.id).length;
    if (count > 0) { toast.error("Mova os animais para outro lote antes de excluir."); return; }
    if (!confirm(`Tem certeza que deseja excluir o lote "${l.nome}"?`)) return;
    await supabase.from("lotes" as any).delete().eq("id", l.id);
    toast.success("Lote excluído.");
    fetchAll();
  };

  // === Move Animals (by quantity) ===
  const openMoveModal = (pastoId: string) => {
    setMovePastoOrigemId(pastoId);
    setMoveLoteOrigemId("");
    setMoveQtd("");
    setMovePastoDestino("");
    setMoveLoteDestino("");
    setMoveOpen(true);
  };

  const lotesOrigemFiltrados = useMemo(() => {
    if (!movePastoOrigemId) return [];
    return lotes.filter(l => l.pasto_id === movePastoOrigemId);
  }, [lotes, movePastoOrigemId]);

  const animaisDisponiveisOrigem = useMemo(() => {
    let list = animais.filter(a => a.pasto_id === movePastoOrigemId);
    if (moveLoteOrigemId) list = list.filter(a => a.lote_id === moveLoteOrigemId);
    return list;
  }, [animais, movePastoOrigemId, moveLoteOrigemId]);

  const lotesDestinoFiltrados = useMemo(() => {
    if (!movePastoDestino) return [];
    return lotes.filter(l => l.pasto_id === movePastoDestino);
  }, [lotes, movePastoDestino]);

  const handleMoveAnimals = async () => {
    if (isImpersonating) { toast.warning("Modo visualização — ações desabilitadas"); return; }
    if (!user) return;
    const qtd = parseInt(moveQtd);
    if (!qtd || qtd <= 0) { toast.error("Informe uma quantidade válida."); return; }
    if (!movePastoDestino) { toast.error("Selecione o pasto destino."); return; }
    if (qtd > animaisDisponiveisOrigem.length) {
      toast.error(`Apenas ${animaisDisponiveisOrigem.length} animais disponíveis na origem.`);
      return;
    }
    const selecionados = animaisDisponiveisOrigem.slice(0, qtd);
    const ids = selecionados.map(a => a.id);
    const pastoDestObj = pastos.find(p => p.id === movePastoDestino);

    await supabase.from("animais" as any).update({
      pasto_id: movePastoDestino,
      lote_id: moveLoteDestino || null,
    } as any).in("id", ids);

    await supabase.from("movimentacoes_gado" as any).insert({
      tipo: "transferencia",
      data: new Date().toISOString().split("T")[0],
      pasto_origem_id: movePastoOrigemId || null,
      pasto_destino_id: movePastoDestino,
      quantidade: qtd,
      user_id: user.id,
    } as any);

    toast.success(`${qtd} animais movidos para ${pastoDestObj?.nome || "novo pasto"}!`);
    setMoveOpen(false);
    fetchAll();
  };

  // === Helpers ===
  const calcValorEst = (peso: number) => (peso * rendimento / 100 / 15) * valorArroba;

  // Valor médio estimado por animal (considerando todo o rebanho com peso registrado)
  const valorMedioPorAnimal = useMemo(() => {
    const comPeso = animais.filter(a => Number(a.peso_atual) > 0);
    if (comPeso.length === 0) return 0;
    const total = comPeso.reduce((s, a) => s + calcValorEst(Number(a.peso_atual)), 0);
    return total / comPeso.length;
  }, [animais, valorArroba, rendimento]);

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

          const valorEstimado = count * valorMedioPorAnimal;

          const coordsRaw = p.coordenadas as any;
          const coords: [number, number][] | null =
            Array.isArray(coordsRaw) && coordsRaw.length >= 3
              ? coordsRaw
                  .map((c: any) =>
                    Array.isArray(c) ? [Number(c[0]), Number(c[1])] :
                    c && typeof c === "object" ? [Number(c.lat ?? c[0]), Number(c.lng ?? c[1])] :
                    null
                  )
                  .filter((c: any): c is [number, number] => c && Number.isFinite(c[0]) && Number.isFinite(c[1]))
              : null;

          return (
            <Card key={p.id} className="border-border overflow-hidden">
              <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : p.id)}>
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />{p.nome}</div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEditPasto(p); }} title="Editar">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleDeletePasto(p); }} title="Excluir">
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardTitle>
                {p.area_hectares != null && <p className="text-sm text-muted-foreground">{Number(p.area_hectares).toFixed(1)} ha</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Imagem: foto enviada OU mini-mapa do polígono */}
                {p.foto_url ? (
                  <div className="relative group">
                    <img
                      src={p.foto_url}
                      alt={`Foto do pasto ${p.nome}`}
                      className="w-full h-32 object-cover rounded-md border border-border"
                      loading="lazy"
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition"
                      onClick={e => { e.stopPropagation(); handleRemoveFoto(p.id); }}
                      title="Remover foto"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : coords ? (
                  <PastoMiniMapa coordenadas={coords} centroLat={p.centro_lat} centroLng={p.centro_lng} cor={p.cor} />
                ) : (
                  <div className="w-full h-32 rounded-md border border-dashed border-border flex flex-col items-center justify-center gap-1 bg-muted/30">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Sem mapa cadastrado</p>
                  </div>
                )}

                {/* Botão upload de foto */}
                <div onClick={e => e.stopPropagation()}>
                  <label className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                    <ImagePlus className="h-3 w-3" />
                    {p.foto_url ? "Trocar foto" : "Adicionar foto"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadFoto(p.id, f); e.target.value = ""; }}
                    />
                  </label>
                </div>

                {/* Ocupação */}
                {cap > 0 ? (
                  <div className="space-y-1">
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-sm text-muted-foreground">{count} / {cap} cabeças</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{count} cabeças · <span className="italic">Capacidade não definida</span></p>
                )}

                {count > 0 && valorMedioPorAnimal > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span>Valor est.: <strong className="text-foreground">R$ {valorEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                  </div>
                )}

                {/* Ação rápida sempre visível */}
                {count > 0 && (
                  <Button variant="outline" size="sm" className="w-full h-8 gap-1 text-xs" onClick={e => { e.stopPropagation(); openMoveModal(p.id); }}>
                    <ArrowRightLeft className="h-3 w-3" /> Mover Animais
                  </Button>
                )}

                {isExpanded && (
                  <div className="mt-2 space-y-2 pt-2 border-t border-border" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Lotes</p>
                      <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => { setFormLote({ nome: "", pasto_id: p.id }); setOpenLote(true); }}>
                        <Plus className="h-3 w-3" /> Lote
                      </Button>
                    </div>
                    {lotesPasto.length > 0 ? (
                      <div className="space-y-1">
                        {lotesPasto.map(l => {
                          const animaisLote = animais.filter(a => a.lote_id === l.id);
                          return (
                            <div key={l.id} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                              <span className="text-sm">{l.nome} <span className="text-muted-foreground">({animaisLote.length})</span></span>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditLote(l)}>
                                  <Pencil className="h-3 w-3 text-muted-foreground" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDeleteLote(l)}>
                                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Nenhum lote cadastrado</p>
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
            <div className="space-y-2">
              <Label>Cor no mapa</Label>
              <ColorPicker value={formPasto.cor} onChange={(c) => setFormPasto({ ...formPasto, cor: c })} />
            </div>
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
            <div className="space-y-2">
              <Label>Cor no mapa</Label>
              <ColorPicker value={formEditPasto.cor} onChange={(c) => setFormEditPasto({ ...formEditPasto, cor: c })} />
            </div>
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
            {/* Origem */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Pasto Origem</Label>
                <div className="h-10 px-3 flex items-center rounded-md border bg-muted/40 text-sm">
                  {pastos.find(p => p.id === movePastoOrigemId)?.nome || "—"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Lote Origem (opcional)</Label>
                <Select value={moveLoteOrigemId || "__none__"} onValueChange={v => setMoveLoteOrigemId(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Todos do pasto" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Todos do pasto</SelectItem>
                    {lotesOrigemFiltrados.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

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

            {/* Quantidade */}
            <div className="space-y-2">
              <Label>Quantidade de animais *</Label>
              <Input
                type="number"
                min="1"
                max={animaisDisponiveisOrigem.length}
                placeholder="Ex: 10"
                value={moveQtd}
                onChange={e => setMoveQtd(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Disponíveis na origem: <strong className="text-foreground">{animaisDisponiveisOrigem.length}</strong> animais
              </p>
            </div>

            <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              Os animais são selecionados automaticamente pela origem. Os brincos continuam servindo para vacinação, pesagem, reprodução e cadastro — apenas a movimentação entre pastos é feita por quantidade.
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setMoveOpen(false)}>Cancelar</Button>
            <Button onClick={handleMoveAnimals} disabled={!moveQtd || !movePastoDestino}>
              Mover {moveQtd ? `(${moveQtd})` : ""}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
