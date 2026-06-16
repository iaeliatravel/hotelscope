import { cn } from '@/lib/utils'
import { getScoreBadge } from '@/lib/types'

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function ScoreBadge({ score, size = 'md', showLabel = false }: ScoreBadgeProps) {
  const config = getScoreBadge(score)

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-0.5',
    lg: 'text-base px-3 py-1',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-semibold',
        config.class,
        sizeClasses[size]
      )}
    >
      <span>{score.toFixed(1)}</span>
      {showLabel && <span className="opacity-70">{config.label}</span>}
    </span>
  )
}

interface ScoreBarProps {
  label: string
  value: number
  maxValue?: number
}

export function ScoreBar({ label, value, maxValue = 10 }: ScoreBarProps) {
  const pct = Math.round((value / maxValue) * 100)
  const color = value >= 8 ? 'bg-emerald-500' : value >= 6.5 ? 'bg-lime-500' : value >= 5 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium w-8 text-right">{value}</span>
    </div>
  )
}

interface StarRatingProps {
  stars: number
  max?: number
}

export function StarRating({ stars, max = 5 }: StarRatingProps) {
  return (
    <span className="text-amber-400 text-sm tracking-tight">
      {'★'.repeat(Math.min(stars, max))}
      <span className="text-muted-foreground/30">{'★'.repeat(Math.max(0, max - stars))}</span>
    </span>
  )
}
