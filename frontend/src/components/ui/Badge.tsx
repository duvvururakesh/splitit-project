import { cn } from '../../lib/cn'

type Variant = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant
}

const styles: Record<Variant, string> = {
  neutral: 'bg-[var(--color-divider)] text-[var(--color-chip-text)]',
  info: 'bg-[var(--color-apple-blue-light)] text-[var(--color-apple-blue)]',
  success: 'bg-[var(--color-apple-green-bg)] text-[var(--color-apple-success-text)]',
  warning: 'bg-[var(--color-apple-tax-bg)] text-[var(--color-apple-tax-text)]',
  danger: 'bg-[var(--color-apple-danger-bg)] text-[var(--color-apple-red)]',
}

export default function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', styles[variant], className)} {...props} />
  )
}
