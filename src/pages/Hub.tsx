import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Wheat, DollarSign, Beef, ArrowRight, LogOut, Leaf } from "lucide-react";

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
];

export default function HubPage() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="flex items-center gap-2.5 mb-1">
          <Leaf className="h-7 w-7 text-primary" />
          <span className="text-[22px] font-bold text-foreground tracking-tight">
            AgroHub
          </span>
        </div>
        <p className="text-muted-foreground text-base mb-12">Selecione o módulo</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          {modules.map((mod) => (
            <button
              key={mod.title}
              onClick={() => navigate(mod.path)}
              className="group relative bg-card border border-border rounded-xl p-8 text-left transition-all duration-200 cursor-pointer hover:shadow-md min-h-[220px] flex flex-col"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = mod.color; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ''; }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
                style={{ backgroundColor: mod.bg }}
              >
                <mod.icon className="h-7 w-7" style={{ color: mod.color }} />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {mod.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                {mod.description}
              </p>
              <ArrowRight className="absolute bottom-6 right-6 h-[18px] w-[18px] text-[#94A3B8] group-hover:text-foreground/60 transition-colors" />
            </button>
          ))}
        </div>
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
