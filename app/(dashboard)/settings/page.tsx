'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, User, Shield, Building2, Palette, Save } from 'lucide-react'

interface AgencySettings {
  id: string
  name: string
  slogan: string
  address: string
  phone: string
  email: string
  website: string
  primary_color: string
}

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [agency, setAgency] = useState<AgencySettings | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingAgency, setSavingAgency] = useState(false)
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '' })
  const [agencyForm, setAgencyForm] = useState({
    name: '', slogan: '', address: '', phone: '', email: '', website: '', primary_color: '#1e40af',
  })
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: p }, { data: a }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('agency_settings').select('*').limit(1).single(),
      ])

      if (p) {
        setProfile(p as Profile)
        setProfileForm({ full_name: p.full_name || '', email: user.email || '' })
      }
      if (a) {
        setAgency(a as AgencySettings)
        setAgencyForm({
          name: a.name || '',
          slogan: a.slogan || '',
          address: a.address || '',
          phone: a.phone || '',
          email: a.email || '',
          website: a.website || '',
          primary_color: a.primary_color || '#1e40af',
        })
      }
    }
    load()
  }, [])

  async function saveProfile() {
    if (!profile) return
    setSavingProfile(true)
    const { error } = await supabase.from('profiles')
      .update({ full_name: profileForm.full_name })
      .eq('id', profile.id)
    if (!error) toast({ title: 'Profil mis à jour' })
    else toast({ variant: 'destructive', title: 'Erreur', description: error.message })
    setSavingProfile(false)
  }

  async function saveAgency() {
    setSavingAgency(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (agency) {
      // Update existing
      const { error } = await supabase.from('agency_settings')
        .update({ ...agencyForm, updated_by: user?.id })
        .eq('id', agency.id)
      if (!error) {
        toast({ title: 'Paramètres agence enregistrés' })
        setAgency(prev => prev ? { ...prev, ...agencyForm } : prev)
      } else {
        toast({ variant: 'destructive', title: 'Erreur', description: error.message })
      }
    } else {
      // Create first row
      const { data, error } = await supabase.from('agency_settings')
        .insert({ ...agencyForm, updated_by: user?.id })
        .select().single()
      if (!error && data) {
        toast({ title: 'Paramètres agence créés' })
        setAgency(data as AgencySettings)
      } else if (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: error.message })
      }
    }
    setSavingAgency(false)
  }

  return (
    <div>
      <Header title="Paramètres" description="Gérez votre compte et les informations de votre agence" />

      <div className="page-container max-w-2xl space-y-6">

        {/* Agency Info — primary section */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Informations de l'agence</CardTitle>
                <CardDescription>Ces informations apparaissent sur tous les PDFs générés</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nom de l'agence *</Label>
                <Input
                  value={agencyForm.name}
                  onChange={e => setAgencyForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex : Aelia Travel"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slogan</Label>
                <Input
                  value={agencyForm.slogan}
                  onChange={e => setAgencyForm(p => ({ ...p, slogan: e.target.value }))}
                  placeholder="Ex : Votre agence de voyage de confiance"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Adresse</Label>
                <Input
                  value={agencyForm.address}
                  onChange={e => setAgencyForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="Ex : 12 rue des Palmiers, Alger, Algérie"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input
                  value={agencyForm.phone}
                  onChange={e => setAgencyForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="Ex : +213 XXX XXX XXX"
                  type="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  value={agencyForm.email}
                  onChange={e => setAgencyForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="Ex : contact@agence.com"
                  type="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Site web</Label>
                <Input
                  value={agencyForm.website}
                  onChange={e => setAgencyForm(p => ({ ...p, website: e.target.value }))}
                  placeholder="Ex : www.agence.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Couleur principale</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={agencyForm.primary_color}
                    onChange={e => setAgencyForm(p => ({ ...p, primary_color: e.target.value }))}
                    className="w-10 h-9 rounded-lg border cursor-pointer p-0.5"
                  />
                  <Input
                    value={agencyForm.primary_color}
                    onChange={e => setAgencyForm(p => ({ ...p, primary_color: e.target.value }))}
                    placeholder="#1e40af"
                    className="font-mono text-sm"
                  />
                  <div
                    className="w-9 h-9 rounded-lg border flex-shrink-0"
                    style={{ background: agencyForm.primary_color }}
                  />
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-3">Aperçu de l'en-tête PDF :</p>
              <div
                className="rounded-lg p-4 flex items-center justify-between text-white"
                style={{ background: agencyForm.primary_color || '#1e40af' }}
              >
                <div>
                  <p className="font-bold text-base">✈ {agencyForm.name || 'Nom agence'}</p>
                  <p className="text-xs opacity-80 mt-0.5">{agencyForm.slogan || 'Slogan'}</p>
                </div>
                <div className="text-right text-xs opacity-90 space-y-0.5">
                  {agencyForm.address && <p>{agencyForm.address}</p>}
                  {agencyForm.phone && <p>{agencyForm.phone}</p>}
                  {agencyForm.email && <p>{agencyForm.email}</p>}
                  {agencyForm.website && <p>{agencyForm.website}</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={saveAgency} disabled={savingAgency}>
                {savingAgency ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Enregistrer les informations agence
              </Button>
            </div>
          </CardContent>
        </Card>

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
              <Input
                value={profileForm.full_name}
                onChange={e => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Votre nom…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={profileForm.email} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié ici.</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveProfile} disabled={savingProfile} size="sm">
                {savingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Enregistrer
              </Button>
            </div>
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
          </CardContent>
        </Card>

        {/* App info */}
        <Card>
          <CardHeader><CardTitle className="text-base">À propos</CardTitle></CardHeader>
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
