import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wheat, Mail } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Informe seu e-mail."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("E-mail de recuperação enviado!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Wheat className="h-8 w-8 text-primary mx-auto" />
          <h1 className="text-xl font-display font-bold text-foreground">Recuperar Senha</h1>
          <p className="text-sm text-muted-foreground">
            {sent ? "Verifique sua caixa de entrada." : "Informe seu e-mail para receber o link de recuperação."}
          </p>
        </div>
        {!sent && (
          <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl border bg-card shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <Mail className="h-4 w-4" /> {loading ? "Enviando..." : "Enviar Link"}
            </Button>
          </form>
        )}
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline font-medium">Voltar ao Login</Link>
        </p>
      </div>
    </div>
  );
}
