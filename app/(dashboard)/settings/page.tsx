'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, User, Shield, Bell } from 'lucide-react'
import type { Profile } from '@/lib/types'

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '' })
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data as Profile)
        setForm({ full_name: data.full_name || '', email: user.email || '' })
      }
    }
    load()
  }, [])

  async function save() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ full_name: form.full_name }).eq('id', profile.id)
    if (!error) toast({ title: 'Profil mis à jour' })
    setSaving(false)
  }

  return (
    <div>
      <Header title="Paramètres" description="Gérez votre compte et les préférences de l'application" />

      <div className="page-container max-w-2xl space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Profil utilisateur</CardTitle>
                <CardDescription>Vos informations personnelles</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom complet</Label>
              <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Votre nom…" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié ici.</p>
            </div>
            <Button onClick={save} disabled={saving} size="sm">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </CardContent>
        </Card>

        {/* Role */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                <Shield className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">Rôle et permissions</CardTitle>
                <CardDescription>Votre niveau d'accès à la plateforme</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm font-medium capitalize">{profile?.role || '—'}</p>
                <p className="text-xs text-muted-foreground">
                  {profile?.role === 'admin' && 'Accès complet à toutes les fonctionnalités'}
                  {profile?.role === 'agent' && 'Peut créer et modifier les fiches hôtels'}
                  {profile?.role === 'readonly' && 'Lecture seule, sans modification possible'}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Pour modifier votre rôle, contactez un administrateur.
            </p>
          </CardContent>
        </Card>

        {/* App info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">À propos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Version</span>
              <span className="font-medium text-foreground">HotelScope 1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Base de données</span>
              <span className="font-medium text-foreground">Supabase</span>
            </div>
            <div className="flex justify-between">
              <span>Framework</span>
              <span className="font-medium text-foreground">Next.js 14 App Router</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
