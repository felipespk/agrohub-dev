import { Outlet } from 'react-router-dom'
import { LavouraSidebar } from './LavouraSidebar'
import { ProfileDropdown } from '@/components/ProfileDropdown'
import { PageTransition } from '@/components/PageTransition'
import { Wheat } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function LavouraLayout() {
  const { profile } = useAuth()
  const farmName = profile?.farm_name_lavoura || profile?.farm_name

  return (
    <div className="flex flex-col min-h-screen ml-16">
      <header className="h-14 flex items-center justify-between px-5 glass-header sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-yellow-500/12 flex items-center justify-center">
            <Wheat size={13} className="text-yellow-400" strokeWidth={2} />
          </div>
          <span className="text-md font-semibold text-t1 tracking-tight">Lavoura</span>
          {farmName && (
            <>
              <span className="text-t3 font-normal mx-1">·</span>
              <span className="text-sm text-t3 font-normal truncate max-w-[200px]">{farmName}</span>
            </>
          )}
        </div>
        <ProfileDropdown settingsPath="/lavoura/configuracoes" />
      </header>
      <LavouraSidebar />
      <div className="flex-1 p-6 max-w-content mx-auto w-full">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>
    </div>
  )
}
