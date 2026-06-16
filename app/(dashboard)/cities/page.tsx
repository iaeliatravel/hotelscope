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
import type { City } from '@/lib/types'
import { formatDate } from '@/lib/utils'

export default function CitiesPage() {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editCity, setEditCity] = useState<City | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ name: '', country: '', description: '' })
  const supabase = createClient()
  const { toast } = useToast()

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('cities')
      .select('*, hotels:hotels(count)')
      .eq('is_active', true)
      .order('name')
    setCities(data as City[] || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditCity(null)
    setFormData({ name: '', country: 'Maroc', description: '' })
    setDialogOpen(true)
  }

  function openEdit(city: City) {
    setEditCity(city)
    setFormData({ name: city.name, country: city.country, description: city.description || '' })
    setDialogOpen(true)
  }

  async function save() {
    if (!formData.name.trim()) return
    setSaving(true)
    const payload = { name: formData.name.trim(), country: formData.country.trim(), description: formData.description.trim() || null }

    if (editCity) {
      const { error } = await supabase.from('cities').update(payload).eq('id', editCity.id)
      if (!error) {
        toast({ title: 'Ville mise à jour' })
        setDialogOpen(false)
        load()
      }
    } else {
      const { error } = await supabase.from('cities').insert({ ...payload, is_active: true })
      if (!error) {
        toast({ title: 'Ville ajoutée' })
        setDialogOpen(false)
        load()
      }
    }
    setSaving(false)
  }

  async function deleteCity(city: City) {
    if (!confirm(`Supprimer "${city.name}" ?`)) return
    await supabase.from('cities').update({ is_active: false }).eq('id', city.id)
    toast({ title: 'Ville supprimée' })
    load()
  }

  return (
    <div>
      <Header
        title="Villes"
        description="Gérez les destinations de votre catalogue"
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />Ajouter une ville
          </Button>
        }
      />

      <div className="page-container">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : cities.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="Aucune ville"
            description="Ajoutez votre première destination pour commencer."
            action={{ label: 'Ajouter une ville', onClick: openNew }}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cities.map((city) => (
              <Card key={city.id} className="group hover:border-primary/20 hover:shadow-sm transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(city)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteCity(city)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground">{city.name}</h3>
                  <p className="text-sm text-muted-foreground">{city.country}</p>
                  {city.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{city.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t text-xs text-muted-foreground">
                    <Building2 className="w-3 h-3" />
                    <span>{(city as any).hotels?.[0]?.count || 0} hôtels</span>
                    <span className="ml-auto">{formatDate(city.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCity ? 'Modifier la ville' : 'Nouvelle ville'}</DialogTitle>
          </DialogHeader>
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
              <Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Courte description de la destination…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving || !formData.name.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editCity ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
