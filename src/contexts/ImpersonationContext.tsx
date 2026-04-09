import { createContext, useContext, useState, ReactNode } from 'react'
import { useAuth } from './AuthContext'

interface ImpersonationContextValue {
  impersonatedUserId: string | null
  impersonatedEmail: string | null
  isImpersonating: boolean
  startImpersonation: (userId: string, email: string) => void
  stopImpersonation: () => void
  getEffectiveUserId: () => string
}

const ImpersonationContext = createContext<ImpersonationContextValue | undefined>(undefined)

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null)
  const [impersonatedEmail, setImpersonatedEmail] = useState<string | null>(null)

  function startImpersonation(userId: string, email: string) {
    setImpersonatedUserId(userId)
    setImpersonatedEmail(email)
  }

  function stopImpersonation() {
    setImpersonatedUserId(null)
    setImpersonatedEmail(null)
  }

  function getEffectiveUserId(): string {
    return impersonatedUserId ?? user?.id ?? ''
  }

  return (
    <ImpersonationContext.Provider value={{
      impersonatedUserId,
      impersonatedEmail,
      isImpersonating: !!impersonatedUserId,
      startImpersonation,
      stopImpersonation,
      getEffectiveUserId,
    }}>
      {children}
    </ImpersonationContext.Provider>
  )
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext)
  if (!ctx) throw new Error('useImpersonation must be used inside ImpersonationProvider')
  return ctx
}
