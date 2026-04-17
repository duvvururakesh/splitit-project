import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[var(--color-apple-blue)] text-white hover:bg-[var(--color-apple-blue-hover)] disabled:opacity-40',
  secondary: 'bg-[var(--color-divider)] text-[var(--color-apple-text)] hover:bg-[var(--color-card-border)] disabled:opacity-40',
  ghost: 'bg-transparent text-[var(--color-apple-secondary)] hover:bg-[var(--color-divider)] hover:text-[var(--color-apple-text)] disabled:opacity-40',
  danger: 'bg-[var(--color-apple-red)] text-white hover:bg-[var(--color-apple-red-hover)] disabled:opacity-40',
}

const sizeClasses: Record<Size, string> = {
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-5 py-3 text-sm rounded-2xl font-semibold',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
})

export default Button
