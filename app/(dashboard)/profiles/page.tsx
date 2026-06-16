import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PROFILE_CONFIG } from '@/lib/types'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default async function ProfilesPage() {
  const supabase = createClient()

  const { data: profiles } = await supabase
    .from('client_profiles')
    .select('*, matches:hotel_profile_matches(hotel:hotels(id, name, global_score, status))')
    .order('name')

  return (
    <div>
      <Header
        title="Profils clients"
        description="Associez chaque hôtel aux profils de clientèle adaptés"
      />

      <div className="page-container space-y-6">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Les profils clients permettent de matcher rapidement une demande client avec les hôtels les plus adaptés. Chaque hôtel peut être associé à un ou plusieurs profils depuis sa fiche.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(profiles || []).map((profile: any) => {
            const config = PROFILE_CONFIG[profile.name as keyof typeof PROFILE_CONFIG]
            const hotels = (profile.matches || []).filter((m: any) => m.hotel && m.hotel.status !== 'non_recommande')

            return (
              <Card key={profile.id} className="group hover:border-primary/20 hover:shadow-sm transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg border', config?.color || 'bg-muted border-muted')}>
                      {config?.icon || '🏨'}
                    </div>
                    <div>
                      <CardTitle className="text-base">{config?.label || profile.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{hotels.length} hôtels associés</p>
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
      </div>
    </div>
  )
}
