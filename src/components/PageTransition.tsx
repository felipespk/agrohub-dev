import { useLocation } from 'react-router-dom'

/**
 * Wraps page content with a fade-up animation.
 * Key on pathname so re-mounts (re-animates) on every route change.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className="animate-fade-up">
      {children}
    </div>
  )
}
