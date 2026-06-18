import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import type { Profile } from '@/lib/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar profile={profile as Profile} />
      {/* Desktop: left padding for sidebar. Mobile: bottom padding for nav bar */}
      <main className="md:pl-[240px] pb-20 md:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
