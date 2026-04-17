import { cn } from '../../lib/cn'

type PageHeaderProps = {
  title: string
  right?: React.ReactNode
  className?: string
}

export default function PageHeader({ title, right, className }: PageHeaderProps) {
  return (
    <div className={cn('bg-white border-b border-[var(--color-card-border)] px-4 md:px-8 py-4 md:py-5 sticky top-0 z-10', className)}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--color-apple-text)] tracking-tight">{title}</h1>
        {right}
      </div>
    </div>
  )
}
