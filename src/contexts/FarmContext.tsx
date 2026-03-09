import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const STORAGE_KEY = "graocontrol_farm_name";

interface FarmContextType {
  farmName: string;
  setFarmName: (name: string) => void;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export function FarmProvider({ children }: { children: ReactNode }) {
  const [farmName, setFarmNameState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "";
  });

  const setFarmName = (name: string) => {
    setFarmNameState(name);
    localStorage.setItem(STORAGE_KEY, name);
  };

  // Listen for changes from other tabs/windows
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setFarmNameState(e.newValue || "");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <FarmContext.Provider value={{ farmName, setFarmName }}>
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
