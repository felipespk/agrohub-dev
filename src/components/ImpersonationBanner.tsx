import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedEmail, stopImpersonation } = useImpersonation();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 text-white text-sm font-medium"
      style={{ backgroundColor: "#DC2626", height: 40 }}
    >
      <span>Visualizando como: {impersonatedEmail}</span>
      <span>—</span>
      <button
        onClick={() => {
          stopImpersonation();
          navigate("/admin");
        }}
        className="flex items-center gap-1.5 px-3 py-1 rounded border border-white/60 hover:bg-white/20 transition-colors text-xs font-semibold"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para Admin
      </button>
    </div>
  );
}
