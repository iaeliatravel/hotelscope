'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Trash2, Loader2, Users, Baby } from 'lucide-react'
import { BOARD_LABELS } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const SEASONS = [
  { value: 'basse', label: 'Basse saison' },
  { value: 'moyenne', label: 'Saison moyenne' },
  { value: 'haute', label: 'Haute saison' },
  { value: 'tres_haute', label: 'Très haute saison' },
]

const SEASON_COLORS: Record<string, string> = {
  basse: 'bg-slate-100 text-slate-700',
  moyenne: 'bg-blue-50 text-blue-700',
  haute: 'bg-amber-50 text-amber-700',
  tres_haute: 'bg-red-50 text-red-700',
}

const STATUS_COLORS: Record<string, string> = {
  valide: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  a_confirmer: 'bg-amber-50 text-amber-700 border-amber-200',
  indicatif: 'bg-slate-50 text-slate-600 border-slate-200',
  expire: 'bg-red-50 text-red-600 border-red-200',
}

const emptyForm = {
  observation_date: new Date().toISOString().split('T')[0],
  season: 'haute',
  room_type: '',
  board_type: 'all_inclusive',
  adults: '2',
  children: '0',
  currency: 'DZD',
  price: '',
  source_platform: '',
  comment: '',
  status: 'valide',
}

interface PriceManagerProps {
  hotelId: string
}

