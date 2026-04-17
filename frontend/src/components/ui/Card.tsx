import { cn } from '../../lib/cn'

type CardProps = React.HTMLAttributes<HTMLDivElement>

export default function Card({ className, ...props }: CardProps) {
  return <div className={cn('bg-white rounded-2xl border border-[var(--color-card-border)]', className)} {...props} />
}
