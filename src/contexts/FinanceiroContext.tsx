import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";

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
  const { effectiveUserId } = useEffectiveUser();
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
    const uid = effectiveUserId || user.id;
    const [cc, cb, cat, con, cpr, lan] = await Promise.all([
      supabase.from("centros_custo").select("*").eq("user_id", uid).order("created_at"),
      supabase.from("contas_bancarias").select("*").eq("user_id", uid).order("created_at"),
      supabase.from("categorias_financeiras").select("*").eq("user_id", uid).order("nome"),
      supabase.from("contatos_financeiros").select("*").eq("user_id", uid).order("nome"),
      supabase.from("contas_pr").select("*").eq("user_id", uid).order("data_vencimento", { ascending: true }),
      supabase.from("lancamentos").select("*").eq("user_id", uid).order("data", { ascending: false }),
    ]);
    ]);

    // Seed default cost centers if empty
    let centrosData: Row[];
    if (cc.data && cc.data.length === 0) {
      const inserts = DEFAULT_CENTROS.map(c => ({ ...c, user_id: user.id }));
      const { data: seeded } = await supabase.from("centros_custo").insert(inserts).select();
      centrosData = seeded || [];
    } else {
      centrosData = cc.data || [];
    }

    const contasBData = cb.data || [];
    const catsData = cat.data || [];
    const contData = con.data || [];

    // Enrich contas_pr with relation names
    const cprEnriched = (cpr.data || []).map(r => ({
      ...r,
      contato: contData.find(c => c.id === r.contato_id),
      categoria: catsData.find(c => c.id === r.categoria_id),
      centro: centrosData.find(c => c.id === r.centro_custo_id),
      conta: contasBData.find(c => c.id === r.conta_bancaria_id),
    }));

    // Enrich lancamentos with relation names
    const lanEnriched = (lan.data || []).map(l => ({
      ...l,
      categoria: catsData.find(c => c.id === l.categoria_id),
      centro: centrosData.find(c => c.id === l.centro_custo_id),
      conta: contasBData.find(c => c.id === l.conta_bancaria_id),
      conta_dest: contasBData.find(c => c.id === l.conta_destino_id),
      contato: contData.find(c => c.id === l.contato_id),
    }));

    setCentrosCusto(centrosData);
    setContasBancarias(contasBData);
    setCategorias(catsData);
    setContatos(contData);
    setContasPR(cprEnriched);
    setLancamentos(lanEnriched);
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
