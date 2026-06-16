'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { useToast } from '@/components/ui/use-toast'
import { MessageSquare, Plus, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Hotel, HotelReview } from '@/lib/types'

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterHotel, setFilterHotel] = useState('all')
  const [form, setForm] = useState({
    hotel_id: '', source: '', review_date: new Date().toISOString().split('T')[0],
    positive_trends: '', negative_trends: '', recurring_remarks: '',
    watch_points: '', short_conclusion: '', raw_summary: '',
  })
  const supabase = createClient()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  useEffect(() => {
    const hid = searchParams.get('hotel_id')
    if (hid) {
      setForm(p => ({ ...p, hotel_id: hid }))
      setFilterHotel(hid)
      setDialogOpen(true)
    }
  }, [searchParams])

  async function load() {
    setLoading(true)
    const [{ data: r }, { data: h }] = await Promise.all([
      supabase.from('hotel_reviews')
        .select('*, hotel:hotels(name, city:cities(name)), author:profiles(full_name)')
        .order('review_date', { ascending: false }),
      supabase.from('hotels').select('id, name').eq('is_deleted', false).order('name'),
    ])
    setReviews(r || [])
    setHotels(h as Hotel[] || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!form.hotel_id) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('hotel_reviews').insert({
      hotel_id: form.hotel_id,
      author_id: user?.id,
      source: form.source || null,
      review_date: form.review_date,
      positive_trends: form.positive_trends || null,
      negative_trends: form.negative_trends || null,
      recurring_remarks: form.recurring_remarks || null,
      watch_points: form.watch_points || null,
      short_conclusion: form.short_conclusion || null,
      raw_summary: form.raw_summary || null,
    })
    if (!error) {
      toast({ title: 'Avis ajouté' })
      setDialogOpen(false)
      setForm({ hotel_id: '', source: '', review_date: new Date().toISOString().split('T')[0], positive_trends: '', negative_trends: '', recurring_remarks: '', watch_points: '', short_conclusion: '', raw_summary: '' })
      load()
    }
    setSaving(false)
  }

  const filtered = filterHotel === 'all' ? reviews : reviews.filter(r => r.hotel_id === filterHotel)

  return (
    <div>
      <Header
        title="Avis & Synthèses"
        description="Centralisez les impressions et retours sur les hôtels"
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Ajouter un avis
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

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Aucun avis" description="Ajoutez des synthèses d'avis pour enrichir vos fiches hôtels." action={{ label: 'Ajouter un avis', onClick: () => setDialogOpen(true) }} />
        ) : (
          <div className="space-y-4">
            {filtered.map(r => (
              <Card key={r.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{r.hotel?.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.hotel?.city?.name} · {r.author?.full_name || 'Agent'} · {formatDate(r.review_date)}
                        {r.source && ` · Source : ${r.source}`}
                      </p>
                    </div>
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
                  {r.recurring_remarks && (
                    <div>
                      <p className="text-xs font-semibold text-amber-700 mb-1">Remarques récurrentes</p>
                      <p className="text-sm text-muted-foreground">{r.recurring_remarks}</p>
                    </div>
                  )}
                  {r.watch_points && (
                    <div>
                      <p className="text-xs font-semibold text-orange-700 mb-1">Points de vigilance</p>
                      <p className="text-sm text-muted-foreground">{r.watch_points}</p>
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
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvel avis / synthèse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Hôtel *</Label>
                <Select value={form.hotel_id} onValueChange={v => setForm(p => ({ ...p, hotel_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choisir un hôtel…" /></SelectTrigger>
                  <SelectContent>{hotels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.review_date} onChange={e => setForm(p => ({ ...p, review_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Source (optionnel)</Label>
              <Input value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))} placeholder="Ex : TripAdvisor, visite terrain, client…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-emerald-700">Tendances positives</Label>
                <Textarea value={form.positive_trends} onChange={e => setForm(p => ({ ...p, positive_trends: e.target.value }))} placeholder="Ce qui ressort positivement…" rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-red-600">Tendances négatives</Label>
                <Textarea value={form.negative_trends} onChange={e => setForm(p => ({ ...p, negative_trends: e.target.value }))} placeholder="Ce qui ressort négativement…" rows={3} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Remarques récurrentes</Label>
              <Textarea value={form.recurring_remarks} onChange={e => setForm(p => ({ ...p, recurring_remarks: e.target.value }))} placeholder="Ce qui revient souvent dans les avis…" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Points de vigilance</Label>
              <Textarea value={form.watch_points} onChange={e => setForm(p => ({ ...p, watch_points: e.target.value }))} placeholder="Éléments à surveiller…" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Conclusion courte *</Label>
              <Textarea value={form.short_conclusion} onChange={e => setForm(p => ({ ...p, short_conclusion: e.target.value }))} placeholder="En 1-2 phrases : l'essentiel à retenir…" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving || !form.hotel_id}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
