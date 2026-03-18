import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MasterPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthorized: () => void;
  actionLabel?: string;
}

export default function MasterPasswordModal({ open, onOpenChange, onAuthorized, actionLabel = "editar/excluir" }: MasterPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuthorize = async () => {
    if (!password.trim()) {
      setError("Informe a senha master.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("master-password", {
        body: { action: "verify", password },
      });
      if (fnError) throw fnError;
      if (data?.valid) {
        setPassword("");
        onOpenChange(false);
        onAuthorized();
      } else {
        setError("Senha inválida.");
      }
    } catch (e: any) {
      setError(e.message || "Erro ao verificar senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) setPassword(""); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Acesso Restrito: Registro Bloqueado
          </DialogTitle>
          <DialogDescription>
            Este lançamento foi criado há mais de 48 horas. Insira a Senha Master para liberar a alteração.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="master-pw">Senha Master</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="master-pw"
                type="password"
                className="pl-10"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleAuthorize()}
                placeholder="••••••••"
                autoFocus
              />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleAuthorize} disabled={loading}>
              {loading ? "Verificando..." : "Autorizar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
