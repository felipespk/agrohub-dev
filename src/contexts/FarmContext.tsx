import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type ModuleKey = "secador" | "financeiro" | "gado" | "lavoura";

interface FarmContextType {
  /** Legacy single name — returns secador name for backward compat */
  farmName: string;
  setFarmName: (name: string) => void;
  /** Per-module getters/setters */
  getFarmName: (mod: ModuleKey) => string;
  setModuleFarmName: (mod: ModuleKey, name: string) => Promise<void>;
  loading: boolean;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export function FarmProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [names, setNames] = useState<Record<ModuleKey, string>>({
    secador: "",
    financeiro: "",
    gado: "",
    lavoura: "",
  });
  const [loading, setLoading] = useState(true);

  // Fetch all module names on mount
  useEffect(() => {
    if (!user) {
      setNames({ secador: "", financeiro: "", gado: "", lavoura: "" });
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("profiles")
      .select("farm_name, farm_name_financeiro, farm_name_gado, farm_name_lavoura")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setNames({
          secador: (data as any)?.farm_name || "",
          financeiro: (data as any)?.farm_name_financeiro || "",
          gado: (data as any)?.farm_name_gado || "",
        });
        setLoading(false);
      });
  }, [user]);

  const getFarmName = useCallback((mod: ModuleKey) => names[mod], [names]);

  const setModuleFarmName = useCallback(async (mod: ModuleKey, name: string) => {
    setNames(prev => ({ ...prev, [mod]: name }));
    if (!user) return;

    const colMap: Record<ModuleKey, string> = {
      secador: "farm_name",
      financeiro: "farm_name_financeiro",
      gado: "farm_name_gado",
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(
        { user_id: user.id, [colMap[mod]]: name } as any,
        { onConflict: "user_id" }
      );
    if (error) console.error("Failed to save farm name:", error);
  }, [user]);

  // Legacy compat
  const setFarmName = useCallback((name: string) => {
    setModuleFarmName("secador", name);
  }, [setModuleFarmName]);

  return (
    <FarmContext.Provider value={{
      farmName: names.secador,
      setFarmName,
      getFarmName,
      setModuleFarmName,
      loading,
    }}>
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
