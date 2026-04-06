import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export function useEffectiveUser() {
  const { user } = useAuth();
  const { impersonatedUserId, isImpersonating } = useImpersonation();

  return {
    effectiveUserId: isImpersonating && impersonatedUserId ? impersonatedUserId : user?.id || "",
    isImpersonating,
    realUserId: user?.id || "",
  };
}
