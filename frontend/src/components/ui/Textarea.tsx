import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full border border-[var(--color-apple-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-apple-text)] bg-[var(--color-apple-sidebar)] focus:outline-none focus:ring-2 focus:ring-[var(--color-apple-blue)] focus:bg-white transition-all placeholder-[var(--color-caption)]',
        className,
      )}
      {...props}
    />
  )
})

export default Textarea
