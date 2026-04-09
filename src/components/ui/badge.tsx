import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Light theme badges — colored backgrounds, dark text
const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium leading-none transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--primary-bg)] text-[#16a34a] border border-[var(--primary)]/30',
        secondary:
          'bg-[var(--surface-raised)] text-t2 border border-[var(--border)]',
        destructive:
          'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)]',
        warning:
          'bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning-border)]',
        info:
          'bg-[var(--info-bg)] text-[var(--info)] border border-[var(--info-border)]',
        success:
          'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]',
        outline:
          'border border-[var(--border-strong)] text-t2 bg-transparent',
        // Animal categories — light
        vaca:    'bg-pink-50   text-pink-700   border border-pink-200',
        touro:   'bg-blue-50   text-blue-700   border border-blue-200',
        bezerro: 'bg-green-50  text-green-700  border border-green-200',
        bezerra: 'bg-purple-50 text-purple-700 border border-purple-200',
        novilha: 'bg-violet-50 text-violet-700 border border-violet-200',
        garrote: 'bg-orange-50 text-orange-700 border border-orange-200',
        boi:     'bg-cyan-50   text-cyan-700   border border-cyan-200',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
