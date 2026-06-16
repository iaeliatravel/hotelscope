import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Hotel, Star, TrendingUp, Users, MessageSquare, Activity } from 'lucide-react'
import { ScoreBadge } from '@/components/scores/score-badge'
import { formatRelative } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getStatusConfig } from '@/lib/types'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = createClient()

  const [
    { count: hotelsCount },
    { count: citiesCount },
    { data: topHotels },
    { data: recentActivity },
    { data: statusBreakdown },
  ] = await Promise.all([
    supabase.from('hotels').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('cities').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('hotels')
      .select('id, name, global_score, status, city:cities(name)')
      .eq('is_deleted', false)
      .not('global_score', 'is', null)
      .order('global_score', { ascending: false })
      .limit(5),
    supabase.from('activity_log')
      .select('*, user:profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('hotels')
      .select('status')
      .eq('is_deleted', false),
  ])

  const statusCounts = (statusBreakdown || []).reduce((acc: Record<string, number>, h: { status: string }) => {
    acc[h.status] = (acc[h.status] || 0) + 1
    return acc
  }, {})

  const stats = [
    { label: 'Hôtels référencés', value: hotelsCount || 0, icon: Hotel, href: '/hotels', color: 'text-blue-600 bg-blue-50' },
    { label: 'Villes actives', value: citiesCount || 0, icon: Star, href: '/cities', color: 'text-purple-600 bg-purple-50' },
    { label: 'Actifs', value: statusCounts['actif'] || 0, icon: TrendingUp, href: '/hotels?status=actif', color: 'text-emerald-600 bg-emerald-50' },
    { label: 'À vérifier', value: statusCounts['a_verifier'] || 0, icon: MessageSquare, href: '/hotels?status=a_verifier', color: 'text-amber-600 bg-amber-50' },
  ]

  return (
    <div>
      <Header
        title="Tableau de bord"
        description="Vue d'ensemble de votre portefeuille hôtelier"
        actions={
          <Link href="/hotels/new">
            <Button size="sm">
              <Hotel className="w-4 h-4 mr-2" />
              Nouvel hôtel
            </Button>
          </Link>
        }
      />

      <div className="page-container space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <Link key={s.label} href={s.href}>
                <div className="stat-card group hover:border-primary/20 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{s.label}</p>
                      <p className="text-3xl font-bold tracking-tight">{s.value}</p>
                    </div>
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', s.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Hotels */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Meilleurs hôtels</CardTitle>
                <Link href="/hotels" className="text-xs text-primary hover:underline">Voir tout</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(topHotels || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun hôtel noté pour l'instant.</p>
              ) : (
                (topHotels || []).map((h: any, i: number) => {
                  const sc = getStatusConfig(h.status)
                  return (
                    <Link key={h.id} href={`/hotels/${h.id}`}>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <span className="text-sm font-bold text-muted-foreground/50 w-5">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{h.name}</p>
                          <p className="text-xs text-muted-foreground">{h.city?.name}</p>
                        </div>
                        <span className={cn('text-xs px-2 py-0.5 rounded border', sc.class)}>{sc.label}</span>
                        <ScoreBadge score={h.global_score} size="sm" />
                      </div>
                    </Link>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Activité récente</CardTitle>
                <Link href="/activity" className="text-xs text-primary hover:underline">Voir tout</Link>
              </div>
            </CardHeader>
            <CardContent>
              {(recentActivity || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune activité récente.</p>
              ) : (
                <div className="space-y-3">
                  {(recentActivity || []).map((a: any) => (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Activity className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{a.user?.full_name || 'Système'}</span>
                          {' '}
                          <span className="text-muted-foreground">{a.action}</span>
                          {a.entity_name && (
                            <span className="font-medium"> {a.entity_name}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatRelative(a.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { key: 'actif', label: 'Actifs', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                { key: 'en_veille', label: 'En veille', color: 'bg-slate-100 text-slate-600 border-slate-200' },
                { key: 'a_verifier', label: 'À vérifier', color: 'bg-amber-100 text-amber-800 border-amber-200' },
                { key: 'non_recommande', label: 'Non recommandés', color: 'bg-red-100 text-red-800 border-red-200' },
              ].map(({ key, label, color }) => (
                <div key={key} className={cn('rounded-lg border p-4 text-center', color)}>
                  <p className="text-2xl font-bold">{statusCounts[key] || 0}</p>
                  <p className="text-xs font-medium mt-1">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
