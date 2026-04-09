import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { ImpersonationBanner } from './ImpersonationBanner'
import { PageTransition } from './PageTransition'
import { useImpersonation } from '@/contexts/ImpersonationContext'

export function AppLayout() {
  const { isImpersonating } = useImpersonation()

  return (
    <div className="min-h-screen bg-[var(--bg)] text-t1">
      <ImpersonationBanner />
      <AppSidebar />
      <main
        className="ml-16 min-h-screen"
        style={{ paddingTop: isImpersonating ? '40px' : '0' }}
      >
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  )
}
