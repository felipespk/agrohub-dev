import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, compact }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${compact ? 'py-8' : 'py-16'} gap-3`}>
      <div className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl bg-[var(--primary-bg)] flex items-center justify-center animate-float`}>
        <Icon size={compact ? 18 : 22} className="text-[var(--primary-dark)]" />
      </div>
      <div className="text-center">
        <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-t2`}>{title}</p>
        {description && <p className="text-xs text-t3 mt-1 max-w-xs">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button size="sm" variant="outline" onClick={onAction} className="mt-1 gap-1.5 text-xs">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
