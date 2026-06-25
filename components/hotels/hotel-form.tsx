'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, X, Trash2, AlertTriangle, Sparkles } from 'lucide-react'
import { slugify, calculateAverageScore, generateCommercialSummary, cn } from '@/lib/utils'
import type { City, Zone, Hotel } from '@/lib/types'
import { LocationPicker } from '@/components/hotels/location-picker'
import { MediaManager } from '@/components/hotels/media-manager'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'

const hotelSchema = z.object({
  name: z.string().min(2, 'Nom requis'),
  city_id: z.string().min(1, 'Ville requise'),
  zone_id: z.string().optional(),
  category: z.string().min(1, 'Catégorie requise'),
  status: z.string().min(1),
  landmark: z.string().optional(),
  beach_distance: z.string().optional(),
  beach_type: z.string().optional(),
  ambiance: z.string().optional(),
  target_audience: z.string().optional(),
  animation_level: z.string().optional(),
  room_quality: z.string().optional(),
  food_quality: z.string().optional(),
  pool_quality: z.string().optional(),
  beach_quality: z.string().optional(),
  value_for_money: z.string().optional(),
  commercial_summary: z.string().optional(),
  internal_notes: z.string().optional(),
  aelia_note: z.string().optional(),
  website_url: z.string().optional(),
  singles_policy: z.string().optional(),
  burkini_policy: z.string().optional(),
  tiktok_url: z.string().optional(),
  instagram_url: z.string().optional(),
  facebook_url: z.string().optional(),
})

type HotelFormData = z.infer<typeof hotelSchema>

const SCORE_FIELDS = [
  { key: 'location_score', label: 'Emplacement' },
  { key: 'beach_score', label: 'Plage' },
  { key: 'food_score', label: 'Restauration' },
  { key: 'rooms_score', label: 'Chambres' },
  { key: 'animation_score', label: 'Animation' },
  { key: 'cleanliness_score', label: 'Propreté' },
  { key: 'value_score', label: 'Rapport Q/P' },
  { key: 'commercial_score', label: 'Intérêt commercial' },
  { key: 'reliability_score', label: 'Fiabilité globale' },
]

const BOARD_OPTIONS = [
  { value: 'pd', label: 'Petit-déjeuner' },
  { value: 'demi', label: 'Demi-pension' },
  { value: 'complet', label: 'Pension complète' },
  { value: 'all_inclusive', label: 'All Inclusive' },
  { value: 'ultra_all', label: 'Ultra All Inclusive' },
  { value: 'sans', label: 'Sans repas' },
]

interface HotelFormProps {
  hotel?: Hotel
  hotelScores?: Record<string, number>
}

