import { cn } from '../../lib/cn'

type Variant = 'default' | 'edit' | 'delete'

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
}

const styles: Record<Variant, string> = {
  default: 'text-[var(--color-caption)] hover:text-[var(--color-apple-text)] hover:bg-[var(--color-divider)]',
  edit: 'text-[var(--color-caption)] hover:text-[var(--color-apple-blue)] hover:bg-[var(--color-apple-blue-light)]',
  delete: 'text-[var(--color-caption)] hover:text-[var(--color-apple-red)] hover:bg-[var(--color-apple-danger-soft)]',
}

export default function IconButton({ className, variant = 'default', type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn('w-7 h-7 flex items-center justify-center rounded-full transition-colors', styles[variant], className)}
      {...props}
    />
  )
}
