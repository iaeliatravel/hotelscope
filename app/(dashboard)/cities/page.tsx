'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { useToast } from '@/components/ui/use-toast'
import { Globe, Plus, Pencil, Trash2, Building2, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { City } from '@/lib/types'

const COUNTRY_EMOJIS: Record<string, string> = {
  'Maroc': '🇲🇦', 'Tunisie': '🇹🇳', 'Algérie': '🇩🇿', 'Égypte': '🇪🇬',
  'Turquie': '🇹🇷', 'Grèce': '🇬🇷', 'Espagne': '🇪🇸', 'France': '🇫🇷',
}

export default function CitiesPage() {
  const [cities, setCities] = useState<City[]>([])
  const [countries, setCountries] = useState<string[]>([])
  const [filterCountry, setFilterCountry] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editCity, setEditCity] = useState<City | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ name: '', country: 'Maroc', description: '' })
  const supabase = createClient()
  const { toast } = useToast()

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('cities').select('*, hotels:hotels(count)').eq('is_active', true).order('name')
    setCities(data as City[] || [])
    const unique = Array.from(new Set((data || []).map((c: any) => c.country))].sort())
    setCountries(unique as string[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = filterCountry === 'all' ? cities : cities.filter(c => c.country === filterCountry)

  function openNew() { setEditCity(null); setFormData({ name: '', country: 'Maroc', description: '' }); setDialogOpen(true) }
  function openEdit(city: City) { setEditCity(city); setFormData({ name: city.name, country: city.country, description: city.description || '' }); setDialogOpen(true) }

  async function save() {
    if (!formData.name.trim()) return
    setSaving(true)
    const payload = { name: formData.name.trim(), country: formData.country.trim(), description: formData.description.trim() || null }
    if (editCity) {
      const { error } = await supabase.from('cities').update(payload).eq('id', editCity.id)
      if (!error) { toast({ title: 'Ville mise à jour' }); setDialogOpen(false); load() }
    } else {
      const { error } = await supabase.from('cities').insert({ ...payload, is_active: true })
      if (!error) { toast({ title: 'Ville ajoutée' }); setDialogOpen(false); load() }
    }
    setSaving(false)
  }

  async function deleteCity(city: City) {
    if (!confirm(`Supprimer "${city.name}" ?`)) return
    await supabase.from('cities').update({ is_active: false }).eq('id', city.id)
    toast({ title: 'Ville supprimée' }); load()
  }

  return (
    <div>
      <Header title="Villes" description="Gérez les destinations de votre catalogue"
        actions={<Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-2" />Ajouter</Button>}
      />
      <div className="page-container space-y-5">
        {/* Country filter pills */}
        {countries.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterCountry('all')}
              className={cn('px-3 py-1.5 rounded-full text-sm border transition-all', filterCountry === 'all' ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-input hover:border-primary/40')}>
              Tous les pays
            </button>
            {countries.map(c => (
              <button key={c} onClick={() => setFilterCountry(c)}
                className={cn('px-3 py-1.5 rounded-full text-sm border transition-all', filterCountry === c ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-input hover:border-primary/40')}>
                {COUNTRY_EMOJIS[c] || '🌍'} {c}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Globe} title="Aucune ville" description="Ajoutez votre première destination." action={{ label: 'Ajouter une ville', onClick: openNew }} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((city) => (
              <Card key={city.id} className="group hover:border-primary/20 hover:shadow-sm transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{COUNTRY_EMOJIS[city.country] || '🌍'}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(city)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteCity(city)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm">{city.name}</h3>
                  <p className="text-xs text-muted-foreground">{city.country}</p>
                  {city.description && <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{city.description}</p>}
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t text-xs text-muted-foreground">
                    <Building2 className="w-3 h-3" />
                    <span>{(city as any).hotels?.[0]?.count || 0} hôtels</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCity ? 'Modifier la ville' : 'Nouvelle ville'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nom de la ville *</Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Ex : Marrakech" />
            </div>
            <div className="space-y-1.5">
              <Label>Pays *</Label>
              <Input value={formData.country} onChange={e => setFormData(p => ({ ...p, country: e.target.value }))} placeholder="Ex : Maroc" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Courte description…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving || !formData.name.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editCity ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
