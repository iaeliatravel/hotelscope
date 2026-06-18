'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { useToast } from '@/components/ui/use-toast'
import { Users, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const EMOJI_OPTIONS = ['👨‍👩‍👧', '❤️', '💰', '✨', '🏖️', '🎉', '🧘', '🍷', '👥', '⚖️', '🌟', '🎯', '🌴', '🍹', '⛱️', '🏨']
const COLOR_OPTIONS = [
  { value: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Bleu' },
  { value: 'bg-pink-50 text-pink-700 border-pink-200', label: 'Rose' },
  { value: 'bg-green-50 text-green-700 border-green-200', label: 'Vert' },
  { value: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Jaune' },
  { value: 'bg-cyan-50 text-cyan-700 border-cyan-200', label: 'Cyan' },
  { value: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Violet' },
  { value: 'bg-teal-50 text-teal-700 border-teal-200', label: 'Sarcelle' },
  { value: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Rosé' },
  { value: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Indigo' },
  { value: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Orange' },
]

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProfile, setEditProfile] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    label: '', description: '', icon: '👥', color: COLOR_OPTIONS[0].value,
  })
  const supabase = createClient()
  const { toast } = useToast()

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('client_profiles')
      .select('*, matches:hotel_profile_matches(hotel:hotels(id, name, global_score, status))')
      .order('label')
    setProfiles(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditProfile(null)
    setForm({ label: '', description: '', icon: '👥', color: COLOR_OPTIONS[0].value })
    setDialogOpen(true)
  }

  function openEdit(profile: any) {
    setEditProfile(profile)
    setForm({
      label: profile.label,
      description: profile.description || '',
      icon: profile.icon || '👥',
      color: profile.color || COLOR_OPTIONS[0].value,
    })
    setDialogOpen(true)
  }

  async function save() {
    if (!form.label.trim()) return
    setSaving(true)

    const slug = form.label.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '')

    const payload = {
      name: slug,
      label: form.label.trim(),
      description: form.description.trim() || null,
      icon: form.icon,
      color: form.color,
    }

    if (editProfile) {
      const { error } = await supabase.from('client_profiles').update(payload).eq('id', editProfile.id)
      if (!error) { toast({ title: 'Profil mis à jour' }); setDialogOpen(false); load() }
      else toast({ variant: 'destructive', title: 'Erreur', description: error.message })
    } else {
      const { error } = await supabase.from('client_profiles').insert(payload)
      if (!error) { toast({ title: 'Profil créé' }); setDialogOpen(false); load() }
      else toast({ variant: 'destructive', title: 'Erreur', description: error.message })
    }
    setSaving(false)
  }

  async function deleteProfile(profile: any) {
    if (!confirm(`Supprimer le profil "${profile.label}" ? Les associations avec les hôtels seront également supprimées.`)) return
    await supabase.from('hotel_profile_matches').delete().eq('profile_id', profile.id)
    await supabase.from('client_profiles').delete().eq('id', profile.id)
    toast({ title: 'Profil supprimé' })
    load()
  }

  return (
    <div>
      <Header
        title="Profils clients"
        description="Gérez les profils types et leurs associations avec les hôtels"
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />Nouveau profil
          </Button>
        }
      />

      <div className="page-container space-y-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : profiles.length === 0 ? (
          <EmptyState icon={Users} title="Aucun profil client" description="Créez des profils pour matcher vos hôtels avec les bons clients." action={{ label: 'Créer un profil', onClick: openNew }} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile: any) => {
              const hotels = (profile.matches || []).filter((m: any) => m.hotel && m.hotel.status !== 'non_recommande')

              return (
                <Card key={profile.id} className="group hover:border-primary/20 hover:shadow-sm transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg border', profile.color || 'bg-muted border-muted')}>
                          {profile.icon || '🏨'}
                        </div>
                        <div>
                          <CardTitle className="text-base">{profile.label}</CardTitle>
                          <p className="text-xs text-muted-foreground">{hotels.length} hôtels associés</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(profile)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteProfile(profile)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {profile.description && (
                      <p className="text-xs text-muted-foreground mb-3">{profile.description}</p>
                    )}
                    {hotels.length > 0 ? (
                      <div className="space-y-1.5">
                        {hotels.slice(0, 4).map((m: any) => (
                          <Link key={m.hotel.id} href={`/hotels/${m.hotel.id}`}>
                            <div className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                              <span className="truncate">{m.hotel.name}</span>
                              {m.hotel.global_score && (
                                <span className="text-xs text-muted-foreground ml-auto">{m.hotel.global_score}</span>
                              )}
                            </div>
                          </Link>
                        ))}
                        {hotels.length > 4 && (
                          <p className="text-xs text-muted-foreground pl-3.5">+{hotels.length - 4} autres</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Aucun hôtel associé pour l'instant.</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editProfile ? 'Modifier le profil' : 'Nouveau profil client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nom du profil *</Label>
              <Input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="Ex : Lune de miel" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description du type de client…" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Icône</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, icon: emoji }))}
                    className={cn(
                      'w-9 h-9 rounded-lg border flex items-center justify-center text-lg transition-all',
                      form.icon === emoji ? 'border-primary bg-primary/10 scale-110' : 'border-input hover:border-primary/40'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, color: c.value }))}
                    className={cn(
                      'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                      c.value,
                      form.color === c.value && 'ring-2 ring-offset-1 ring-primary'
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            {form.icon && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground">Aperçu :</span>
                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium', form.color)}>
                  {form.icon} {form.label || 'Nom du profil'}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving || !form.label.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editProfile ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
