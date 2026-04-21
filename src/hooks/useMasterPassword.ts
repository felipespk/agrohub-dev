import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useMasterPassword() {
  const { user } = useAuth();
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkPassword = useCallback(async () => {
    if (!user) { setHasPassword(false); setLoading(false); return; }
    try {
      const { data } = await supabase.functions.invoke("master-password", {
        body: { action: "check" },
      });
      setHasPassword(!!data?.hasPassword);
    } catch {
      setHasPassword(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { checkPassword(); }, [checkPassword]);

  return { hasPassword, loading, refresh: checkPassword };
}
