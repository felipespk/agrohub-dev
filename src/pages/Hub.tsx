import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Wheat, DollarSign, Beef, Sprout, ArrowRight, LogOut, MapPin } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <img src="/logo-agrohub.png" alt="AgroHub" className="mb-2 mix-blend-multiply" style={{ maxWidth: 220 }} />
        <p className="text-muted-foreground text-base mb-12">Selecione o módulo</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
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

        <button
          onClick={() => navigate("/mapa")}
          className="flex items-center gap-2 text-[15px] text-[#6B7280] hover:text-[#16A34A] transition-colors mt-6"
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
