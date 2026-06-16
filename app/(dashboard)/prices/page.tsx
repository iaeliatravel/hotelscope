'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { useToast } from '@/components/ui/use-toast'
import { TrendingUp, Plus, Loader2, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { formatDate, formatPrice } from '@/lib/utils'
import { BOARD_LABELS } from '@/lib/types'
import type { Hotel } from '@/lib/types'

const SEASONS = [
  { value: 'basse', label: 'Basse saison' },
  { value: 'moyenne', label: 'Saison moyenne' },
  { value: 'haute', label: 'Haute saison' },
  { value: 'tres_haute', label: 'Très haute saison' },
]

export default function PricesPage() {
  const [prices, setPrices] = useState<any[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterHotel, setFilterHotel] = useState('all')
  const [form, setForm] = useState({
    hotel_id: '', observation_date: new Date().toISOString().split('T')[0],
    season: 'haute', room_type: '', board_type: 'all_inclusive',
    adults: '2', children: '0', currency: 'EUR', price: '',
    source_platform: '', source_url: '', comment: '', status: 'valide',
  })
  const supabase = createClient()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  useEffect(() => {
    const hid = searchParams.get('hotel_id')
    if (hid) { setForm(p => ({ ...p, hotel_id: hid })); setFilterHotel(hid); setDialogOpen(true) }
  }, [searchParams])

  async function load() {
    setLoading(true)
    const [{ data: p }, { data: h }] = await Promise.all([
      supabase.from('hotel_price_snapshots')
        .select('*, hotel:hotels(name, city:cities(name))')
        .order('observation_date', { ascending: false })
        .limit(200),
      supabase.from('hotels').select('id, name').eq('is_deleted', false).order('name'),
    ])
    setPrices(p || [])
    setHotels(h as Hotel[] || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!form.hotel_id || !form.price) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const priceVal = parseFloat(form.price)
    const adults = parseInt(form.adults)
    const children = parseInt(form.children)
    const { error } = await supabase.from('hotel_price_snapshots').insert({
      hotel_id: form.hotel_id,
      author_id: user?.id,
      observation_date: form.observation_date,
      season: form.season,
      room_type: form.room_type || null,
      board_type: form.board_type || null,
      adults,
      children,
      currency: form.currency,
      price: priceVal,
      price_per_person: priceVal / (adults + children || 1),
      source_platform: form.source_platform || null,
      source_url: form.source_url || null,
      comment: form.comment || null,
      status: form.status,
    })
    if (!error) {
      toast({ title: 'Prix enregistré' })
      setDialogOpen(false)
      load()
    }
    setSaving(false)
  }

  const filtered = filterHotel === 'all' ? prices : prices.filter(p => p.hotel_id === filterHotel)

  // Stats by hotel
  const statsByHotel = filtered.reduce((acc: Record<string, { min: number; max: number; sum: number; count: number; name: string }>, p) => {
    const key = p.hotel_id
    if (!acc[key]) acc[key] = { min: p.price, max: p.price, sum: 0, count: 0, name: p.hotel?.name || '' }
    acc[key].min = Math.min(acc[key].min, p.price)
    acc[key].max = Math.max(acc[key].max, p.price)
    acc[key].sum += p.price
    acc[key].count++
    return acc
  }, {})

  return (
    <div>
      <Header
        title="Suivi des prix"
        description="Historique des observations de prix par hôtel"
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Saisir un prix
          </Button>
        }
      />

      <div className="page-container space-y-6">
        <Select value={filterHotel} onValueChange={setFilterHotel}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Tous les hôtels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les hôtels</SelectItem>
            {hotels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Stats cards */}
        {filterHotel !== 'all' && statsByHotel[filterHotel] && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Prix minimum', val: statsByHotel[filterHotel].min, icon: ArrowDown, color: 'text-emerald-600' },
              { label: 'Prix moyen', val: Math.round(statsByHotel[filterHotel].sum / statsByHotel[filterHotel].count), icon: Minus, color: 'text-blue-600' },
              { label: 'Prix maximum', val: statsByHotel[filterHotel].max, icon: ArrowUp, color: 'text-red-600' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{formatPrice(s.val)}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Aucun prix enregistré" description="Commencez à saisir des observations de prix pour suivre les tendances." action={{ label: 'Saisir un prix', onClick: () => setDialogOpen(true) }} />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      {['Hôtel', 'Date', 'Saison', 'Chambre', 'Régime', 'Pers.', 'Prix', 'Prix/pers.', 'Source', 'Statut'].map(h => (
                        <th key={h} className="text-left p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3">
                          <p className="font-medium whitespace-nowrap">{p.hotel?.name}</p>
                          <p className="text-xs text-muted-foreground">{p.hotel?.city?.name}</p>
                        </td>
                        <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">{formatDate(p.observation_date)}</td>
                        <td className="p-3">
                          <span className="text-xs capitalize">{SEASONS.find(s => s.value === p.season)?.label || p.season}</span>
                        </td>
                        <td className="p-3 text-xs">{p.room_type || '—'}</td>
                        <td className="p-3 text-xs">{BOARD_LABELS[p.board_type as keyof typeof BOARD_LABELS] || '—'}</td>
                        <td className="p-3 text-center">{p.adults + (p.children || 0)}</td>
                        <td className="p-3 font-semibold whitespace-nowrap">{formatPrice(p.price, p.currency)}</td>
                        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                          {p.price_per_person ? formatPrice(p.price_per_person, p.currency) : '—'}
                        </td>
                        <td className="p-3 text-xs">{p.source_platform || '—'}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded border ${
                            p.status === 'valide' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            p.status === 'expire' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>{p.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Saisir un prix observé</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Hôtel *</Label>
                <Select value={form.hotel_id} onValueChange={v => setForm(p => ({ ...p, hotel_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir un hôtel…" /></SelectTrigger>
                  <SelectContent>{hotels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date d'observation</Label>
                <Input type="date" value={form.observation_date} onChange={e => setForm(p => ({ ...p, observation_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Saison</Label>
                <Select value={form.season} onValueChange={v => setForm(p => ({ ...p, season: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SEASONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type de chambre</Label>
                <Input value={form.room_type} onChange={e => setForm(p => ({ ...p, room_type: e.target.value }))} placeholder="Ex : Standard, Suite…" />
              </div>
              <div className="space-y-1.5">
                <Label>Régime</Label>
                <Select value={form.board_type} onValueChange={v => setForm(p => ({ ...p, board_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BOARD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Adultes</Label>
                <Input type="number" min="1" value={form.adults} onChange={e => setForm(p => ({ ...p, adults: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Enfants</Label>
                <Input type="number" min="0" value={form.children} onChange={e => setForm(p => ({ ...p, children: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Prix total *</Label>
                <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Devise</Label>
                <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['EUR', 'USD', 'MAD', 'TND', 'DZD'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Plateforme source</Label>
                <Input value={form.source_platform} onChange={e => setForm(p => ({ ...p, source_platform: e.target.value }))} placeholder="Booking, TUI, Expedia…" />
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="valide">Valide</SelectItem>
                    <SelectItem value="a_confirmer">À confirmer</SelectItem>
                    <SelectItem value="indicatif">Indicatif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving || !form.hotel_id || !form.price}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
