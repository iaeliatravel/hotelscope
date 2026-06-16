'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Copy, Check, FileText, Star } from 'lucide-react'
import { PROFILE_CONFIG, type Hotel, type City } from '@/lib/types'
import { formatDate, formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function OffersPage() {
  const [cities, setCities] = useState<City[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [results, setResults] = useState<Hotel[]>([])
  const [generated, setGenerated] = useState('')

  const [form, setForm] = useState({
    client_name: '',
    city_id: '',
    check_in: '',
    check_out: '',
    adults: '2',
    children: '0',
    budget_max: '',
    currency: 'EUR',
    profile_id: '',
    extra_notes: '',
  })

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from('cities').select('*').eq('is_active', true).order('name'),
        supabase.from('client_profiles').select('*').order('name'),
      ])
      setCities(c as City[] || [])
      setProfiles(p || [])
    }
    load()
  }, [])

  useEffect(() => {
    if (form.city_id) {
      supabase.from('hotels')
        .select('*, scores:hotel_scores(*), zone:zones(name)')
        .eq('city_id', form.city_id)
        .eq('is_deleted', false)
        .eq('status', 'actif')
        .order('global_score', { ascending: false })
        .then(({ data }) => setHotels(data as Hotel[] || []))
    }
  }, [form.city_id])

  async function generate() {
    if (!form.city_id || !form.client_name) return
    setLoading(true)

    let filtered = [...hotels]

    // Filter by profile
    if (form.profile_id) {
      const { data: matches } = await supabase
        .from('hotel_profile_matches')
        .select('hotel_id')
        .eq('profile_id', form.profile_id)
        .in('match_level', ['parfait', 'bon'])

      const matchedIds = new Set(matches?.map(m => m.hotel_id) || [])
      if (matchedIds.size > 0) {
        filtered = filtered.filter(h => matchedIds.has(h.id))
      }
    }

    const top = filtered.slice(0, 3)
    setResults(top)

    // Build text output
    const city = cities.find(c => c.id === form.city_id)
    const profile = profiles.find(p => p.id === form.profile_id)
    const profileConfig = profile ? PROFILE_CONFIG[profile.name as keyof typeof PROFILE_CONFIG] : null
    const nights = form.check_in && form.check_out
      ? Math.round((new Date(form.check_out).getTime() - new Date(form.check_in).getTime()) / (1000 * 60 * 60 * 24))
      : null

    let text = `🌍 OFFRE VOYAGE — ${city?.name?.toUpperCase()}\n`
    text += `═══════════════════════════════\n\n`
    text += `Client : ${form.client_name}\n`
    if (form.check_in) text += `Dates : ${formatDate(form.check_in)}${form.check_out ? ` → ${formatDate(form.check_out)}` : ''}${nights ? ` (${nights} nuits)` : ''}\n`
    text += `Voyageurs : ${form.adults} adulte${parseInt(form.adults) > 1 ? 's' : ''}${parseInt(form.children) > 0 ? ` + ${form.children} enfant${parseInt(form.children) > 1 ? 's' : ''}` : ''}\n`
    if (form.budget_max) text += `Budget max : ${formatPrice(parseFloat(form.budget_max), form.currency)}\n`
    if (profileConfig) text += `Profil : ${profileConfig.icon} ${profileConfig.label}\n`
    text += `\n`

    if (top.length === 0) {
      text += `Aucun hôtel disponible pour ces critères.\n`
    } else {
      text += `✨ NOS RECOMMANDATIONS\n\n`
      top.forEach((h, i) => {
        const stars = parseInt(h.category) || 0
        text += `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${h.name}\n`
        text += `${'★'.repeat(stars)} ${h.category === 'resort' ? 'Resort' : h.category === 'riad' ? 'Riad' : `${h.category}★`}\n`
        if ((h as any).zone?.name) text += `📍 ${(h as any).zone.name}\n`
        if (h.beach_distance) text += `🏖️ Plage : ${h.beach_distance}\n`
        if (h.global_score) text += `⭐ Note interne : ${h.global_score}/10\n`
        if (h.commercial_summary) text += `\n${h.commercial_summary}\n`
        if (h.strengths?.length) {
          text += `\n✅ Points forts :\n`
          h.strengths.slice(0, 3).forEach(s => text += `  • ${s}\n`)
        }
        if (h.weaknesses?.length) {
          text += `\n⚠️ À noter :\n`
          h.weaknesses.slice(0, 2).forEach(w => text += `  • ${w}\n`)
        }
        text += `\n───────────────────────────────\n\n`
      })
    }

    if (form.extra_notes) {
      text += `📝 INFORMATIONS COMPLÉMENTAIRES\n${form.extra_notes}\n\n`
    }

    text += `N'hésitez pas à nous contacter pour obtenir un devis personnalisé.\n`
    text += `Bonne préparation de voyage ! 🌴`

    setGenerated(text)
    setLoading(false)
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(generated)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: 'Copié dans le presse-papiers' })
  }

  return (
    <div>
      <Header
        title="Générateur d'offres"
        description="Créez des recommandations commerciales prêtes à envoyer"
      />

      <div className="page-container">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle className="text-base">Informations client</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nom du client *</Label>
                  <Input value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} placeholder="Ex : Famille Dupont" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Date d'arrivée</Label>
                    <Input type="date" value={form.check_in} onChange={e => setForm(p => ({ ...p, check_in: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date de départ</Label>
                    <Input type="date" value={form.check_out} onChange={e => setForm(p => ({ ...p, check_out: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Adultes</Label>
                    <Input type="number" min="1" value={form.adults} onChange={e => setForm(p => ({ ...p, adults: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Enfants</Label>
                    <Input type="number" min="0" value={form.children} onChange={e => setForm(p => ({ ...p, children: e.target.value }))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Critères de recherche</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Destination *</Label>
                  <Select value={form.city_id} onValueChange={v => setForm(p => ({ ...p, city_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir une ville…" /></SelectTrigger>
                    <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Profil client</Label>
                  <Select value={form.profile_id} onValueChange={v => setForm(p => ({ ...p, profile_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Tous profils" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous profils</SelectItem>
                      {profiles.map(p => {
                        const config = PROFILE_CONFIG[p.name as keyof typeof PROFILE_CONFIG]
                        return <SelectItem key={p.id} value={p.id}>{config?.icon} {config?.label || p.name}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Budget max</Label>
                    <Input type="number" value={form.budget_max} onChange={e => setForm(p => ({ ...p, budget_max: e.target.value }))} placeholder="0" />
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
                </div>
                <div className="space-y-1.5">
                  <Label>Notes complémentaires</Label>
                  <Textarea value={form.extra_notes} onChange={e => setForm(p => ({ ...p, extra_notes: e.target.value }))} placeholder="Informations à ajouter à l'offre…" rows={2} />
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={generate} disabled={loading || !form.city_id || !form.client_name}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
              Générer l'offre
            </Button>
          </div>

          {/* Result */}
          <div className="space-y-4">
            {results.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Hôtels sélectionnés</p>
                {results.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                    <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{h.name}</p>
                      <p className="text-xs text-muted-foreground">{(h as any).zone?.name || 'Sans zone'}</p>
                    </div>
                    {h.global_score && (
                      <span className="text-sm font-bold text-primary">{h.global_score}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {generated && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Offre générée</CardTitle>
                    <Button size="sm" variant="outline" onClick={copyToClipboard}>
                      {copied ? <><Check className="w-4 h-4 mr-2 text-emerald-600" />Copié</> : <><Copy className="w-4 h-4 mr-2" />Copier</>}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 rounded-lg p-4 max-h-[500px] overflow-y-auto leading-relaxed">
                    {generated}
                  </pre>
                </CardContent>
              </Card>
            )}

            {!generated && !loading && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Votre offre apparaîtra ici</p>
                <p className="text-xs text-muted-foreground mt-1">Renseignez les critères et cliquez sur "Générer"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
