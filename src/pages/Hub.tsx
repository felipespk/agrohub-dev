import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Wheat, DollarSign, Beef, Sprout, ArrowRight, LogOut, MapPin, Shield } from "lucide-react";
import { getGreeting } from "@/lib/greeting";

const modules = [
  {
    title: "Secador / Silo",
    description: "Gestão de grãos, pesagem, entrada/saída, quebra técnica e armazenagem.",
    icon: Wheat,
    color: "#10B981",
    bg: "#D1FAE5",
    path: "/",
  },
  {
    title: "Financeiro",
    description: "Contas a pagar e receber, fluxo de caixa, controle por atividade.",
    icon: DollarSign,
    color: "#3C50E0",
    bg: "#EEF2FF",
    path: "/financeiro",
  },
  {
    title: "Pecuária",
    description: "Cadastro de animais, pesagens, sanidade, compra e venda de gado.",
    icon: Beef,
    color: "#F59E0B",
    bg: "#FEF3C7",
    path: "/gado",
  },
  {
    title: "Lavoura",
    description: "Planejamento de safra, caderno de campo, estoque de insumos, máquinas e colheita.",
    icon: Sprout,
    color: "#16A34A",
    bg: "#DCFCE7",
    path: "/lavoura",
  },
];

export default function HubPage() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const checkAdmin = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_admin, display_name")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (data) {
          if (data.is_admin === true) setIsAdmin(true);
          if (data.display_name) setDisplayName(data.display_name);
        }
      } catch (e) {
        console.error("Admin check error:", e);
      }
    };
    checkAdmin();
  }, [user]);

  const { greeting } = getGreeting(displayName, user?.email);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <img src="/logo-agrohub.png" alt="AgroHub" className="mb-4" style={{ maxWidth: 200 }} />
        
        <h1 className="text-[28px] font-bold text-foreground mb-1">{greeting}</h1>
        <p className="text-sm text-muted-foreground mb-10">O que deseja gerenciar hoje?</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
          {modules.map((mod) => (
            <button
              key={mod.title}
              onClick={() => navigate(mod.path)}
              className="group relative bg-card border border-border rounded-[20px] p-8 text-left transition-all duration-200 cursor-pointer hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:scale-[1.02] min-h-[220px] flex flex-col"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = mod.color; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ''; }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
                style={{ backgroundColor: mod.bg }}
              >
                <mod.icon className="h-7 w-7" style={{ color: mod.color }} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {mod.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                {mod.description}
              </p>
              <ArrowRight className="absolute bottom-6 right-6 h-[18px] w-[18px] text-muted-foreground/40 group-hover:text-foreground/60 transition-colors" />
            </button>
          ))}
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="group relative bg-card border border-border rounded-[20px] p-8 text-left transition-all duration-200 cursor-pointer hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:scale-[1.02] min-h-[180px] flex flex-col w-full max-w-5xl mt-6"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#DC2626"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ''; }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
              style={{ backgroundColor: "#FEE2E2" }}
            >
              <Shield className="h-7 w-7" style={{ color: "#DC2626" }} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Painel Admin</h3>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              Gerenciar usuários, visualizar contas e dar suporte.
            </p>
            <ArrowRight className="absolute bottom-6 right-6 h-[18px] w-[18px] text-muted-foreground/40 group-hover:text-foreground/60 transition-colors" />
          </button>
        )}

        <button
          onClick={() => navigate("/mapa")}
          className="flex items-center gap-2 text-[15px] text-muted-foreground hover:text-primary transition-colors mt-6"
        >
          <MapPin className="h-4 w-4" />
          Mapa da Fazenda
        </button>
      </div>

      <footer className="py-4 px-6 flex items-center justify-center gap-4 text-xs text-muted-foreground border-t border-border">
        {user && <span>{user.email}</span>}
        <button
          onClick={signOut}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </footer>
    </div>
  );
}
