import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FarmContextType {
  farmName: string;
  setFarmName: (name: string) => void;
  loading: boolean;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export function FarmProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [farmName, setFarmNameState] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch from DB on mount
  useEffect(() => {
    if (!user) {
      setFarmNameState("");
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("profiles")
      .select("farm_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setFarmNameState(data?.farm_name || "");
        setLoading(false);
      });
  }, [user]);

  const setFarmName = useCallback(async (name: string) => {
    setFarmNameState(name);
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { user_id: user.id, farm_name: name } as any,
        { onConflict: "user_id" }
      );
    if (error) {
      console.error("Failed to save farm name:", error);
    }
  }, [user]);

  return (
    <FarmContext.Provider value={{ farmName, setFarmName, loading }}>
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
