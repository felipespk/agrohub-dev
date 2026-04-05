import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Lock, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileDropdown() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

  const email = user?.email || "";
  const initials = email ? email.slice(0, 2).toUpperCase() : "U";
  const displayName = user?.user_metadata?.display_name || email;

  const getSettingsPath = () => {
    const path = location.pathname;
    if (path.startsWith("/gado")) return "/gado/configuracoes";
    if (path.startsWith("/financeiro")) return "/financeiro/configuracoes";
    if (path.startsWith("/lavoura")) return "/lavoura/configuracoes";
    return "/conta";
  };

  const handleChangePassword = async () => {
    if (!newPw || !confirmPw) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (newPw.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      setPwOpen(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50">
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[220px]">
          <DropdownMenuLabel className="pb-0">
            <p className="text-sm font-bold truncate">{displayName}</p>
            {displayName !== email && (
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/conta")} className="gap-2.5 cursor-pointer">
            <User className="h-4 w-4" />
            Minha Conta
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPwOpen(true)} className="gap-2.5 cursor-pointer">
            <Lock className="h-4 w-4" />
            Alterar Senha
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(getSettingsPath())} className="gap-2.5 cursor-pointer">
            <Settings className="h-4 w-4" />
            Configurações
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="gap-2.5 cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Senha atual</Label>
              <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
            </div>
            <Button onClick={handleChangePassword} disabled={saving} className="w-full">
              {saving ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
