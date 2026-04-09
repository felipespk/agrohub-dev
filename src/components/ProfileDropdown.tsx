import { useNavigate } from 'react-router-dom'
import { User, KeyRound, Settings, LogOut } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import { getFirstName } from '@/lib/utils'

interface ProfileDropdownProps {
  settingsPath?: string
}

export function ProfileDropdown({ settingsPath }: ProfileDropdownProps) {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const initials = profile?.display_name
    ? profile.display_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? '?').toUpperCase()

  const name = profile?.display_name
    ? getFirstName(profile.display_name)
    : user?.email?.split('@')[0] ?? ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* design.md: header avatar 40px, hover tinted bg */}
        <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--surface-raised)] transition-colors duration-150 outline-none -mr-2">
          <Avatar className="w-7 h-7">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-t2 hidden sm:block leading-none">{name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="normal-case text-xs text-t3 font-normal truncate px-3 py-2">
          {user?.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/conta')}>
          <User className="h-4 w-4" />
          Minha Conta
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/conta/senha')}>
          <KeyRound className="h-4 w-4" />
          Alterar Senha
        </DropdownMenuItem>
        {settingsPath && (
          <DropdownMenuItem onClick={() => navigate(settingsPath)}>
            <Settings className="h-4 w-4" />
            Configurações
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={signOut}
          className="text-[var(--danger)] focus:text-[var(--danger)] focus:bg-[var(--danger-bg)]"
        >
          <LogOut className="h-4 w-4 text-[var(--danger)]" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
