import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScoreBadge, ScoreBar, StarRating } from '@/components/scores/score-badge'
import { getStatusConfig, BOARD_LABELS } from '@/lib/types'
import { formatDate, formatRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  MapPin, Edit, Star, MessageSquare, TrendingUp,
  ExternalLink, Clock, CheckCircle2, XCircle, AlertCircle,
  Waves, Utensils, Bed, Zap, Sparkles, BarChart3, Globe,
  Instagram, Facebook, Video, Image as ImageIcon
} from 'lucide-react'
import Link from 'next/link'

const SCORE_LABELS: Record<string, string> = {
  location_score: 'Emplacement',
  beach_score: 'Plage',
  food_score: 'Restauration',
  rooms_score: 'Chambres',
  animation_score: 'Animation',
  cleanliness_score: 'Propreté',
  value_score: 'Rapport Q/P',
  commercial_score: 'Intérêt commercial',
  reliability_score: 'Fiabilité globale',
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
      prices:hotel_price_snapshots(*),
      media:hotel_media(*),
      sources:sources(*),
      profile_matches:hotel_profile_matches(*, profile:client_profiles(*))
    `)
    .eq('id', params.id)
    .eq('is_deleted', false)
    .single()

  if (!hotel) notFound()

  const h = hotel as any
  const statusConfig = getStatusConfig(h.status)
  const scores = h.scores?.[0] || null
  const reviews = h.reviews || []
  const prices = h.prices || []
  const images = (h.media || []).filter((m: any) => m.type === 'image' || m.type === 'capture')

  const scoreEntries = scores
    ? Object.entries(SCORE_LABELS).map(([key, label]) => ({
        key, label, value: scores[key] || 0,
      }))
    : []

  const hasSocial = h.tiktok_url || h.instagram_url || h.facebook_url

  return (
    <div>
      <Header
        title={h.name}
        description={`${h.city?.name}${h.zone?.name ? ` · ${h.zone.name}` : ''}`}
        actions={
          <Link href={`/hotels/${h.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />Modifier
            </Button>
          </Link>
        }
      />

      <div className="page-container space-y-6">
        {/* Image gallery */}
        {images.length > 0 && (
          <div className={cn(
            'grid gap-2 rounded-2xl overflow-hidden',
            images.length === 1 ? 'grid-cols-1 h-64 sm:h-80' :
            images.length === 2 ? 'grid-cols-2 h-64' :
            'grid-cols-2 sm:grid-cols-3 h-64'
          )}>
            {images.slice(0, 3).map((img: any, i: number) => (
              <div key={img.id} className={cn('relative overflow-hidden bg-muted', i === 0 && images.length > 2 && 'row-span-2 sm:row-span-1')}>
                <img src={img.url} alt={img.caption || h.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
        )}

        {/* Hero card */}
        <div className="rounded-xl border bg-white p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={cn('inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border', statusConfig.class)}>
                  {statusConfig.label}
                </span>
                <StarRating stars={parseInt(h.category) || 0} />
                {h.ambiance && (
                  <span className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground capitalize">{h.ambiance}</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>{h.city?.name}</span>
                {h.zone?.name && <><span>·</span><span>{h.zone.name}</span></>}
                {h.address && <><span>·</span><span className="truncate">{h.address}</span></>}
              </div>

              {h.commercial_summary && (
                <p className="text-sm leading-relaxed text-muted-foreground">{h.commercial_summary}</p>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
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

              {/* Social links */}
              {hasSocial && (
                <div className="flex gap-3 mt-3">
                  {h.tiktok_url && (
                    <a href={h.tiktok_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Video className="w-3.5 h-3.5" />TikTok
                    </a>
                  )}
                  {h.instagram_url && (
                    <a href={h.instagram_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-pink-600 transition-colors">
                      <Instagram className="w-3.5 h-3.5" />Instagram
                    </a>
                  )}
                  {h.facebook_url && (
                    <a href={h.facebook_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-blue-600 transition-colors">
                      <Facebook className="w-3.5 h-3.5" />Facebook
                    </a>
                  )}
                  {h.website_url && (
                    <a href={h.website_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <Globe className="w-3.5 h-3.5" />Site web
                    </a>
                  )}
                </div>
              )}
            </div>

            {h.global_score && (
              <div className="flex flex-row sm:flex-col items-center gap-3 sm:gap-1 bg-muted/30 rounded-xl p-4 sm:p-5">
                <p className="text-xs text-muted-foreground">Note globale</p>
                <p className="text-4xl font-bold text-primary">{h.global_score}</p>
                <p className="text-xs text-muted-foreground">/10</p>
              </div>
            )}
          </div>
        </div>

        {/* Google Maps */}
        {h.latitude && h.longitude && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Localisation</span>
                <a href={h.google_maps_url || `https://www.google.com/maps?q=${h.latitude},${h.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  Ouvrir dans Google Maps <ExternalLink className="w-3 h-3" />
                </a>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden rounded-b-xl">
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${h.latitude},${h.longitude}&zoom=17&size=800x300&maptype=satellite&markers=color:red%7C${h.latitude},${h.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                alt={`Localisation de ${h.name}`}
                className="w-full h-48 object-cover"
              />
            </CardContent>
          </Card>
        )}

        {/* AeliaNote */}
        {h.aelia_note && (
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-800 flex items-center gap-2">
                ✍️ AeliaNote — Avis personnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-900 whitespace-pre-line leading-relaxed">{h.aelia_note}</p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="overview">Fiche</TabsTrigger>
            <TabsTrigger value="scores">Notes</TabsTrigger>
            <TabsTrigger value="reviews">Avis ({reviews.length})</TabsTrigger>
            <TabsTrigger value="prices">Prix ({prices.length})</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {h.strengths?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-emerald-700 flex items-center gap-2">
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
              {h.weaknesses?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-red-600 flex items-center gap-2">
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

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Qualité par aspect</CardTitle></CardHeader>
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

            {h.profile_matches?.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Profils clients adaptés</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {h.profile_matches.map((pm: any) => (
                      <span key={pm.profile_id}
                        className={cn('inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border font-medium', pm.profile?.color || 'bg-muted text-muted-foreground border-muted')}>
                        {pm.profile?.icon} {pm.profile?.label}
                        {pm.match_level === 'parfait' && <span className="text-[10px] opacity-70">★</span>}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {h.internal_notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />Notes internes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{h.internal_notes}</p>
                </CardContent>
              </Card>
            )}

            {h.sources?.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Sources</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {h.sources.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize">{s.type}</span>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1">
                          {s.name}<ExternalLink className="w-3 h-3" />
                        </a>
                      ) : <span className="text-sm">{s.name}</span>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
              <Clock className="w-3.5 h-3.5" />
              {h.last_reviewed_at ? <>Dernière révision {formatRelative(h.last_reviewed_at)}</> : <>Créé {formatRelative(h.created_at)}</>}
            </div>
          </TabsContent>

          {/* Scores */}
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
                    <Link href={`/hotels/${h.id}/edit`} className="text-primary hover:underline">Ajouter des notes →</Link>
                  </p>
                ) : scoreEntries.map(({ key, label, value }) => (
                  <ScoreBar key={key} label={label} value={value} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews */}
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
            ) : reviews.map((r: any) => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{r.author?.full_name || 'Agent'}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(r.review_date)}</span>
                  </div>
                  {r.source && <p className="text-xs text-muted-foreground">Source : {r.source}</p>}
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                  {r.positive_trends && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 mb-1">Tendances positives</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{r.positive_trends}</p>
                    </div>
                  )}
                  {r.negative_trends && (
                    <div>
                      <p className="text-xs font-semibold text-red-600 mb-1">Tendances négatives</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{r.negative_trends}</p>
                    </div>
                  )}
                  {r.short_conclusion && (
                    <div className="sm:col-span-2 pt-3 border-t">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Conclusion</p>
                      <p className="text-sm font-medium">{r.short_conclusion}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Prices */}
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
                          {['Date', 'Saison', 'Type', 'Régime', 'Pers.', 'Prix', 'Source'].map(h => (
                            <th key={h} className="text-left p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {prices.map((p: any) => (
                          <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(p.observation_date)}</td>
                            <td className="p-3 text-xs capitalize">{p.season || '—'}</td>
                            <td className="p-3 text-xs">{p.room_type || '—'}</td>
                            <td className="p-3 text-xs">{BOARD_LABELS[p.board_type as keyof typeof BOARD_LABELS] || '—'}</td>
                            <td className="p-3 text-center text-xs">{p.adults + (p.children || 0)}</td>
                            <td className="p-3 font-semibold whitespace-nowrap">{p.price} {p.currency}</td>
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
