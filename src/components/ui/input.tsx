import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full px-3.5 py-2',
          'rounded-md',
          'border border-[var(--border-strong)] bg-[var(--surface)]',
          'text-sm text-t1 placeholder:text-t3',
          'transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-0 focus-visible:border-[#78FC90] focus-visible:shadow-[0_0_0_3px_rgba(120,252,144,0.20)]',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-raised)]',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
