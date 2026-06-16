import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScoreBadge, ScoreBar, StarRating } from '@/components/scores/score-badge'
import { getStatusConfig, BOARD_LABELS, PROFILE_CONFIG, type Hotel, type HotelScore } from '@/lib/types'
import { formatDate, formatRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  MapPin, Edit, Copy, Star, MessageSquare, TrendingUp,
  ExternalLink, Clock, CheckCircle2, XCircle, AlertCircle,
  Waves, Utensils, Bed, Zap, Sparkles, BarChart3
} from 'lucide-react'
import Link from 'next/link'

const SCORE_LABELS: Record<string, { label: string; icon: any }> = {
  location_score: { label: 'Emplacement', icon: MapPin },
  beach_score: { label: 'Plage', icon: Waves },
  food_score: { label: 'Restauration', icon: Utensils },
  rooms_score: { label: 'Chambres', icon: Bed },
  animation_score: { label: 'Animation', icon: Zap },
  cleanliness_score: { label: 'Propreté', icon: Sparkles },
  value_score: { label: 'Rapport Q/P', icon: BarChart3 },
  commercial_score: { label: 'Intérêt commercial', icon: Star },
  reliability_score: { label: 'Fiabilité globale', icon: CheckCircle2 },
}

export default async function HotelDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: hotel } = await supabase
    .from('hotels')
    .select(`
      *,
      city:cities(*),
      zone:zones(*),
      scores:hotel_scores(*),
      reviews:hotel_reviews(*, author:profiles(full_name)),
      prices:hotel_price_snapshots(*, author:profiles(full_name)),
      media:hotel_media(*),
      sources:sources(*),
      profiles:hotel_profile_matches(*, profile:client_profiles(*))
    `)
    .eq('id', params.id)
    .eq('is_deleted', false)
    .single()

  if (!hotel) notFound()

  const h = hotel as any
  const statusConfig = getStatusConfig(h.status)
  const scores: HotelScore | null = h.scores?.[0] || null
  const reviews = h.reviews || []
  const prices = h.prices || []

  const scoreEntries = scores
    ? Object.entries(SCORE_LABELS).map(([key, meta]) => ({
        key,
        label: meta.label,
        value: (scores as any)[key] || 0,
      }))
    : []

  return (
    <div>
      <Header
        title={h.name}
        description={`${h.city?.name}${h.zone?.name ? ` · ${h.zone.name}` : ''}`}
        actions={
          <div className="flex gap-2">
            <Link href={`/hotels/${h.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />Modifier
              </Button>
            </Link>
          </div>
        }
      />

      <div className="page-container space-y-6">
        {/* Hero card */}
        <div className="rounded-xl border bg-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={cn('inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border', statusConfig.class)}>
                  {statusConfig.label}
                </span>
                <StarRating stars={parseInt(h.category) || 0} />
                {h.ambiance && (
                  <span className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground capitalize">{h.ambiance}</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <MapPin className="w-4 h-4" />
                <span>{h.city?.name}</span>
                {h.zone?.name && <><span>·</span><span>{h.zone.name}</span></>}
                {h.address && <><span>·</span><span>{h.address}</span></>}
              </div>

              {h.commercial_summary && (
                <p className="text-sm leading-relaxed text-muted-foreground">{h.commercial_summary}</p>
              )}

              {/* Info pills */}
              <div className="flex flex-wrap gap-2 mt-4">
                {h.beach_distance && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md">
                    <Waves className="w-3 h-3" /> Plage {h.beach_distance}
                  </span>
                )}
                {(h.board_types || []).map((bt: string) => (
                  <span key={bt} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-md border">
                    {BOARD_LABELS[bt as keyof typeof BOARD_LABELS] || bt}
                  </span>
                ))}
              </div>
            </div>

            {/* Score */}
            {h.global_score && (
              <div className="flex flex-col items-center bg-muted/30 rounded-xl p-5 min-w-[110px]">
                <p className="text-xs text-muted-foreground mb-1">Note globale</p>
                <p className="text-4xl font-bold text-primary">{h.global_score}</p>
                <p className="text-xs text-muted-foreground mt-0.5">/ 10</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="overview">Fiche</TabsTrigger>
            <TabsTrigger value="scores">Notes</TabsTrigger>
            <TabsTrigger value="reviews">Avis</TabsTrigger>
            <TabsTrigger value="prices">Prix</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Strengths */}
              {h.strengths?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />Points forts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {h.strengths.map((s: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        <span className="text-sm">{s}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Weaknesses */}
              {h.weaknesses?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                      <XCircle className="w-4 h-4" />Points faibles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {h.weaknesses.map((w: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">✕</span>
                        <span className="text-sm">{w}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quality details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Qualité par aspect</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                {[
                  { label: 'Chambres', value: h.room_quality },
                  { label: 'Nourriture', value: h.food_quality },
                  { label: 'Piscine', value: h.pool_quality },
                  { label: 'Plage', value: h.beach_quality },
                  { label: 'Animation', value: h.animation_level },
                  { label: 'Rapport Q/P', value: h.value_for_money },
                ].filter(i => i.value).map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                    <p className="text-sm">{item.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Client profiles */}
            {h.profiles?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Profils clients adaptés</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {h.profiles.map((pm: any) => {
                      const profileType = pm.profile?.name
                      const config = PROFILE_CONFIG[profileType as keyof typeof PROFILE_CONFIG]
                      if (!config) return null
                      return (
                        <span key={pm.profile_id} className={cn('inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border font-medium', config.color)}>
                          <span>{config.icon}</span>
                          {config.label}
                          {pm.match_level === 'parfait' && <span className="text-[10px] opacity-70">★</span>}
                        </span>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Internal notes */}
            {h.internal_notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                    <AlertCircle className="w-4 h-4" />Notes internes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{h.internal_notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Sources */}
            {h.sources?.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {h.sources.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground capitalize bg-muted px-1.5 py-0.5 rounded">{s.type}</span>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1">
                          {s.name}<ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-sm">{s.name}</span>
                      )}
                      {s.notes && <span className="text-xs text-muted-foreground">— {s.notes}</span>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <Clock className="w-3.5 h-3.5" />
              {h.last_reviewed_at
                ? <>Dernière révision {formatRelative(h.last_reviewed_at)}</>
                : <>Créé {formatRelative(h.created_at)}</>
              }
            </div>
          </TabsContent>

          {/* Scores tab */}
          <TabsContent value="scores" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Notes détaillées</CardTitle>
                  {scores?.final_score && <ScoreBadge score={scores.final_score} size="lg" showLabel />}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {scoreEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Aucune note saisie.{' '}
                    <Link href={`/hotels/${h.id}/edit`} className="text-primary hover:underline">
                      Ajouter des notes →
                    </Link>
                  </p>
                ) : (
                  scoreEntries.map(({ key, label, value }) => (
                    <ScoreBar key={key} label={label} value={value} />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews tab */}
          <TabsContent value="reviews" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Link href={`/reviews?hotel_id=${h.id}`}>
                <Button size="sm" variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />Ajouter un avis
                </Button>
              </Link>
            </div>
            {reviews.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Aucun avis enregistré.</CardContent></Card>
            ) : (
              reviews.map((r: any) => (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{r.author?.full_name || 'Agent'}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(r.review_date)}</span>
                    </div>
                    {r.source && <p className="text-xs text-muted-foreground">Source : {r.source}</p>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {r.positive_trends && (
                      <div>
                        <p className="text-xs font-medium text-emerald-700 mb-1">Points positifs</p>
                        <p className="text-sm text-muted-foreground">{r.positive_trends}</p>
                      </div>
                    )}
                    {r.negative_trends && (
                      <div>
                        <p className="text-xs font-medium text-red-600 mb-1">Points négatifs</p>
                        <p className="text-sm text-muted-foreground">{r.negative_trends}</p>
                      </div>
                    )}
                    {r.short_conclusion && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Conclusion</p>
                        <p className="text-sm font-medium">{r.short_conclusion}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Prices tab */}
          <TabsContent value="prices" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Link href={`/prices?hotel_id=${h.id}`}>
                <Button size="sm" variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />Ajouter un prix
                </Button>
              </Link>
            </div>
            {prices.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Aucun prix enregistré.</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground">Régime</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground">Pers.</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">Prix</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prices.map((p: any) => (
                          <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="p-3 text-xs text-muted-foreground">{formatDate(p.observation_date)}</td>
                            <td className="p-3">{p.room_type || '—'}</td>
                            <td className="p-3 text-xs">{BOARD_LABELS[p.board_type as keyof typeof BOARD_LABELS] || '—'}</td>
                            <td className="p-3 text-center">{p.adults + (p.children || 0)}</td>
                            <td className="p-3 text-right font-semibold">
                              {p.price} {p.currency}
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">{p.source_platform || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
