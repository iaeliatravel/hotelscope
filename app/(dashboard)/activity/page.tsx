import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Activity } from 'lucide-react'
import { formatRelative, formatDate } from '@/lib/utils'

export default async function ActivityPage() {
  const supabase = createClient()

  const { data: logs } = await supabase
    .from('activity_log')
    .select('*, user:profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100)

  const grouped = (logs || []).reduce((acc: Record<string, any[]>, log: any) => {
    const day = new Date(log.created_at).toDateString()
    if (!acc[day]) acc[day] = []
    acc[day].push(log)
    return acc
  }, {})

  return (
    <div>
      <Header title="Journal d'activité" description="Historique des actions effectuées sur la plateforme" />

      <div className="page-container max-w-3xl space-y-6">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Aucune activité enregistrée</p>
          </div>
        ) : (
          Object.entries(grouped).map(([day, entries]) => (
            <div key={day}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {formatDate(new Date(day))}
              </p>
              <Card>
                <CardContent className="p-0 divide-y">
                  {(entries as any[]).map((log: any) => (
                    <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-muted/20 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">
                          {(log.user?.full_name || log.user?.email || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{log.user?.full_name || log.user?.email || 'Système'}</span>
                          {' '}
                          <span className="text-muted-foreground">{log.action}</span>
                          {log.entity_name && (
                            <span className="font-medium"> « {log.entity_name} »</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {log.entity_type && (
                            <span className="capitalize bg-muted px-1.5 py-0.5 rounded mr-2">{log.entity_type}</span>
                          )}
                          {formatRelative(log.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
