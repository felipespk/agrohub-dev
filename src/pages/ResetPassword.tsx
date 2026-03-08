import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wheat, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Senha deve ter pelo menos 6 caracteres."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha atualizada com sucesso!");
      navigate("/");
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <Wheat className="h-8 w-8 text-primary mx-auto" />
          <p className="text-muted-foreground">Link inválido ou expirado.</p>
          <Button onClick={() => navigate("/login")} variant="outline">Voltar ao Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Wheat className="h-8 w-8 text-primary mx-auto" />
          <h1 className="text-xl font-display font-bold text-foreground">Nova Senha</h1>
          <p className="text-sm text-muted-foreground">Digite sua nova senha</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl border bg-card shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <KeyRound className="h-4 w-4" /> {loading ? "Atualizando..." : "Atualizar Senha"}
          </Button>
        </form>
      </div>
    </div>
  );
}
