import { cn } from '../../lib/cn'

type PageContainerProps = React.HTMLAttributes<HTMLDivElement>

export default function PageContainer({ className, ...props }: PageContainerProps) {
  return <div className={cn('px-4 md:px-8 py-6 md:py-8 max-w-3xl mx-auto', className)} {...props} />
}
