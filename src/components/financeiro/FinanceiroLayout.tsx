import { Outlet } from 'react-router-dom'
import { FinanceiroSidebar } from './FinanceiroSidebar'
import { ProfileDropdown } from '@/components/ProfileDropdown'
import { PageTransition } from '@/components/PageTransition'
import { FinanceiroProvider } from '@/contexts/FinanceiroContext'
import { DollarSign } from 'lucide-react'

export function FinanceiroLayout() {
  return (
    <FinanceiroProvider>
      <div className="flex flex-col min-h-screen ml-16">
        <header className="h-14 flex items-center justify-between px-5 border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-emerald-500/12 flex items-center justify-center">
              <DollarSign size={13} className="text-emerald-400" strokeWidth={2} />
            </div>
            <span className="text-md font-semibold text-t1 tracking-tight">Financeiro</span>
          </div>
          <ProfileDropdown settingsPath="/financeiro/configuracoes" />
        </header>
        <FinanceiroSidebar />
        <div className="flex-1 p-6 max-w-content mx-auto w-full">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </div>
    </FinanceiroProvider>
  )
}
