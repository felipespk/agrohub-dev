import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { GadoSidebar } from './GadoSidebar'
import { ProfileDropdown } from '@/components/ProfileDropdown'
import { PageTransition } from '@/components/PageTransition'
import { Beef, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useImpersonation } from '@/contexts/ImpersonationContext'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { reclassificarAnimais } from '@/lib/reclassificar-animais'

export function GadoLayout() {
  const navigate = useNavigate()
  const { session, profile } = useAuth()
  const farmName = profile?.farm_name_gado || profile?.farm_name
  const { getEffectiveUserId } = useImpersonation()
  useEffect(() => {
    const userId = getEffectiveUserId()
    if (!userId) return

    async function tryReclassificar() {
      const { data: profile } = await supabase
        .from('profiles')
        .select('reclassificacao_automatica, idade_bezerro_meses, idade_jovem_meses')
        .eq('user_id', userId)
        .single()

      if (!profile?.reclassificacao_automatica) return

      const result = await reclassificarAnimais(userId!, {
        idadeBezerroMeses: profile.idade_bezerro_meses ?? 8,
        idadeJovemMeses: profile.idade_jovem_meses ?? 24,
        habilitado: true,
      })

      if (result.total > 0) {
        toast.success(`${result.total} animal(is) reclassificado(s)`, { description: result.detalhes.slice(0, 3).join(', ') + (result.detalhes.length > 3 ? ` e mais ${result.detalhes.length - 3}...` : '') })
      }
    }

    tryReclassificar()
  }, [session?.user?.id])

  return (
    <div className="flex flex-col min-h-screen">
      <header className="h-14 flex items-center justify-between px-5 glass-header sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate('/hub')} className="text-t3 hover:text-t1 transition-colors mr-1">
            <ChevronLeft size={18} />
          </button>
          <div className="w-6 h-6 rounded-md bg-[var(--primary-bg)] flex items-center justify-center">
            <Beef size={13} className="text-[var(--primary)]" strokeWidth={2} />
          </div>
          <span className="text-md font-semibold text-t1 tracking-tight">Pecuária</span>
          {farmName && (
            <>
              <span className="text-t3 font-normal mx-1">·</span>
              <span className="text-sm text-t3 font-normal truncate max-w-[200px]">{farmName}</span>
            </>
          )}
        </div>
        <ProfileDropdown settingsPath="/gado/configuracoes" />
      </header>

      <GadoSidebar />

      <div className="flex-1 p-6 max-w-content mx-auto w-full">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>
    </div>
  )
}
