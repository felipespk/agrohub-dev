import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Types matching DB schema
export interface Produtor {
  id: string;
  user_id: string;
  tipo_documento: string;
  documento: string;
  nome: string;
  fazenda: string;
  endereco_fazenda: string;
  cidade: string;
  estado: string;
  inscricao_estadual: string;
  telefone: string;
}

export interface TipoGrao {
  id: string;
  user_id: string;
  nome: string;
  umidade_padrao: number;
}

export interface Comprador {
  id: string;
  user_id: string;
  nome: string;
  contato: string;
}

export interface Recebimento {
  id: string;
  user_id: string;
  data: string;
  placa_caminhao: string;
  produtor_id: string;
  tipo_grao_id: string;
  peso_bruto: number;
  umidade_inicial: number;
  umidade_final_alvo: number;
  impureza: number;
  desconto_umidade_percent: number;
  desconto_umidade_kg: number;
  desconto_impureza_kg: number;
  taxa_secagem_percentual: number;
  desconto_secagem_kg: number;
  peso_liquido: number;
  created_at: string;
  // Joined fields
  produtor_nome?: string;
  tipo_grao_nome?: string;
}

export interface Saida {
  id: string;
  user_id: string;
  data: string;
  placa_caminhao: string;
  comprador_id: string;
  produtor_id?: string | null;
  tipo_grao_id?: string | null;
  classificacao: string;
  kgs_expedidos: number;
  categoria: string;
  created_at: string;
  // Joined
  comprador_nome?: string;
  produtor_nome?: string;
  tipo_grao_nome?: string;
}

export interface QuebraTecnica {
  id: string;
  user_id: string;
  data: string;
  kg_ajuste: number;
  justificativa: string;
}

interface AppContextType {
  produtores: Produtor[];
  tiposGrao: TipoGrao[];
  compradores: Comprador[];
  recebimentos: Recebimento[];
  saidas: Saida[];
  quebras: QuebraTecnica[];
  loading: boolean;
  refresh: () => Promise<void>;
  // CRUD helpers
  addProdutor: (data: Omit<Produtor, "id" | "user_id">) => Promise<Produtor | null>;
  updateProdutor: (id: string, data: Partial<Omit<Produtor, "id" | "user_id">>) => Promise<boolean>;
  deleteProdutor: (id: string) => Promise<boolean>;
  addTipoGrao: (data: Omit<TipoGrao, "id" | "user_id">) => Promise<TipoGrao | null>;
  updateTipoGrao: (id: string, data: Partial<Omit<TipoGrao, "id" | "user_id">>) => Promise<boolean>;
  deleteTipoGrao: (id: string) => Promise<boolean>;
  addComprador: (data: Omit<Comprador, "id" | "user_id">) => Promise<Comprador | null>;
  updateComprador: (id: string, data: Partial<Omit<Comprador, "id" | "user_id">>) => Promise<boolean>;
  deleteComprador: (id: string) => Promise<boolean>;
  addRecebimento: (data: Omit<Recebimento, "id" | "user_id" | "created_at" | "produtor_nome" | "tipo_grao_nome">) => Promise<Recebimento | null>;
  updateRecebimento: (id: string, data: Partial<Omit<Recebimento, "id" | "user_id" | "created_at" | "produtor_nome" | "tipo_grao_nome">>) => Promise<boolean>;
  deleteRecebimento: (id: string) => Promise<boolean>;
  addSaida: (data: Omit<Saida, "id" | "user_id" | "created_at" | "comprador_nome">) => Promise<Saida | null>;
  updateSaida: (id: string, data: Partial<Omit<Saida, "id" | "user_id" | "created_at" | "comprador_nome">>) => Promise<boolean>;
  deleteSaida: (id: string) => Promise<boolean>;
  addQuebra: (data: Omit<QuebraTecnica, "id" | "user_id">) => Promise<QuebraTecnica | null>;
  deleteQuebra: (id: string) => Promise<boolean>;
  capacidadeSilo: number;
  setCapacidadeSilo: (v: number) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [tiposGrao, setTiposGrao] = useState<TipoGrao[]>([]);
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [quebras, setQuebras] = useState<QuebraTecnica[]>([]);
  const [loading, setLoading] = useState(true);
  const [capacidadeSilo, setCapacidadeSiloState] = useState<number>(() => {
    const stored = localStorage.getItem("capacidadeSilo");
    return stored ? Number(stored) : 5000000;
  });
  const setCapacidadeSilo = (v: number) => {
    setCapacidadeSiloState(v);
    localStorage.setItem("capacidadeSilo", String(v));
  };

