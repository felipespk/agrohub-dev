import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useImpersonation } from '@/contexts/ImpersonationContext'

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedEmail, stopImpersonation } = useImpersonation()

  if (!isImpersonating) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-10 bg-[var(--danger)] flex items-center justify-between px-5">
      <div className="flex items-center gap-2 text-[#111110] text-sm font-semibold">
        <AlertTriangle size={14} />
        <span>
          Visualizando como: <strong>{impersonatedEmail}</strong>
          <span className="font-normal ml-2 opacity-70">— somente leitura</span>
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-[#111110] hover:bg-black/10 hover:text-[#111110] gap-1.5"
        onClick={stopImpersonation}
      >
        <X size={13} />
        Sair
      </Button>
    </div>
  )
}
