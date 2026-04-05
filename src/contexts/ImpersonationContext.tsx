import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedUserId: string | null;
  impersonatedEmail: string | null;
  startImpersonation: (userId: string, email: string) => void;
  stopImpersonation: () => void;
  getEffectiveUserId: (realUserId: string) => string;
}

const ImpersonationContext = createContext<ImpersonationContextType | null>(null);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(
    () => localStorage.getItem("impersonating_user_id")
  );
  const [impersonatedEmail, setImpersonatedEmail] = useState<string | null>(
    () => localStorage.getItem("impersonating_email")
  );

  const isImpersonating = !!impersonatedUserId;

  const startImpersonation = (userId: string, email: string) => {
    localStorage.setItem("impersonating_user_id", userId);
    localStorage.setItem("impersonating_email", email);
    setImpersonatedUserId(userId);
    setImpersonatedEmail(email);
  };

  const stopImpersonation = () => {
    localStorage.removeItem("impersonating_user_id");
    localStorage.removeItem("impersonating_email");
    localStorage.removeItem("admin_original_id");
    setImpersonatedUserId(null);
    setImpersonatedEmail(null);
  };

  const getEffectiveUserId = (realUserId: string) => {
    return impersonatedUserId || realUserId;
  };

  return (
    <ImpersonationContext.Provider
      value={{
        isImpersonating,
        impersonatedUserId,
        impersonatedEmail,
        startImpersonation,
        stopImpersonation,
        getEffectiveUserId,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error("useImpersonation must be used within ImpersonationProvider");
  return ctx;
}
