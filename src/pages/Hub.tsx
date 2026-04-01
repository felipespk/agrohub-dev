import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Wheat, DollarSign, Beef, ArrowRight, LogOut } from "lucide-react";

const modules = [
  {
    title: "Secador / Silo",
    description: "Gestão de grãos, pesagem, entrada/saída, quebra técnica e armazenagem.",
    icon: Wheat,
    color: "hsl(142 64% 36%)",
    bgColor: "bg-green-50",
    borderHover: "hover:border-green-500",
    path: "/",
  },
  {
    title: "Financeiro",
    description: "Contas a pagar e receber, fluxo de caixa, controle por atividade.",
    icon: DollarSign,
    color: "hsl(217 91% 60%)",
    bgColor: "bg-blue-50",
    borderHover: "hover:border-blue-500",
    path: "/financeiro",
  },
  {
    title: "Pecuária",
    description: "Cadastro de animais, pesagens, sanidade, compra e venda de gado.",
    icon: Beef,
    color: "hsl(38 92% 50%)",
    bgColor: "bg-amber-50",
    borderHover: "hover:border-amber-500",
    path: "/gado",
  },
];

export default function HubPage() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="flex items-center gap-2.5 mb-2">
          <Wheat className="h-9 w-9 text-primary" />
          <span className="text-3xl font-display font-bold text-foreground tracking-tight">
            AgroHub
          </span>
        </div>
        <p className="text-muted-foreground text-sm mb-10">Selecione o módulo</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          {modules.map((mod) => (
            <button
              key={mod.title}
              onClick={() => navigate(mod.path)}
              className={`group relative bg-card border border-border rounded-xl p-6 text-left transition-all cursor-pointer ${mod.borderHover} hover:shadow-md`}
            >
              <div
                className={`w-12 h-12 rounded-full ${mod.bgColor} flex items-center justify-center mb-4`}
              >
                <mod.icon className="h-6 w-6" style={{ color: mod.color }} />
              </div>
              <h3 className="text-lg font-display font-bold text-foreground mb-1">
                {mod.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {mod.description}
              </p>
              <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
            </button>
          ))}
        </div>
      </div>

      <footer className="py-4 px-6 flex items-center justify-center gap-4 text-sm text-muted-foreground border-t border-border">
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
