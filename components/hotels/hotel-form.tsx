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
import { Loader2, Plus, X } from 'lucide-react'
import { slugify, calculateAverageScore, generateCommercialSummary } from '@/lib/utils'
import type { City, Zone, Hotel } from '@/lib/types'

const hotelSchema = z.object({
  name: z.string().min(2, 'Nom requis'),
  city_id: z.string().min(1, 'Ville requise'),
  zone_id: z.string().optional(),
  category: z.string().min(1, 'Catégorie requise'),
  status: z.string().min(1),
  address: z.string().optional(),
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
  website_url: z.string().optional(),
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
  const [strengths, setStrengths] = useState<string[]>(hotel?.strengths || [])
  const [weaknesses, setWeaknesses] = useState<string[]>(hotel?.weaknesses || [])
  const [boardTypes, setBoardTypes] = useState<string[]>(hotel?.board_types || [])
  const [scores, setScores] = useState<Record<string, number>>(
    hotelScores || SCORE_FIELDS.reduce((a, f) => ({ ...a, [f.key]: 0 }), {})
  )
  const [newStrength, setNewStrength] = useState('')
  const [newWeakness, setNewWeakness] = useState('')

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
      address: hotel?.address || '',
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
      website_url: hotel?.website_url || '',
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
    setScores(p => ({ ...p, [key]: Math.min(10, Math.max(0, val)) }))
  }

  function autoSummary() {
    const name = watch('name')
    const ambiance = watch('ambiance')
    const beach_distance = watch('beach_distance')
    const category = watch('category')
    const summary = generateCommercialSummary({ name, ambiance, beach_distance, category: category as any, strengths })
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

    // Upsert scores
    if (hotelId) {
      const scorePayload = {
        hotel_id: hotelId,
        ...scores,
        average_score: avgScore,
        final_score: avgScore,
      }
      if (hotel) {
        await supabase.from('hotel_scores').update(scorePayload).eq('hotel_id', hotelId)
      } else {
        await supabase.from('hotel_scores').insert(scorePayload)
      }

      // Log activity
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Identification */}
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
                <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
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

      {/* Localisation */}
      <Card>
        <CardHeader><CardTitle className="text-base">Localisation & Caractéristiques</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Adresse / Repère</Label>
            <Input {...register('address')} placeholder="Ex : Boulevard Mohammed V, face à la mer" />
          </div>
          <div className="space-y-1.5">
            <Label>Distance plage</Label>
            <Input {...register('beach_distance')} placeholder="Ex : directe, 100m, 500m…" />
          </div>
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
          <div className="space-y-1.5">
            <Label>Clientèle cible</Label>
            <Input {...register('target_audience')} placeholder="Ex : Familles, couples, seniors…" />
          </div>
        </CardContent>
      </Card>

      {/* Régimes */}
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

      {/* Qualités */}
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

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle className="text-base">Notes (sur 10)</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          {SCORE_FIELDS.map(f => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs">{f.label}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={scores[f.key] || ''}
                  onChange={e => updateScore(f.key, parseFloat(e.target.value) || 0)}
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

      {/* Points forts / faibles */}
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

      {/* Résumé & Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Résumé commercial</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={autoSummary}>
              ✨ Générer
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea {...register('commercial_summary')} placeholder="Résumé commercial de l'hôtel pour les clients…" rows={4} />
          <div className="space-y-1.5">
            <Label>Notes internes</Label>
            <Textarea {...register('internal_notes')} placeholder="Observations internes, points d'attention…" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Site web</Label>
            <Input {...register('website_url')} type="url" placeholder="https://…" />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {hotel ? 'Enregistrer les modifications' : 'Créer l\'hôtel'}
        </Button>
      </div>
    </form>
  )
}
