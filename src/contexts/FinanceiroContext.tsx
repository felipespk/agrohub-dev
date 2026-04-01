import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Row = Record<string, any>;

interface FinanceiroContextType {
  centrosCusto: Row[];
  contasBancarias: Row[];
  categorias: Row[];
  contatos: Row[];
  contasPR: Row[];
  lancamentos: Row[];
  loading: boolean;
  reload: () => void;
}

const FinanceiroContext = createContext<FinanceiroContextType | null>(null);

const DEFAULT_CENTROS = [
  { nome: "Secador / Silo", cor: "#16A34A", icone: "wheat" },
  { nome: "Pecuária", cor: "#D97706", icone: "beef" },
  { nome: "Administrativo", cor: "#2563EB", icone: "building" },
  { nome: "Pessoal", cor: "#8B5CF6", icone: "user" },
];

export function FinanceiroProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [centrosCusto, setCentrosCusto] = useState<Row[]>([]);
  const [contasBancarias, setContasBancarias] = useState<Row[]>([]);
  const [categorias, setCategorias] = useState<Row[]>([]);
  const [contatos, setContatos] = useState<Row[]>([]);
  const [contasPR, setContasPR] = useState<Row[]>([]);
  const [lancamentos, setLancamentos] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [cc, cb, cat, con, cpr, lan] = await Promise.all([
      supabase.from("centros_custo").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("contas_bancarias").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("categorias_financeiras").select("*").eq("user_id", user.id).order("nome"),
      supabase.from("contatos_financeiros").select("*").eq("user_id", user.id).order("nome"),
      supabase.from("contas_pr").select("*, contato:contatos_financeiros(nome), categoria:categorias_financeiras(nome), centro:centros_custo(nome), conta:contas_bancarias(nome)").eq("user_id", user.id).order("data_vencimento", { ascending: true }),
      supabase.from("lancamentos").select("*, categoria:categorias_financeiras(nome), centro:centros_custo(nome), conta:contas_bancarias(nome), conta_dest:contas_bancarias!lancamentos_conta_destino_id_fkey(nome), contato:contatos_financeiros(nome)").eq("user_id", user.id).order("data", { ascending: false }),
    ]);

    // Seed default cost centers if empty
    if (cc.data && cc.data.length === 0) {
      const inserts = DEFAULT_CENTROS.map(c => ({ ...c, user_id: user.id }));
      const { data: seeded } = await supabase.from("centros_custo").insert(inserts).select();
      setCentrosCusto(seeded || []);
    } else {
      setCentrosCusto(cc.data || []);
    }

    setContasBancarias(cb.data || []);
    setCategorias(cat.data || []);
    setContatos(con.data || []);
    setContasPR(cpr.data || []);
    setLancamentos(lan.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <FinanceiroContext.Provider value={{ centrosCusto, contasBancarias, categorias, contatos, contasPR, lancamentos, loading, reload: fetchAll }}>
      {children}
    </FinanceiroContext.Provider>
  );
}

export function useFinanceiro() {
  const ctx = useContext(FinanceiroContext);
  if (!ctx) throw new Error("useFinanceiro must be used within FinanceiroProvider");
  return ctx;
}
