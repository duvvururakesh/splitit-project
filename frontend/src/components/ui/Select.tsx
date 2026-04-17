import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full border border-[var(--color-apple-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-apple-text)] bg-[var(--color-apple-sidebar)] focus:outline-none focus:ring-2 focus:ring-[var(--color-apple-blue)] transition-all',
        className,
      )}
      {...props}
    />
  )
})

export default Select
