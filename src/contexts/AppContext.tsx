import { createContext, useContext, useState, ReactNode } from "react";
import { Produtor, TipoGrao, Comprador, Recebimento, Saida, QuebraTecnica } from "@/types";
import { produtoresMock, tiposGraoMock, compradoresMock, recebimentosMock, saidasMock, quebrasMock } from "@/data/mock-data";

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
  const [produtores, setProdutores] = useState<Produtor[]>(produtoresMock);
  const [tiposGrao, setTiposGrao] = useState<TipoGrao[]>(tiposGraoMock);
  const [compradores, setCompradores] = useState<Comprador[]>(compradoresMock);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>(recebimentosMock);
  const [saidas, setSaidas] = useState<Saida[]>(saidasMock);
  const [quebras, setQuebras] = useState<QuebraTecnica[]>(quebrasMock);

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
