'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HotelCard } from '@/components/hotels/hotel-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Hotel, Plus, Search, SlidersHorizontal, Loader2, LayoutGrid, List } from 'lucide-react'
import type { Hotel as HotelType, City, Zone } from '@/lib/types'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getStatusConfig } from '@/lib/types'

const STATUSES = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'actif', label: 'Actif' },
  { value: 'en_veille', label: 'En veille' },
  { value: 'a_verifier', label: 'À vérifier' },
  { value: 'non_recommande', label: 'Non recommandé' },
]

const STARS = [
  { value: 'all', label: 'Toutes catégories' },
  { value: '5', label: '5 étoiles' },
  { value: '4', label: '4 étoiles' },
  { value: '3', label: '3 étoiles' },
  { value: '2', label: '1-2 étoiles' },
  { value: 'resort', label: 'Resort / Apart / Riad' },
]

export default function HotelsPage() {
  const [hotels, setHotels] = useState<HotelType[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('all')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [starsFilter, setStarsFilter] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const supabase = createClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    const s = searchParams.get('status')
    if (s) setStatusFilter(s)
  }, [searchParams])

  async function loadMeta() {
    const [{ data: c }, { data: z }] = await Promise.all([
      supabase.from('cities').select('*').eq('is_active', true).order('name'),
      supabase.from('zones').select('*').eq('is_active', true).order('name'),
    ])
    setCities(c as City[] || [])
    setZones(z as Zone[] || [])
  }

  async function loadHotels() {
    setLoading(true)
    let query = supabase
      .from('hotels')
      .select('*, city:cities(name), zone:zones(name), scores:hotel_scores(*)')
      .eq('is_deleted', false)
      .order('name')

    if (cityFilter !== 'all') query = query.eq('city_id', cityFilter)
    if (zoneFilter !== 'all') query = query.eq('zone_id', zoneFilter)
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    if (starsFilter !== 'all') {
      if (starsFilter === 'resort') {
        query = query.in('category', ['resort', 'apart', 'riad'])
      } else if (starsFilter === '2') {
        query = query.in('category', ['1', '2'])
      } else {
        query = query.eq('category', starsFilter)
      }
    }

    const { data } = await query
    let result = (data as HotelType[]) || []

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.city?.name?.toLowerCase().includes(q) ||
        h.zone?.name?.toLowerCase().includes(q) ||
        h.commercial_summary?.toLowerCase().includes(q)
      )
    }

    setHotels(result)
    setLoading(false)
  }

  useEffect(() => { loadMeta() }, [])
  useEffect(() => { loadHotels() }, [cityFilter, zoneFilter, statusFilter, starsFilter])

  const filteredZones = cityFilter !== 'all'
    ? zones.filter(z => z.city_id === cityFilter)
    : zones

  const displayedHotels = search.trim()
    ? hotels.filter(h => {
        const q = search.toLowerCase()
        return h.name.toLowerCase().includes(q) ||
          h.city?.name?.toLowerCase().includes(q) ||
          h.zone?.name?.toLowerCase().includes(q)
      })
    : hotels

  return (
    <div>
      <Header
        title="Hôtels"
        description={`${hotels.length} hôtel${hotels.length > 1 ? 's' : ''} référencé${hotels.length > 1 ? 's' : ''}`}
        actions={
          <Link href="/hotels/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />Ajouter
            </Button>
          </Link>
        }
      />

      <div className="page-container space-y-6">
        {/* Search + Filters bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un hôtel, une ville…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersOpen(o => !o)}
              className={cn(filtersOpen && 'border-primary text-primary')}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />Filtres
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')}
            >
              {view === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Filters panel */}
        {filtersOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-xl border">
            <Select value={cityFilter} onValueChange={v => { setCityFilter(v); setZoneFilter('all') }}>
              <SelectTrigger><SelectValue placeholder="Ville" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les villes</SelectItem>
                {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger><SelectValue placeholder="Zone" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les zones</SelectItem>
                {filteredZones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={starsFilter} onValueChange={setStarsFilter}>
              <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                {STARS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayedHotels.length === 0 ? (
          <EmptyState
            icon={Hotel}
            title="Aucun hôtel trouvé"
            description="Modifiez vos filtres ou ajoutez un nouvel hôtel."
            action={{ label: 'Ajouter un hôtel', onClick: () => window.location.href = '/hotels/new' }}
          />
        ) : (
          <div className={cn(
            view === 'grid'
              ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'flex flex-col gap-3'
          )}>
            {displayedHotels.map(hotel => (
              <HotelCard key={hotel.id} hotel={hotel} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
