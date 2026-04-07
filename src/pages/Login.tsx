import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Preencha e-mail e senha."); return; }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - image */}
      <div
        className="hidden lg:block lg:w-1/2 bg-cover bg-center relative"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(150,38%,15%)]/70 to-[hsl(142,76%,36%)]/40" />
        <div className="absolute bottom-12 left-12 right-12">
          <h2 className="text-3xl font-bold text-white mb-2">Gerencie sua fazenda com inteligência</h2>
          <p className="text-white/80 text-base">Secador, Financeiro, Pecuária e Lavoura — tudo em um só lugar.</p>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center bg-card px-6">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="text-center space-y-2">
            <img src="/logo-agrohub.png" alt="AgroHub" className="mx-auto mb-6" style={{ maxWidth: 240 }} />
            <h1 className="text-[28px] font-bold text-foreground">Bem-vindo de volta</h1>
            <p className="text-sm text-muted-foreground">Faça login para acessar sua fazenda</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-[10px] px-4" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="h-12 rounded-[10px] px-4" />
            </div>
            <Button type="submit" className="w-full h-12 text-sm font-semibold rounded-[10px]" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="text-center space-y-2">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">Esqueceu a senha?</Link>
            <p className="text-sm text-muted-foreground">
              Não tem conta? <Link to="/register" className="text-primary hover:underline font-medium">Cadastre-se</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