  const refresh = useCallback(async () => {
    if (!user) {
      setProdutores([]); setTiposGrao([]); setCompradores([]);
      setRecebimentos([]); setSaidas([]); setQuebras([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [pRes, tRes, cRes, rRes, sRes, qRes] = await Promise.all([
      supabase.from("produtores").select("*").order("nome"),
      supabase.from("tipos_grao").select("*").order("nome"),
      supabase.from("compradores").select("*").order("nome"),
      supabase.from("recebimentos").select("*, produtores(nome), tipos_grao(nome)").order("created_at", { ascending: false }),
      supabase.from("saidas").select("*, compradores(nome), produtores(nome), tipos_grao(nome)").order("created_at", { ascending: false }),
      supabase.from("quebras_tecnicas").select("*").order("created_at", { ascending: false }),
    ]);
    if (pRes.data) setProdutores(pRes.data as any);
    if (tRes.data) setTiposGrao(tRes.data as any);
    if (cRes.data) setCompradores(cRes.data as any);
    if (rRes.data) setRecebimentos(rRes.data.map((r: any) => ({
      ...r,
      produtor_nome: r.produtores?.nome || "",
      tipo_grao_nome: r.tipos_grao?.nome || "",
    })));
    if (sRes.data) setSaidas(sRes.data.map((s: any) => ({
      ...s,
      comprador_nome: s.compradores?.nome || "",
      produtor_nome: s.produtores?.nome || "",
      tipo_grao_nome: s.tipos_grao?.nome || "",
    })));
    if (qRes.data) setQuebras(qRes.data as any);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Generic CRUD helpers
  const addProdutor = async (data: Omit<Produtor, "id" | "user_id">) => {
    const { data: row, error } = await supabase.from("produtores").insert({ ...data, user_id: user!.id }).select().single();
    if (error) { toast.error(error.message); return null; }
    setProdutores(prev => [...prev, row as any].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
    return row as any;
  };
  const updateProdutor = async (id: string, data: Partial<Omit<Produtor, "id" | "user_id">>) => {
    const { error } = await supabase.from("produtores").update(data).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    setProdutores(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    return true;
  };
  const deleteProdutor = async (id: string) => {
    const { error } = await supabase.from("produtores").delete().eq("id", id);
    if (error) { toast.error(error.message); return false; }
    setProdutores(prev => prev.filter(p => p.id !== id));
    return true;
  };

  const addTipoGrao = async (data: Omit<TipoGrao, "id" | "user_id">) => {
    const { data: row, error } = await supabase.from("tipos_grao").insert({ ...data, user_id: user!.id }).select().single();
    if (error) { toast.error(error.message); return null; }
    setTiposGrao(prev => [...prev, row as any].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
    return row as any;
  };
  const updateTipoGrao = async (id: string, data: Partial<Omit<TipoGrao, "id" | "user_id">>) => {
    const { error } = await supabase.from("tipos_grao").update(data).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    setTiposGrao(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    return true;
  };
  const deleteTipoGrao = async (id: string) => {
    const { error } = await supabase.from("tipos_grao").delete().eq("id", id);
    if (error) { toast.error(error.message); return false; }
    setTiposGrao(prev => prev.filter(t => t.id !== id));
    return true;
  };

  const addComprador = async (data: Omit<Comprador, "id" | "user_id">) => {
    const { data: row, error } = await supabase.from("compradores").insert({ ...data, user_id: user!.id }).select().single();
    if (error) { toast.error(error.message); return null; }
    setCompradores(prev => [...prev, row as any].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
    return row as any;
  };
  const updateComprador = async (id: string, data: Partial<Omit<Comprador, "id" | "user_id">>) => {
    const { error } = await supabase.from("compradores").update(data).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    setCompradores(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    return true;
  };
  const deleteComprador = async (id: string) => {
    const { error } = await supabase.from("compradores").delete().eq("id", id);
    if (error) { toast.error(error.message); return false; }
    setCompradores(prev => prev.filter(c => c.id !== id));
    return true;
  };

  const addRecebimento = async (data: Omit<Recebimento, "id" | "user_id" | "created_at" | "produtor_nome" | "tipo_grao_nome">) => {
    const { data: row, error } = await supabase.from("recebimentos").insert({ ...data, user_id: user!.id }).select("*, produtores(nome), tipos_grao(nome)").single();
    if (error) { toast.error(error.message); return null; }
    const mapped = { ...row, produtor_nome: (row as any).produtores?.nome || "", tipo_grao_nome: (row as any).tipos_grao?.nome || "" } as any;
    setRecebimentos(prev => [mapped, ...prev]);
    return mapped;
  };
  const updateRecebimento = async (id: string, data: Partial<Omit<Recebimento, "id" | "user_id" | "created_at" | "produtor_nome" | "tipo_grao_nome">>) => {
    const { error } = await supabase.from("recebimentos").update(data).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    await refresh();
    return true;
  };
  const deleteRecebimento = async (id: string) => {
    const { error } = await supabase.from("recebimentos").delete().eq("id", id);
    if (error) { toast.error(error.message); return false; }
    setRecebimentos(prev => prev.filter(r => r.id !== id));
    return true;
  };

  const addSaida = async (data: Omit<Saida, "id" | "user_id" | "created_at" | "comprador_nome">) => {
    const { data: row, error } = await supabase.from("saidas").insert({ ...data, user_id: user!.id }).select("*, compradores(nome)").single();
    if (error) { toast.error(error.message); return null; }
    const mapped = { ...row, comprador_nome: (row as any).compradores?.nome || "" } as any;
    setSaidas(prev => [mapped, ...prev]);
    return mapped;
  };
  const updateSaida = async (id: string, data: Partial<Omit<Saida, "id" | "user_id" | "created_at" | "comprador_nome">>) => {
    const { error } = await supabase.from("saidas").update(data).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    await refresh();
    return true;
  };
  const deleteSaida = async (id: string) => {
    const { error } = await supabase.from("saidas").delete().eq("id", id);
    if (error) { toast.error(error.message); return false; }
    setSaidas(prev => prev.filter(s => s.id !== id));
    return true;
  };

  const addQuebra = async (data: Omit<QuebraTecnica, "id" | "user_id">) => {
    const { data: row, error } = await supabase.from("quebras_tecnicas").insert({ ...data, user_id: user!.id }).select().single();
    if (error) { toast.error(error.message); return null; }
    setQuebras(prev => [row as any, ...prev]);
    return row as any;
  };
  const deleteQuebra = async (id: string) => {
    const { error } = await supabase.from("quebras_tecnicas").delete().eq("id", id);
    if (error) { toast.error(error.message); return false; }
    setQuebras(prev => prev.filter(q => q.id !== id));
    return true;
  };

  return (
    <AppContext.Provider value={{
      produtores, tiposGrao, compradores, recebimentos, saidas, quebras, loading, refresh,
      addProdutor, updateProdutor, deleteProdutor,
      addTipoGrao, updateTipoGrao, deleteTipoGrao,
      addComprador, updateComprador, deleteComprador,
      addRecebimento, updateRecebimento, deleteRecebimento,
      addSaida, updateSaida, deleteSaida,
      addQuebra, deleteQuebra,
      capacidadeSilo, setCapacidadeSilo,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppData must be used within AppProvider");
  return ctx;
}
