import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Produtor, TipoGrao, Comprador, Recebimento, Saida, QuebraTecnica } from "@/types";
import { produtoresMock, tiposGraoMock, compradoresMock, recebimentosMock, saidasMock, quebrasMock } from "@/data/mock-data";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function usePersistedState<T>(key: string, fallback: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setStateInternal] = useState<T>(() => loadFromStorage(key, fallback));

  const setState: React.Dispatch<React.SetStateAction<T>> = useCallback((action) => {
    setStateInternal((prev) => {
      const next = typeof action === "function" ? (action as (prev: T) => T)(prev) : action;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch (e) {
        console.error(`Failed to persist ${key}:`, e);
      }
      return next;
    });
  }, [key]);

  return [state, setState];
}

interface AppContextType {
  produtores: Produtor[];
  setProdutores: React.Dispatch<React.SetStateAction<Produtor[]>>;
  tiposGrao: TipoGrao[];
  setTiposGrao: React.Dispatch<React.SetStateAction<TipoGrao[]>>;
  compradores: Comprador[];
  setCompradores: React.Dispatch<React.SetStateAction<Comprador[]>>;
  recebimentos: Recebimento[];
  setRecebimentos: React.Dispatch<React.SetStateAction<Recebimento[]>>;
  saidas: Saida[];
  setSaidas: React.Dispatch<React.SetStateAction<Saida[]>>;
  quebras: QuebraTecnica[];
  setQuebras: React.Dispatch<React.SetStateAction<QuebraTecnica[]>>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [produtores, setProdutores] = usePersistedState<Produtor[]>("gc_produtores", produtoresMock);
  const [tiposGrao, setTiposGrao] = usePersistedState<TipoGrao[]>("gc_tiposGrao", tiposGraoMock);
  const [compradores, setCompradores] = usePersistedState<Comprador[]>("gc_compradores", compradoresMock);
  const [recebimentos, setRecebimentos] = usePersistedState<Recebimento[]>("gc_recebimentos", recebimentosMock);
  const [saidas, setSaidas] = usePersistedState<Saida[]>("gc_saidas", saidasMock);
  const [quebras, setQuebras] = usePersistedState<QuebraTecnica[]>("gc_quebras", quebrasMock);

  return (
    <AppContext.Provider value={{
      produtores, setProdutores,
      tiposGrao, setTiposGrao,
      compradores, setCompradores,
      recebimentos, setRecebimentos,
      saidas, setSaidas,
      quebras, setQuebras,
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