export function PriceManager({ hotelId }: PriceManagerProps) {
  const [prices, setPrices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editPrice, setEditPrice] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const supabase = createClient()
  const { toast } = useToast()

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('hotel_price_snapshots')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('observation_date', { ascending: false })
    setPrices(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [hotelId])

  function openNew() {
    setEditPrice(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(price: any) {
    setEditPrice(price)
    setForm({
      observation_date: price.observation_date,
      season: price.season || 'haute',
      room_type: price.room_type || '',
      board_type: price.board_type || 'all_inclusive',
      adults: String(price.adults || 2),
      children: String(price.children || 0),
      currency: price.currency || 'EUR',
      price: String(price.price || ''),
      source_platform: price.source_platform || '',
      comment: price.comment || '',
      status: price.status || 'valide',
    })
    setDialogOpen(true)
  }

  async function save() {
    if (!form.price) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const adults = parseInt(form.adults) || 2
    const children = parseInt(form.children) || 0
    const priceVal = parseFloat(form.price)
    const total = adults + children

    const payload = {
      hotel_id: hotelId,
      author_id: user?.id,
      observation_date: form.observation_date,
      season: form.season,
      room_type: form.room_type || null,
      board_type: form.board_type || null,
      adults,
      children,
      currency: form.currency,
      price: priceVal,
      price_per_person: total > 0 ? Math.round((priceVal / total) * 100) / 100 : null,
      source_platform: form.source_platform || null,
      comment: form.comment || null,
      status: form.status,
    }

    if (editPrice) {
      const { error } = await supabase.from('hotel_price_snapshots').update(payload).eq('id', editPrice.id)
      if (!error) { toast({ title: 'Prix modifié' }); setDialogOpen(false); load() }
      else toast({ variant: 'destructive', title: 'Erreur', description: error.message })
    } else {
      const { error } = await supabase.from('hotel_price_snapshots').insert(payload)
      if (!error) { toast({ title: 'Prix ajouté' }); setDialogOpen(false); load() }
      else toast({ variant: 'destructive', title: 'Erreur', description: error.message })
    }
    setSaving(false)
  }

  async function deletePrice(id: string) {
    if (!confirm('Supprimer ce prix ?')) return
    await supabase.from('hotel_price_snapshots').delete().eq('id', id)
    toast({ title: 'Prix supprimé' })
    load()
  }

  // Stats
  const validPrices = prices.filter(p => p.status === 'valide')
  const priceValues = validPrices.map(p => p.price)
  const min = priceValues.length ? Math.min(...priceValues) : null
  const max = priceValues.length ? Math.max(...priceValues) : null
  const avg = priceValues.length ? Math.round(priceValues.reduce((a, b) => a + b, 0) / priceValues.length) : null

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {validPrices.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Minimum', value: min!, color: 'text-emerald-600' },
            { label: 'Moyenne', value: avg!, color: 'text-blue-600' },
            { label: 'Maximum', value: max!, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-muted/30 rounded-xl p-3 text-center border">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn('text-lg font-bold mt-1', s.color)}>
                {s.value.toLocaleString('fr-DZ')} DZD
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />Ajouter un prix
        </Button>
      </div>

      {/* Prices list */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : prices.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucun prix enregistré.</p>
      ) : (
        <div className="space-y-2">
          {prices.map(p => {
            const adults = p.adults || 0
            const children = p.children || 0
            return (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border bg-white hover:bg-muted/20 transition-colors group">
                {/* Date + Saison */}
                <div className="flex-shrink-0 text-center">
                  <p className="text-xs text-muted-foreground">{formatDate(p.observation_date)}</p>
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block', SEASON_COLORS[p.season] || 'bg-muted text-muted-foreground')}>
                    {SEASONS.find(s => s.value === p.season)?.label || p.season}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {p.room_type && <span className="text-xs font-medium text-foreground">{p.room_type}</span>}
                    {p.board_type && (
                      <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded">
                        {BOARD_LABELS[p.board_type as keyof typeof BOARD_LABELS] || p.board_type}
                      </span>
                    )}
                  </div>
                  {/* Persons breakdown */}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />{adults} adulte{adults > 1 ? 's' : ''}
                    </span>
                    {children > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Baby className="w-3 h-3" />{children} enfant{children > 1 ? 's' : ''}
                      </span>
                    )}
                    {p.source_platform && <span className="text-xs text-muted-foreground">· {p.source_platform}</span>}
                  </div>
                  {p.comment && <p className="text-xs text-muted-foreground mt-0.5 italic truncate">{p.comment}</p>}
                </div>

                {/* Price */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-base font-bold text-foreground">{p.price.toLocaleString('fr-DZ')} DZD</p>
                  {p.price_per_person && (
                    <p className="text-xs text-muted-foreground">{Math.round(p.price_per_person).toLocaleString('fr-DZ')} DZD/pers.</p>
                  )}
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', STATUS_COLORS[p.status] || '')}>
                    {p.status}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => openEdit(p)} className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deletePrice(p.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editPrice ? 'Modifier le prix' : 'Nouveau prix observé'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Date d'observation</Label>
              <Input type="date" value={form.observation_date} onChange={e => setForm(p => ({ ...p, observation_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Saison</Label>
              <Select value={form.season} onValueChange={v => setForm(p => ({ ...p, season: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEASONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type de chambre</Label>
              <Input value={form.room_type} onChange={e => setForm(p => ({ ...p, room_type: e.target.value }))} placeholder="Standard, Suite…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Régime</Label>
              <Select value={form.board_type} onValueChange={v => setForm(p => ({ ...p, board_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BOARD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Persons — clearly separated */}
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block">Composition du séjour</Label>
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Users className="w-3.5 h-3.5 text-blue-600" />Adultes
                  </div>
                  <Input
                    type="number" min="1" max="10"
                    value={form.adults}
                    onChange={e => setForm(p => ({ ...p, adults: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Baby className="w-3.5 h-3.5 text-pink-500" />Enfants
                  </div>
                  <Input
                    type="number" min="0" max="10"
                    value={form.children}
                    onChange={e => setForm(p => ({ ...p, children: e.target.value }))}
                    className="h-8"
                  />
                  <p className="text-[10px] text-muted-foreground">(-12 ans généralement)</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Prix total *</Label>
              <Input
                type="number" min="0" step="0.01"
                value={form.price}
                onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Devise</Label>
              <div className="flex h-9 items-center px-3 rounded-lg border bg-muted/50 text-sm font-semibold text-foreground">
                DZD — Dinar Algérien
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Plateforme source</Label>
              <Select value={form.source_platform} onValueChange={v => setForm(p => ({ ...p, source_platform: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir une plateforme…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Autre / Non précisé</SelectItem>
                  <SelectItem value="MyGO">MyGO</SelectItem>
                  <SelectItem value="Flynbeds">Flynbeds</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Statut</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="valide">Valide</SelectItem>
                  <SelectItem value="a_confirmer">À confirmer</SelectItem>
                  <SelectItem value="indicatif">Indicatif</SelectItem>
                  <SelectItem value="expire">Expiré</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Commentaire</Label>
              <Input value={form.comment} onChange={e => setForm(p => ({ ...p, comment: e.target.value }))} placeholder="Précisions sur ce prix…" />
            </div>

            {/* Preview */}
            {form.price && (
              <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                Prix total : <strong>{parseFloat(form.price).toLocaleString('fr-DZ')} DZD</strong>
                {' — '}
                {parseInt(form.adults) + parseInt(form.children)} pers.
                {' = '}
                <strong>{Math.round(parseFloat(form.price) / (parseInt(form.adults) + parseInt(form.children) || 1)).toLocaleString('fr-DZ')} DZD</strong>/personne
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving || !form.price}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editPrice ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
