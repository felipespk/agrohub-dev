import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wheat, LogIn } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Wheat className="h-8 w-8 text-primary" />
            <span className="text-2xl font-display font-bold text-foreground tracking-tight">GrãoControl</span>
          </div>
          <p className="text-sm text-muted-foreground">Faça login para acessar sua conta</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl border bg-card shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <LogIn className="h-4 w-4" /> {loading ? "Entrando..." : "Entrar"}
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
  );
}
