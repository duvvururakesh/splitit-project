import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full border border-[var(--color-apple-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-apple-text)] bg-[var(--color-apple-sidebar)] focus:outline-none focus:ring-2 focus:ring-[var(--color-apple-blue)] focus:bg-white transition-all placeholder-[var(--color-caption)]',
        className,
      )}
      {...props}
    />
  )
})

export default Input
