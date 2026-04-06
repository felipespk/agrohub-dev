import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ArrowLeft, Users, Beef, Sprout, LogIn, ShieldCheck, ShieldOff, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const ADMIN_PASSWORD_HASH = "1c8e7102b228cf26ed8e15e64ed2b1497d411ea88700995074a448d924ea922d";
const SESSION_KEY = "admin_auth";
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isSessionValid(): boolean {
  const ts = sessionStorage.getItem(SESSION_KEY);
  if (!ts) return false;
  return Date.now() - parseInt(ts, 10) < SESSION_DURATION_MS;
}

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  farm_name: string | null;
  is_admin: boolean | null;
  created_at: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { startImpersonation } = useImpersonation();

  // Auth gate state
  const [authenticated, setAuthenticated] = useState(isSessionValid());
  const [password, setPassword] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Data state
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [totalAnimais, setTotalAnimais] = useState(0);
  const [totalTalhoes, setTotalTalhoes] = useState(0);
  const [animaisByUser, setAnimaisByUser] = useState<Record<string, number>>({});
  const [talhoesByUser, setTalhoesByUser] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [confirmTarget, setConfirmTarget] = useState<ProfileRow | null>(null);

  // Lockout timer
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      if (Date.now() >= lockedUntil) {
        setLockedUntil(null);
        setAttempts(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  useEffect(() => {
    if (authenticated) loadData();
  }, [authenticated]);

  async function handlePasswordSubmit() {
    if (lockedUntil && Date.now() < lockedUntil) return;
    if (!password.trim()) return;

    setVerifying(true);
    const inputHash = await hashPassword(password);
    setVerifying(false);

    if (inputHash === ADMIN_PASSWORD_HASH) {
      sessionStorage.setItem(SESSION_KEY, Date.now().toString());
      setAuthenticated(true);
      setPassword("");
      setAttempts(0);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPassword("");
      if (newAttempts >= 3) {
        setLockedUntil(Date.now() + LOCKOUT_DURATION_MS);
        toast({ title: "Muitas tentativas", description: "Tente novamente em 30 segundos.", variant: "destructive" });
      } else {
        toast({ title: "Senha incorreta", description: "Tente novamente.", variant: "destructive" });
      }
    }
  }

  async function loadData() {
    setLoading(true);
    const [profRes, aniRes, talRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, email, farm_name, is_admin, created_at"),
      supabase.from("animais").select("user_id"),
      supabase.from("talhoes").select("user_id"),
    ]);

    if (profRes.data) setProfiles(profRes.data as ProfileRow[]);

    if (aniRes.data) {
      setTotalAnimais(aniRes.data.length);
      const map: Record<string, number> = {};
      aniRes.data.forEach((a: any) => { map[a.user_id] = (map[a.user_id] || 0) + 1; });
      setAnimaisByUser(map);
    }

    if (talRes.data) {
      setTotalTalhoes(talRes.data.length);
      const map: Record<string, number> = {};
      talRes.data.forEach((t: any) => { map[t.user_id] = (map[t.user_id] || 0) + 1; });
      setTalhoesByUser(map);
    }

    setLoading(false);
  }

  async function toggleAdmin(profile: ProfileRow, makeAdmin: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: makeAdmin } as any)
      .eq("user_id", profile.user_id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: makeAdmin ? "Admin adicionado" : "Admin removido",
        description: `${profile.email || profile.display_name} ${makeAdmin ? "agora é administrador." : "não é mais administrador."}`,
      });
      loadData();
    }
  }

  function handleImpersonate(profile: ProfileRow) {
    localStorage.setItem("admin_original_id", user?.id || "");
    startImpersonation(profile.user_id, profile.email || profile.display_name || "Usuário");
    navigate("/hub");
  }

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const lockSeconds = isLocked ? Math.ceil((lockedUntil! - Date.now()) / 1000) : 0;

  // Password gate modal
  if (!authenticated) {
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" style={{ color: "#DC2626" }} />
              Acesso Restrito
            </DialogTitle>
            <DialogDescription>
              Digite a senha de administrador para continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                className="pl-10"
                placeholder="Senha de administrador"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                disabled={isLocked || verifying}
                autoFocus
              />
            </div>
            {isLocked && (
              <p className="text-sm text-destructive font-medium">
                Aguarde {lockSeconds}s para tentar novamente.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => navigate("/hub")}>
              Voltar
            </Button>
            <Button
              onClick={handlePasswordSubmit}
              disabled={isLocked || verifying || !password.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {verifying ? "Verificando..." : "Entrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const kpis = [
    { label: "Total de Usuários", value: profiles.length, icon: Users, color: "#3C50E0" },
    { label: "Usuários Ativos", value: profiles.length, icon: Users, color: "#10B981" },
    { label: "Total de Animais", value: totalAnimais, icon: Beef, color: "#F59E0B" },
    { label: "Total de Talhões", value: totalTalhoes, icon: Sprout, color: "#16A34A" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/hub")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Hub
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" style={{ color: "#DC2626" }} />
            <h1 className="text-lg font-bold text-foreground">Painel Administrador</h1>
          </div>
        </div>
        <Badge variant="destructive" className="text-xs">Admin</Badge>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPIs */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4">Estatísticas Gerais</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-background border border-border rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: kpi.color + "1A" }}
                  >
                    <kpi.icon className="h-5 w-5" style={{ color: kpi.color }} />
                  </div>
                  <span className="text-sm text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* User list */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4">Lista de Usuários</h2>
          <div className="bg-background border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fazenda</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cadastro</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Animais</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Talhões</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Admin</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.user_id} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-foreground">{p.email || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.farm_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-center">{animaisByUser[p.user_id] || 0}</td>
                      <td className="px-4 py-3 text-center">{talhoesByUser[p.user_id] || 0}</td>
                      <td className="px-4 py-3 text-center">
                        {p.is_admin ? (
                          <Badge variant="destructive" className="text-[10px]">Admin</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Não</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.user_id !== user?.id && (
                            <button
                              onClick={() => setConfirmTarget(p)}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
                            >
                              <LogIn className="h-3.5 w-3.5" />
                              Entrar como
                            </button>
                          )}
                          {!p.is_admin && (
                            <button
                              onClick={() => toggleAdmin(p, true)}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-emerald-600"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Tornar Admin
                            </button>
                          )}
                          {p.is_admin && p.user_id !== user?.id && (
                            <button
                              onClick={() => toggleAdmin(p, false)}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors text-red-600"
                            >
                              <ShieldOff className="h-3.5 w-3.5" />
                              Remover Admin
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Impersonation confirmation dialog */}
      <Dialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrar como outro usuário</DialogTitle>
            <DialogDescription>
              Você vai visualizar o sistema como <strong>{confirmTarget?.email || confirmTarget?.display_name}</strong>.
              Seus dados não serão alterados. O modo é somente leitura.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmTarget) handleImpersonate(confirmTarget);
                setConfirmTarget(null);
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
