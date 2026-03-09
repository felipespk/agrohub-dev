import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const STORAGE_KEY = "graocontrol_farm_name";
const TAXA_KEY = "graocontrol_taxa_expedicao";
const TAXA_DEFAULT = 15;

interface FarmContextType {
  farmName: string;
  setFarmName: (name: string) => void;
  taxaExpedicao: number;
  setTaxaExpedicao: (value: number) => void;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export function FarmProvider({ children }: { children: ReactNode }) {
  const [farmName, setFarmNameState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "";
  });

  const [taxaExpedicao, setTaxaExpedicaoState] = useState(() => {
    const stored = localStorage.getItem(TAXA_KEY);
    return stored ? Number(stored) : TAXA_DEFAULT;
  });

  const setFarmName = (name: string) => {
    setFarmNameState(name);
    localStorage.setItem(STORAGE_KEY, name);
  };

  const setTaxaExpedicao = (value: number) => {
    setTaxaExpedicaoState(value);
    localStorage.setItem(TAXA_KEY, String(value));
  };

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setFarmNameState(e.newValue || "");
      }
      if (e.key === TAXA_KEY) {
        setTaxaExpedicaoState(e.newValue ? Number(e.newValue) : TAXA_DEFAULT);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <FarmContext.Provider value={{ farmName, setFarmName, taxaExpedicao, setTaxaExpedicao }}>
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const context = useContext(FarmContext);
  if (!context) {
    throw new Error("useFarm must be used within FarmProvider");
  }
  return context;
}
