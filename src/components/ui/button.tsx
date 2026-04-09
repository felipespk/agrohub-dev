import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold',
    'transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)]',
    'disabled:pointer-events-none disabled:opacity-40',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    // Press feedback on all buttons
    'active:scale-[0.97]',
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary: brand green bg + dark text
        default:
          'bg-[#78FC90] text-[#111110] font-semibold shadow-[0_1px_3px_rgba(120,252,144,0.3)] hover:bg-[#5de870] hover:shadow-[0_4px_12px_rgba(120,252,144,0.35)] hover:-translate-y-px active:bg-[#4dd460] active:shadow-none active:translate-y-0',
        // Outline: white bg + dark border
        outline:
          'border border-[var(--border-strong)] bg-[var(--surface)] text-t1 hover:bg-[var(--surface-raised)] hover:border-[var(--text)]/20',
        // Ghost: no border, tinted bg on hover
        ghost:
          'bg-transparent text-t2 hover:bg-[var(--surface-raised)] hover:text-t1',
        // Destructive
        destructive:
          'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)] hover:border-[var(--danger)]/50 hover:bg-[var(--danger-bg)]',
        // Link
        link:
          'bg-transparent text-[var(--success)] underline-offset-4 hover:underline p-0 h-auto',
        // Secondary: light surface
        secondary:
          'bg-[var(--surface-raised)] text-t1 hover:bg-[var(--surface-overlay)]',
      },
      size: {
        default:   'h-9 px-4 py-2',
        sm:        'h-8 px-3 py-1.5 text-xs rounded-md',
        lg:        'h-11 px-6 py-2.5 text-base rounded-lg',
        icon:      'h-9 w-9 rounded-md',
        'icon-sm': 'h-8 w-8 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