export function HotelForm({ hotel, hotelScores }: HotelFormProps) {
  const [cities, setCities] = useState<City[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [strengths, setStrengths] = useState<string[]>(hotel?.strengths || [])
  const [weaknesses, setWeaknesses] = useState<string[]>(hotel?.weaknesses || [])
  const [boardTypes, setBoardTypes] = useState<string[]>(hotel?.board_types || [])
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const defaults = SCORE_FIELDS.reduce((a, f) => ({ ...a, [f.key]: 0 }), {} as Record<string, number>)
    if (!hotelScores) return defaults
    // Merge: ensure every key exists and is a valid number
    const merged: Record<string, number> = { ...defaults }
    for (const f of SCORE_FIELDS) {
      const v = hotelScores[f.key]
      merged[f.key] = (v !== undefined && v !== null && !isNaN(Number(v))) ? Number(v) : 0
    }
    return merged
  })
  const [newStrength, setNewStrength] = useState('')
  const [newWeakness, setNewWeakness] = useState('')
  const [locationData, setLocationData] = useState({
    address: hotel?.address || '',
    latitude: hotel?.latitude || null,
    longitude: hotel?.longitude || null,
    mapStaticUrl: hotel?.map_static_url || null,
    googleMapsUrl: hotel?.google_maps_url || null,
  })

  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<HotelFormData>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      name: hotel?.name || '',
      city_id: hotel?.city_id || '',
      zone_id: hotel?.zone_id || '',
      category: hotel?.category || '4',
      status: hotel?.status || 'actif',
      landmark: hotel?.landmark || '',
      beach_distance: hotel?.beach_distance || '',
      beach_type: hotel?.beach_type || '',
      ambiance: hotel?.ambiance || '',
      target_audience: hotel?.target_audience || '',
      animation_level: hotel?.animation_level || '',
      room_quality: hotel?.room_quality || '',
      food_quality: hotel?.food_quality || '',
      pool_quality: hotel?.pool_quality || '',
      beach_quality: hotel?.beach_quality || '',
      value_for_money: hotel?.value_for_money || '',
      commercial_summary: hotel?.commercial_summary || '',
      internal_notes: hotel?.internal_notes || '',
      aelia_note: hotel?.aelia_note || '',
      website_url: hotel?.website_url || '',
      singles_policy: hotel?.singles_policy || 'non_applique',
      burkini_policy: hotel?.burkini_policy || 'non_applique',
      tiktok_url: hotel?.tiktok_url || '',
      instagram_url: hotel?.instagram_url || '',
      facebook_url: hotel?.facebook_url || '',
    },
  })

  const watchedCityId = watch('city_id')

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: z }] = await Promise.all([
        supabase.from('cities').select('*').eq('is_active', true).order('name'),
        supabase.from('zones').select('*').eq('is_active', true).order('name'),
      ])
      setCities(c as City[] || [])
      setZones(z as Zone[] || [])
    }
    load()
  }, [])

  const filteredZones = watchedCityId
    ? zones.filter(z => z.city_id === watchedCityId)
    : zones

  function toggleBoard(val: string) {
    setBoardTypes(prev =>
      prev.includes(val) ? prev.filter(b => b !== val) : [...prev, val]
    )
  }

  function addStrength() {
    if (newStrength.trim()) {
      setStrengths(p => [...p, newStrength.trim()])
      setNewStrength('')
    }
  }

  function addWeakness() {
    if (newWeakness.trim()) {
      setWeaknesses(p => [...p, newWeakness.trim()])
      setNewWeakness('')
    }
  }

  function updateScore(key: string, val: number) {
    const safe = isNaN(val) ? 0 : Math.min(10, Math.max(0, val))
    setScores(p => ({ ...p, [key]: safe }))
  }

  function autoSummary() {
    const name = watch('name')
    const ambiance = watch('ambiance')
    const beach_distance = watch('beach_distance')
    const category = watch('category')
    const summary = generateCommercialSummary({
      name,
      stars: parseInt(category) || undefined,
      ambiance,
      beach_distance,
      strengths,
    })
    setValue('commercial_summary', summary)
  }

  async function onSubmit(data: HotelFormData) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const avgScore = calculateAverageScore(scores)
    const payload = {
      ...data,
      zone_id: data.zone_id || null,
      slug: slugify(data.name),
      singles_policy: (data as any).singles_policy || 'non_applique',
      burkini_policy: (data as any).burkini_policy || 'non_applique',
      address: locationData.address || null,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      map_static_url: locationData.mapStaticUrl,
      google_maps_url: locationData.googleMapsUrl,
      strengths,
      weaknesses,
      board_types: boardTypes,
      global_score: avgScore || null,
      last_reviewed_at: new Date().toISOString(),
      last_updated_by: user?.id,
    }

    let hotelId = hotel?.id

    if (hotel) {
      const { error } = await supabase.from('hotels').update(payload).eq('id', hotel.id)
      if (error) { toast({ variant: 'destructive', title: 'Erreur', description: error.message }); setSaving(false); return }
    } else {
      const { data: newHotel, error } = await supabase.from('hotels').insert({ ...payload, is_deleted: false }).select().single()
      if (error) { toast({ variant: 'destructive', title: 'Erreur', description: error.message }); setSaving(false); return }
      hotelId = newHotel.id
    }

    if (hotelId) {
      // Build score payload with explicit keys (avoids spreading undefined values)
      const toNum = (v: unknown) => {
        const n = Number(v)
        return isNaN(n) ? 0 : Math.round(n * 100) / 100
      }
      const scorePayload = {
        hotel_id: hotelId,
        location_score: toNum(scores['location_score']),
        beach_score: toNum(scores['beach_score']),
        food_score: toNum(scores['food_score']),
        rooms_score: toNum(scores['rooms_score']),
        animation_score: toNum(scores['animation_score']),
        cleanliness_score: toNum(scores['cleanliness_score']),
        value_score: toNum(scores['value_score']),
        commercial_score: toNum(scores['commercial_score']),
        reliability_score: toNum(scores['reliability_score']),
        average_score: Math.round(avgScore * 100) / 100,
        final_score: Math.round(avgScore * 100) / 100,
      }
      const { error: scoreErr } = await supabase
        .from('hotel_scores')
        .upsert(scorePayload, { onConflict: 'hotel_id' })
      if (scoreErr) console.error('Score upsert error:', scoreErr.message, scoreErr.details)

      await supabase.from('activity_log').insert({
        user_id: user?.id,
        action: hotel ? 'a modifié' : 'a créé',
        entity_type: 'hotel',
        entity_id: hotelId,
        entity_name: data.name,
      })
    }

    toast({ title: hotel ? 'Hôtel mis à jour' : 'Hôtel créé avec succès' })
    router.push(hotelId ? `/hotels/${hotelId}` : '/hotels')
    router.refresh()
  }

  async function handleDelete() {
    if (!hotel || deleteConfirmText !== hotel.name) return
    setDeleting(true)

    const { error } = await supabase.rpc('delete_hotel_permanently', { p_hotel_id: hotel.id })

    if (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message })
      setDeleting(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('activity_log').insert({
      user_id: user?.id,
      action: 'a supprimé définitivement',
      entity_type: 'hotel',
      entity_name: hotel.name,
    })

    toast({ title: 'Hôtel supprimé définitivement' })
    router.push('/hotels')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Identification</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Nom de l'hôtel *</Label>
            <Input {...register('name')} placeholder="Ex : Riu Palace Tikida" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Ville *</Label>
            <Controller name="city_id" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Choisir une ville…" /></SelectTrigger>
                <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.country})</SelectItem>)}</SelectContent>
              </Select>
            )} />
            {errors.city_id && <p className="text-xs text-destructive">{errors.city_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Zone</Label>
            <Controller name="zone_id" control={control} render={({ field }) => (
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Choisir une zone…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sans zone</SelectItem>
                  {filteredZones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>

          <div className="space-y-1.5">
            <Label>Catégorie *</Label>
            <Controller name="category" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['5','4','3','2','1'].map(s => <SelectItem key={s} value={s}>{s} étoiles</SelectItem>)}
                  <SelectItem value="resort">Resort</SelectItem>
                  <SelectItem value="apart">Appartement</SelectItem>
                  <SelectItem value="riad">Riad</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>

          <div className="space-y-1.5">
            <Label>Statut</Label>
            <Controller name="status" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="en_veille">En veille</SelectItem>
                  <SelectItem value="a_verifier">À vérifier</SelectItem>
                  <SelectItem value="non_recommande">Non recommandé</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Localisation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <LocationPicker
            address={locationData.address}
            latitude={locationData.latitude}
            longitude={locationData.longitude}
            onChange={setLocationData}
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Repère / Point de référence</Label>
              <Input {...register('landmark')} placeholder="Ex : Face à la grande mosquée" />
            </div>
            <div className="space-y-1.5">
              <Label>Distance plage</Label>
              <Input {...register('beach_distance')} placeholder="Ex : directe, 100m, 500m…" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Caractéristiques</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Type de plage</Label>
            <Controller name="beach_type" control={control} render={({ field }) => (
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Non précisé</SelectItem>
                  <SelectItem value="sable_fin">Sable fin</SelectItem>
                  <SelectItem value="sable_grossier">Sable grossier</SelectItem>
                  <SelectItem value="galets">Galets</SelectItem>
                  <SelectItem value="rochers">Rochers</SelectItem>
                  <SelectItem value="lagon">Lagon</SelectItem>
                  <SelectItem value="piscine_privee">Piscine privée</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-1.5">
            <Label>Ambiance</Label>
            <Controller name="ambiance" control={control} render={({ field }) => (
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Non précisée</SelectItem>
                  <SelectItem value="familial">Familial</SelectItem>
                  <SelectItem value="romantique">Romantique</SelectItem>
                  <SelectItem value="festif">Festif</SelectItem>
                  <SelectItem value="calme">Calme</SelectItem>
                  <SelectItem value="sportif">Sportif</SelectItem>
                  <SelectItem value="luxe">Luxe</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Clientèle cible</Label>
            <Input {...register('target_audience')} placeholder="Ex : Familles, couples, seniors…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Régimes proposés</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {BOARD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleBoard(opt.value)}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${
                  boardTypes.includes(opt.value)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-muted-foreground border-input hover:border-primary/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Politiques hôtel */}
      <Card>
        <CardHeader><CardTitle className="text-base">Politiques de l'hôtel</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Politique célibataires / familles</Label>
            <Controller name="singles_policy" control={control} render={({ field }) => (
              <div className="flex flex-col gap-2">
                {[
                  { value: 'familles_couples', label: '👨‍👩‍👧 Familles et couples uniquement', color: 'border-blue-200 bg-blue-50 text-blue-800' },
                  { value: 'accepte_celibataires', label: '✅ Accepte les célibataires', color: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
                  { value: 'celibataires_demande', label: '📋 Célibataires sur demande', color: 'border-amber-200 bg-amber-50 text-amber-800' },
                  { value: 'non_applique', label: '— Non appliqué', color: 'border-muted bg-muted/30 text-muted-foreground' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-xs font-medium text-left transition-all',
                      field.value === opt.value
                        ? opt.color + ' ring-2 ring-offset-1 ring-primary/30'
                        : 'bg-white border-input text-muted-foreground hover:border-primary/30'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )} />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Politique burkini</Label>
            <Controller name="burkini_policy" control={control} render={({ field }) => (
              <div className="flex flex-col gap-2">
                {[
                  { value: 'autorise', label: '✅ Burkini autorisé', color: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
                  { value: 'interdit', label: '🚫 Burkini interdit', color: 'border-red-200 bg-red-50 text-red-800' },
                  { value: 'non_applique', label: '— Non appliqué / Non précisé', color: 'border-muted bg-muted/30 text-muted-foreground' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-xs font-medium text-left transition-all',
                      field.value === opt.value
                        ? opt.color + ' ring-2 ring-offset-1 ring-primary/30'
                        : 'bg-white border-input text-muted-foreground hover:border-primary/30'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Réseaux sociaux</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>TikTok</Label>
            <Input {...register('tiktok_url')} placeholder="https://tiktok.com/@…" />
          </div>
          <div className="space-y-1.5">
            <Label>Instagram</Label>
            <Input {...register('instagram_url')} placeholder="https://instagram.com/…" />
          </div>
          <div className="space-y-1.5">
            <Label>Facebook</Label>
            <Input {...register('facebook_url')} placeholder="https://facebook.com/…" />
          </div>
        </CardContent>
      </Card>

      {hotel && (
        <Card>
          <CardHeader><CardTitle className="text-base">Photos & Médias</CardTitle></CardHeader>
          <CardContent>
            <MediaManager hotelId={hotel.id} />
          </CardContent>
        </Card>
      )}
      {!hotel && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Vous pourrez ajouter des photos et médias après la création de l'hôtel.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Qualité par aspect</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          {[
            { name: 'room_quality' as const, label: 'Chambres' },
            { name: 'food_quality' as const, label: 'Nourriture' },
            { name: 'pool_quality' as const, label: 'Piscine' },
            { name: 'beach_quality' as const, label: 'Plage' },
            { name: 'animation_level' as const, label: 'Animation' },
            { name: 'value_for_money' as const, label: 'Rapport Q/P' },
          ].map(f => (
            <div key={f.name} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Input {...register(f.name)} placeholder="Description courte…" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notes (sur 10)</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          {SCORE_FIELDS.map(f => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs">{f.label}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={(() => {
                    const v = scores[f.key]
                    if (v === undefined || v === null || v === 0) return ''
                    return String(v).replace('.', ',')
                  })()}
                  onChange={e => {
                    const raw = e.target.value.replace(',', '.')
                    const val = parseFloat(raw)
                    updateScore(f.key, isNaN(val) ? 0 : Math.min(10, Math.max(0, val)))
                  }}
                  placeholder="0"
                  className="h-8 text-center"
                />
                <span className="text-xs text-muted-foreground w-4">/10</span>
              </div>
            </div>
          ))}
          <div className="sm:col-span-3 pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Moyenne calculée :{' '}
              <span className="font-semibold text-foreground">
                {calculateAverageScore(scores).toFixed(1)} / 10
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Points forts & faibles</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className="text-emerald-700">Points forts</Label>
            <div className="space-y-1.5">
              {strengths.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-500">✓</span>
                  <span className="flex-1">{s}</span>
                  <button type="button" onClick={() => setStrengths(p => p.filter((_, j) => j !== i))}>
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newStrength} onChange={e => setNewStrength(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStrength())}
                placeholder="Ajouter un point fort…" className="h-8 text-sm" />
              <Button type="button" size="sm" variant="outline" className="h-8" onClick={addStrength}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <Label className="text-red-600">Points faibles</Label>
            <div className="space-y-1.5">
              {weaknesses.map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-red-400">✕</span>
                  <span className="flex-1">{w}</span>
                  <button type="button" onClick={() => setWeaknesses(p => p.filter((_, j) => j !== i))}>
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newWeakness} onChange={e => setNewWeakness(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addWeakness())}
                placeholder="Ajouter un point faible…" className="h-8 text-sm" />
              <Button type="button" size="sm" variant="outline" className="h-8" onClick={addWeakness}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Résumé commercial</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={autoSummary}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />Générer
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea {...register('commercial_summary')} placeholder="Résumé commercial de l'hôtel pour les clients…" rows={4} />

          <div className="space-y-1.5 pt-2 border-t">
            <Label className="text-amber-700">AeliaNote — Votre avis personnel</Label>
            <Textarea {...register('aelia_note')} placeholder="Votre propre impression, ce que vous pensez vraiment de cet hôtel…" rows={3} className="border-amber-200 focus-visible:ring-amber-400" />
            <p className="text-xs text-muted-foreground">Note interne d'Aelia Travel, distincte des avis clients et des notes internes générales.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Notes internes générales</Label>
            <Textarea {...register('internal_notes')} placeholder="Observations internes, points d'attention…" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Site web</Label>
            <Input {...register('website_url')} type="url" placeholder="https://…" />
          </div>
        </CardContent>
      </Card>

      {hotel && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />Zone de danger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              La suppression de cet hôtel est définitive et irréversible. Toutes les données associées (notes, avis, prix, médias) seront perdues.
            </p>
            <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" />Supprimer définitivement cet hôtel
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end gap-3 pb-6">
        <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {hotel ? 'Enregistrer les modifications' : 'Créer l\'hôtel'}
        </Button>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Supprimer définitivement « {hotel?.name} » ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Toutes les notes, avis, prix, médias et associations liés à cet hôtel seront perdus pour toujours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-sm">Pour confirmer, tapez le nom exact de l'hôtel :</Label>
            <Input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={hotel?.name}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText('') }}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={deleting || deleteConfirmText !== hotel?.name}
              onClick={handleDelete}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
