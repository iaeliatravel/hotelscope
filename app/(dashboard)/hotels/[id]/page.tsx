import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScoreBadge, ScoreBar, StarRating } from '@/components/scores/score-badge'
import { getStatusConfig, BOARD_LABELS } from '@/lib/types'
import { formatRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  MapPin, Edit, Clock, AlertCircle,
  Waves, Globe, Instagram, Facebook, Video, Map, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { HotelGallery } from '@/components/hotels/hotel-gallery'
import { HotelPdfButton } from '@/components/hotels/hotel-pdf'
import { StrengthsEditor } from '@/components/hotels/strengths-editor'
import { ProfileMatcher } from '@/components/hotels/profile-matcher'
import { PriceManager } from '@/components/hotels/price-manager'

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
  const allMedia = h.media || []

  const scoreEntries = scores
    ? Object.entries(SCORE_LABELS).map(([key, label]) => ({ key, label, value: scores[key] || 0 }))
    : []

  const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  return (
    <div>
      <Header
        title={h.name}
        description={`${h.city?.name}${h.zone?.name ? ` · ${h.zone.name}` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <HotelPdfButton hotelId={h.id} hotelName={h.name} />
            <Link href={`/hotels/${h.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Modifier</span>
              </Button>
            </Link>
          </div>
        }
      />

      <div className="page-container space-y-5">
        {/* Gallery — full, with lightbox + delete */}
        <HotelGallery hotelId={h.id} initialMedia={allMedia} />

        {/* Hero */}
        <div className="rounded-xl border bg-white p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={cn('inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border', statusConfig.class)}>
                  {statusConfig.label}
                </span>
                <StarRating stars={parseInt(h.category) || 0} />
                {h.ambiance && (
                  <span className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground capitalize">{h.ambiance}</span>
                )}
              </div>

              <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3 flex-wrap">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{h.city?.name}</span>
                {h.zone?.name && <><span>·</span><span>{h.zone.name}</span></>}
                {h.address && <><span>·</span><span className="break-words">{h.address}</span></>}
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

              {/* Links */}
              {(h.website_url || h.tiktok_url || h.instagram_url || h.facebook_url || h.google_maps_url) && (
                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t">
                  {h.website_url && (
                    <a href={h.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
                      <Globe className="w-3.5 h-3.5" />Site officiel
                    </a>
                  )}
                  {h.tiktok_url && (
                    <a href={h.tiktok_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-black">
                      <Video className="w-3.5 h-3.5" />TikTok
                    </a>
                  )}
                  {h.instagram_url && (
                    <a href={h.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-pink-600">
                      <Instagram className="w-3.5 h-3.5" />Instagram
                    </a>
                  )}
                  {h.facebook_url && (
                    <a href={h.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-blue-600">
                      <Facebook className="w-3.5 h-3.5" />Facebook
                    </a>
                  )}
                  {h.google_maps_url && (
                    <a href={h.google_maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500">
                      <Map className="w-3.5 h-3.5" />Maps
                    </a>
                  )}
                </div>
              )}
            </div>

            {h.global_score && (
              <div className="flex sm:flex-col items-center gap-2 sm:gap-1 bg-muted/30 rounded-xl px-5 py-3 flex-shrink-0">
                <p className="text-xs text-muted-foreground">Note</p>
                <p className="text-4xl font-bold text-primary">{h.global_score}</p>
                <p className="text-xs text-muted-foreground">/10</p>
              </div>
            )}
          </div>
        </div>

        {/* Satellite map */}
        {h.latitude && h.longitude && GOOGLE_KEY && (
          <Card>
            <CardHeader className="pb-0 pt-4 px-4">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><Map className="w-4 h-4 text-primary" />Vue satellite</span>
                <a href={h.google_maps_url || `https://www.google.com/maps?q=${h.latitude},${h.longitude}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  Agrandir <ExternalLink className="w-3 h-3" />
                </a>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 mt-3 overflow-hidden rounded-b-xl">
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${h.latitude},${h.longitude}&zoom=17&size=800x280&maptype=satellite&markers=color:red%7Clabel:H%7C${h.latitude},${h.longitude}&key=${GOOGLE_KEY}`}
                alt={`Localisation de ${h.name}`}
                className="w-full h-48 sm:h-56 object-cover"
              />
            </CardContent>
          </Card>
        )}

        {/* AeliaNote */}
        {h.aelia_note && (
          <Card className="border-amber-200 bg-amber-50/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-800">✍️ AeliaNote</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-900 whitespace-pre-line leading-relaxed">{h.aelia_note}</p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Fiche</TabsTrigger>
            <TabsTrigger value="scores" className="text-xs sm:text-sm">Notes</TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs sm:text-sm">Avis ({reviews.length})</TabsTrigger>
            <TabsTrigger value="prices" className="text-xs sm:text-sm">Prix</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4 mt-4">

            {/* Strengths & Weaknesses — editable inline */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-emerald-700">✓ Points forts</CardTitle>
                </CardHeader>
                <CardContent>
                  <StrengthsEditor hotelId={h.id} type="strengths" initialItems={h.strengths || []} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-600">✕ Points faibles</CardTitle>
                </CardHeader>
                <CardContent>
                  <StrengthsEditor hotelId={h.id} type="weaknesses" initialItems={h.weaknesses || []} />
                </CardContent>
              </Card>
            </div>

            {/* Quality aspects */}
            {(h.room_quality || h.food_quality || h.pool_quality || h.beach_quality || h.animation_level || h.value_for_money) && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Qualité par aspect</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                      <p className="text-sm font-medium">{item.value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Profile matcher — dropdown */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Profils clients adaptés</CardTitle></CardHeader>
              <CardContent>
                <ProfileMatcher hotelId={h.id} initialMatches={h.profile_matches || []} />
              </CardContent>
            </Card>

            {/* Internal notes */}
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

            {/* Sources */}
            {h.sources?.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Sources</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {h.sources.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-2 flex-wrap">
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

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Aucune note saisie.</p>
                    <Link href={`/hotels/${h.id}/edit`} className="text-primary hover:underline text-sm mt-2 inline-block">
                      Ajouter des notes →
                    </Link>
                  </div>
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
                <Button size="sm" variant="outline">+ Ajouter un avis</Button>
              </Link>
            </div>
            {reviews.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Aucun avis enregistré.</CardContent></Card>
            ) : reviews.map((r: any) => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{r.author?.full_name || 'Agent'}</span>
                    <span className="text-xs text-muted-foreground">{r.review_date}</span>
                  </div>
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

          {/* Prices — full manager */}
          <TabsContent value="prices" className="mt-4">
            <PriceManager hotelId={h.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
