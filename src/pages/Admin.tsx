import { useEffect, useState, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { ShieldCheck, Users, Search, Eye, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'

interface UserProfile {
  user_id: string
  email: string
  display_name: string | null
  farm_name: string | null
  is_admin: boolean
  created_at: string
}

function AdminSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-64" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export function Admin() {
  const { profile, loading: authLoading } = useAuth()
  const { startImpersonating } = useImpersonation()

  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [search, setSearch] = useState('')

  if (authLoading) return <AdminSkeleton />
  if (!profile?.is_admin) return <Navigate to="/hub" replace />

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, display_name, farm_name, is_admin, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        toast.error('Erro ao carregar usuários', { description: error.message })
        return
      }
      setUsers((data ?? []) as UserProfile[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const filtered = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      u.email?.toLowerCase().includes(q) ||
      u.display_name?.toLowerCase().includes(q) ||
      u.farm_name?.toLowerCase().includes(q)
    )
  })

  function handleImpersonate(userId: string, email: string) {
    startImpersonating(userId)
    toast.success('Impersonando', { description: `Você está vendo como ${email}` })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <ShieldCheck size={18} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-t1">Painel Admin</h1>
            <p className="text-sm text-t3">{users.length} usuário(s) cadastrado(s)</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadUsers} className="gap-1.5">
          <Loader2 size={13} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t3" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por e-mail, nome ou fazenda..."
          className="pl-8 h-9 text-sm"
        />
      </div>

      <div className="rounded-xl glass-card overflow-hidden">
        {loading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum usuário encontrado" compact />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['E-mail', 'Nome', 'Fazenda', 'Admin', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-t3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr
                  key={u.user_id}
                  className="border-b border-[var(--border)] hover:bg-[var(--surface-raised)] animate-fade-up"
                  style={{ animationDelay: `${i * 20}ms` }}
                >
                  <td className="px-4 py-3 font-medium text-t1">{u.email}</td>
                  <td className="px-4 py-3 text-t2">{u.display_name ?? '—'}</td>
                  <td className="px-4 py-3 text-t2">{u.farm_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {u.is_admin ? (
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Admin</Badge>
                    ) : (
                      <span className="text-t4 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.user_id !== profile.user_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleImpersonate(u.user_id, u.email)}
                        className="gap-1 text-xs text-t3 hover:text-t1 h-7"
                      >
                        <Eye size={12} />
                        Ver como
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
