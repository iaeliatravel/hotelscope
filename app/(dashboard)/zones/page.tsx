'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/empty-state'
import { useToast } from '@/components/ui/use-toast'
import { MapPin, Plus, Pencil, Trash2, Building2, Loader2 } from 'lucide-react'
import type { Zone, City } from '@/lib/types'

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editZone, setEditZone] = useState<Zone | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterCity, setFilterCity] = useState<string>('all')
  const [formData, setFormData] = useState({
    city_id: '', name: '', description: '', characteristics: '', distance_center: ''
  })
  const supabase = createClient()
  const { toast } = useToast()

  async function load() {
    setLoading(true)
    const [{ data: z }, { data: c }] = await Promise.all([
      supabase.from('zones').select('*, city:cities(name)').eq('is_active', true).order('name'),
      supabase.from('cities').select('*').eq('is_active', true).order('name'),
    ])
    setZones(z as Zone[] || [])
    setCities(c as City[] || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = filterCity === 'all' ? zones : zones.filter(z => z.city_id === filterCity)

  function openNew() {
    setEditZone(null)
    setFormData({ city_id: cities[0]?.id || '', name: '', description: '', characteristics: '', distance_center: '' })
    setDialogOpen(true)
  }

  function openEdit(zone: Zone) {
    setEditZone(zone)
    setFormData({
      city_id: zone.city_id,
      name: zone.name,
      description: zone.description || '',
      characteristics: zone.characteristics || '',
      distance_center: zone.distance_center || '',
    })
    setDialogOpen(true)
  }

  async function save() {
    if (!formData.name.trim() || !formData.city_id) return
    setSaving(true)
    const payload = {
      city_id: formData.city_id,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      characteristics: formData.characteristics.trim() || null,
      distance_center: formData.distance_center.trim() || null,
    }
    if (editZone) {
      const { error } = await supabase.from('zones').update(payload).eq('id', editZone.id)
      if (!error) { toast({ title: 'Zone mise à jour' }); setDialogOpen(false); load() }
    } else {
      const { error } = await supabase.from('zones').insert({ ...payload, is_active: true })
      if (!error) { toast({ title: 'Zone créée' }); setDialogOpen(false); load() }
    }
    setSaving(false)
  }

  async function deleteZone(zone: Zone) {
    if (!confirm(`Supprimer "${zone.name}" ?`)) return
    await supabase.from('zones').update({ is_active: false }).eq('id', zone.id)
    toast({ title: 'Zone supprimée' })
    load()
  }

  return (
    <div>
      <Header
        title="Zones"
        description="Organisez les quartiers et secteurs de vos destinations"
        actions={
          <Button size="sm" onClick={openNew} disabled={cities.length === 0}>
            <Plus className="w-4 h-4 mr-2" />Ajouter une zone
          </Button>
        }
      />
      <div className="page-container space-y-6">
        {/* Filter */}
        <div className="flex gap-2">
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Toutes les villes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={MapPin} title="Aucune zone" description="Ajoutez des zones géographiques pour organiser vos hôtels." action={{ label: 'Ajouter une zone', onClick: openNew }} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((zone) => (
              <Card key={zone.id} className="group hover:border-primary/20 hover:shadow-sm transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(zone)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteZone(zone)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold">{zone.name}</h3>
                  <p className="text-sm text-primary font-medium">{zone.city?.name}</p>
                  {zone.description && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{zone.description}</p>}
                  {zone.characteristics && (
                    <p className="text-xs text-muted-foreground/70 mt-1 italic">{zone.characteristics}</p>
                  )}
                  {zone.distance_center && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      À {zone.distance_center} du centre
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editZone ? 'Modifier la zone' : 'Nouvelle zone'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Ville *</Label>
              <Select value={formData.city_id} onValueChange={v => setFormData(p => ({ ...p, city_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir une ville…" /></SelectTrigger>
                <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nom de la zone *</Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Ex : Zone hôtelière nord" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Description courte…" />
            </div>
            <div className="space-y-1.5">
              <Label>Caractéristiques</Label>
              <Input value={formData.characteristics} onChange={e => setFormData(p => ({ ...p, characteristics: e.target.value }))} placeholder="Ex : Calme, proche plage, commerçant…" />
            </div>
            <div className="space-y-1.5">
              <Label>Distance du centre</Label>
              <Input value={formData.distance_center} onChange={e => setFormData(p => ({ ...p, distance_center: e.target.value }))} placeholder="Ex : 2 km" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving || !formData.name.trim() || !formData.city_id}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editZone ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
