import { useNavigate } from 'react-router-dom'
import { Construction, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PlaceholderProps {
  title: string
  description?: string
  cta?: { label: string; to: string }
}

export function Placeholder({ title, description, cta }: PlaceholderProps) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Floating icon */}
      <div className="w-16 h-16 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center mb-5 glass-card animate-float">
        <Construction size={24} className="text-t4" />
      </div>

      <h2 className="t-heading-sm text-t1">{title}</h2>
      {description && (
        <p className="text-sm text-t3 mt-1.5 max-w-xs leading-relaxed">{description}</p>
      )}

      {/* Status pill */}
      <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 mt-5">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)] animate-status-pulse" />
        <span className="t-micro text-t3 uppercase tracking-wider">Em desenvolvimento</span>
      </div>

      {cta && (
        <Button
          className="mt-6 gap-2"
          onClick={() => navigate(cta.to)}
        >
          <Plus size={14} />
          {cta.label}
        </Button>
      )}
    </div>
  )
}
