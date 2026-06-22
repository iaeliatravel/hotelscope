'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileMatcherProps {
  hotelId: string
  initialMatches: any[]
}

const MATCH_LEVELS = [
  { value: 'parfait', label: '⭐ Parfait', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'bon', label: '👍 Bon', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'possible', label: '⚡ Possible', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'deconseille', label: '⚠️ Déconseillé', class: 'bg-red-50 text-red-700 border-red-200' },
]

export function ProfileMatcher({ hotelId, initialMatches }: ProfileMatcherProps) {
  const [matches, setMatches] = useState<any[]>(initialMatches || [])
  const [profiles, setProfiles] = useState<any[]>([])
  const [newProfileId, setNewProfileId] = useState('')
  const [newMatchLevel, setNewMatchLevel] = useState('bon')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    supabase.from('client_profiles').select('*').order('label').then(({ data }) => setProfiles(data || []))
  }, [])

  const usedProfileIds = matches.map(m => m.profile_id)
  const availableProfiles = profiles.filter(p => !usedProfileIds.includes(p.id))

  async function addMatch() {
    if (!newProfileId) return
    setAdding(true)
    const { error } = await supabase.from('hotel_profile_matches').insert({
      hotel_id: hotelId,
      profile_id: newProfileId,
      match_level: newMatchLevel,
    })
    if (!error) {
      const profile = profiles.find(p => p.id === newProfileId)
      const newMatch = { hotel_id: hotelId, profile_id: newProfileId, match_level: newMatchLevel, profile }
      setMatches(prev => [...prev, newMatch])
      setNewProfileId('')
      toast({ title: 'Association ajoutée' })
    } else {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message })
    }
    setAdding(false)
  }

  async function updateLevel(profileId: string, level: string) {
    await supabase.from('hotel_profile_matches')
      .update({ match_level: level })
      .eq('hotel_id', hotelId)
      .eq('profile_id', profileId)
    setMatches(prev => prev.map(m => m.profile_id === profileId ? { ...m, match_level: level } : m))
    toast({ title: 'Niveau mis à jour' })
  }

  async function removeMatch(profileId: string) {
    if (!confirm('Supprimer cette association ?')) return
    await supabase.from('hotel_profile_matches')
      .delete()
      .eq('hotel_id', hotelId)
      .eq('profile_id', profileId)
    setMatches(prev => prev.filter(m => m.profile_id !== profileId))
    toast({ title: 'Association supprimée' })
  }

  return (
    <div className="space-y-3">
      {/* Existing matches */}
      {matches.length > 0 ? (
        <div className="space-y-2">
          {matches.map(m => {
            const levelConfig = MATCH_LEVELS.find(l => l.value === m.match_level)
            return (
              <div key={m.profile_id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20">
                <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border font-medium flex-shrink-0', m.profile?.color || 'bg-muted')}>
                  {m.profile?.icon} {m.profile?.label}
                </span>
                <div className="flex-1 min-w-0">
                  <Select value={m.match_level} onValueChange={v => updateLevel(m.profile_id, v)}>
                    <SelectTrigger className="h-7 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATCH_LEVELS.map(l => (
                        <SelectItem key={l.value} value={l.value}>
                          <span className={cn('text-xs font-medium', l.class.split(' ').find(c => c.startsWith('text-')))}>{l.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  onClick={() => removeMatch(m.profile_id)}
                  className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic py-2">Aucun profil associé pour l'instant.</p>
      )}

      {/* Add new association */}
      {availableProfiles.length > 0 && (
        <div className="flex gap-2 pt-1">
          <Select value={newProfileId} onValueChange={setNewProfileId}>
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder="Ajouter un profil…" />
            </SelectTrigger>
            <SelectContent>
              {availableProfiles.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.icon} {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={newMatchLevel} onValueChange={setNewMatchLevel}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATCH_LEVELS.map(l => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            className="h-8 px-2.5"
            onClick={addMatch}
            disabled={!newProfileId || adding}
          >
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          </Button>
        </div>
      )}
      {availableProfiles.length === 0 && profiles.length > 0 && (
        <p className="text-xs text-muted-foreground">Tous les profils sont déjà associés.</p>
      )}
    </div>
  )
}
