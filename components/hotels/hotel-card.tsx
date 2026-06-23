import Link from 'next/link'
import { MapPin, Star, TrendingUp, AlertCircle, Clock } from 'lucide-react'
import { Hotel, getStatusConfig, BOARD_LABELS } from '@/lib/types'
import { ScoreBadge, StarRating } from '@/components/scores/score-badge'
import { formatRelative, truncate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface HotelCardProps {
  hotel: Hotel
}

export function HotelCard({ hotel }: HotelCardProps) {
  const statusConfig = getStatusConfig(hotel.status)
  const isStale = hotel.last_reviewed_at
    ? Date.now() - new Date(hotel.last_reviewed_at).getTime() > 90 * 24 * 60 * 60 * 1000
    : true

  return (
    <Link href={`/hotels/${hotel.id}`}>
      <div className="group bg-white rounded-xl border hover:border-primary/30 hover:shadow-md transition-all p-5 cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', statusConfig.class)}>
                {statusConfig.label}
              </span>
              {isStale && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                  <Clock className="w-3 h-3" />
                  À actualiser
                </span>
              )}
            </div>
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {hotel.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <StarRating stars={parseInt(hotel.category)} />
            </div>
          </div>
          {hotel.global_score && (
            <ScoreBadge score={hotel.global_score} size="lg" />
          )}
        </div>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span>{hotel.city?.name}</span>
          {hotel.zone?.name && (
            <>
              <span className="opacity-40">·</span>
              <span>{hotel.zone.name}</span>
            </>
          )}
          {hotel.beach_distance && (
            <>
              <span className="opacity-40">·</span>
              <span>Plage {hotel.beach_distance}</span>
            </>
          )}
        </div>

        {/* Summary */}
        {hotel.commercial_summary && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            {truncate(hotel.commercial_summary, 110)}
          </p>
        )}

        {/* Footer */}
        <div className="flex flex-wrap gap-1 mb-2">
          {hotel.singles_policy && hotel.singles_policy !== 'non_applique' && (
            <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">
              {{
                'familles_couples': '👨‍👩‍👧 Familles & couples',
                'accepte_celibataires': '✅ Célibataires',
                'celibataires_demande': '📋 Célibataires/demande',
              }[hotel.singles_policy as string] || ''}
            </span>
          )}
          {hotel.burkini_policy && hotel.burkini_policy !== 'non_applique' && (
            <span className={cn('text-xs px-2 py-0.5 rounded', hotel.burkini_policy === 'autorise' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
              {hotel.burkini_policy === 'autorise' ? '✅ Burkini autorisé' : '🚫 Burkini interdit'}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex flex-wrap gap-1">
            {(hotel.board_types || []).slice(0, 2).map(bt => (
              <span key={bt} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                {BOARD_LABELS[bt as keyof typeof BOARD_LABELS] || bt}
              </span>
            ))}
          </div>
          {hotel.last_reviewed_at && (
            <span className="text-xs text-muted-foreground">
              {formatRelative(hotel.last_reviewed_at)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
