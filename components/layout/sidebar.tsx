'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Building2, MapPin, Hotel, Star,
  MessageSquare, TrendingUp, Users, Activity,
  Settings, LogOut, ChevronRight, Globe, Compass,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Profile } from '@/lib/types'

const navGroups = [
  {
    label: null,
    items: [
      { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      { href: '/explore', label: 'Explorer', icon: Compass },
    ]
  },
  {
    label: 'Catalogue',
    items: [
      { href: '/cities', label: 'Villes', icon: Globe },
      { href: '/zones', label: 'Zones', icon: MapPin },
      { href: '/hotels', label: 'Hôtels', icon: Hotel },
      { href: '/compare', label: 'Comparer', icon: Star },
    ]
  },
  {
    label: 'Analyse',
    items: [
      { href: '/reviews', label: 'Avis & Synthèses', icon: MessageSquare },
      { href: '/prices', label: 'Suivi des prix', icon: TrendingUp },
      { href: '/profiles', label: 'Profils clients', icon: Users },
    ]
  },
  {
    label: 'Système',
    items: [
      { href: '/activity', label: 'Activité', icon: Activity },
      { href: '/settings', label: 'Paramètres', icon: Settings },
    ]
  }
]

interface SidebarProps {
  profile: Profile | null
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-[240px] bg-white border-r flex flex-col hidden md:flex">
        {/* Logo */}
        <div className="px-5 py-5 border-b">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shadow-sm shadow-primary/30">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-foreground tracking-tight block leading-none">HotelScope</span>
              <span className="text-[10px] text-muted-foreground">Aelia Travel</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 mb-1.5">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        isActive
                          ? 'bg-primary text-white shadow-sm shadow-primary/25'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t">
          {profile && (
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary">
                  {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile.full_name || 'Utilisateur'}</p>
                <p className="text-xs text-muted-foreground capitalize truncate">{profile.role}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t flex items-center justify-around px-2 py-2">
        {[
          { href: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
          { href: '/explore', icon: Compass, label: 'Explorer' },
          { href: '/hotels', icon: Hotel, label: 'Hôtels' },
          { href: '/prices', icon: TrendingUp, label: 'Prix' },
          { href: '/settings', icon: Settings, label: 'Config' },
        ].map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-0',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
