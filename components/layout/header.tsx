import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function Header({ title, description, actions, className }: HeaderProps) {
  return (
    <header className={cn('sticky top-0 z-40 bg-background/95 backdrop-blur border-b', className)}>
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16 gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-semibold tracking-tight truncate">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground truncate hidden sm:block">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>
    </header>
  )
}
