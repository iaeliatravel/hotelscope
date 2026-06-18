'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { ScoreBadge, StarRating } from '@/components/scores/score-badge'
import { getStatusConfig, BOARD_LABELS } from '@/lib/types'
import { cn, truncate } from '@/lib/utils'
import { Search, MapPin, ChevronRight, Globe, Star, Waves, X, SlidersHorizontal, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ExplorePage() {
  const [countries, setCountries] = useState<string[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [zones, setZones] = useState<any[]>([])
  const [hotels, setHotels] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<any | null>(null)
  const [selectedZone, setSelectedZone] = useState<any | null>(null)
  const [search, setSearch] = useState('')
  const [filterStars, setFilterStars] = useState<string>('')
  const [filterAmbiance, setFilterAmbiance] = useState<string>('')

  const supabase = createClient()

  // Load countries on mount
  useEffect(() => {
    supabase.from('cities').select('country').eq('is_active', true).then(({ data }) => {
      const unique = Array.from(new Set((data || []).map((c: any) => c.country as string))).sort()
      setCountries(unique)
    })
  }, [])

  // Load cities when country selected
  useEffect(() => {
    if (!selectedCountry) { setCities([]); return }
    setSelectedCity(null); setSelectedZone(null); setHotels([])
    supabase.from('cities').select('*').eq('country', selectedCountry).eq('is_active', true).order('name')
      .then(({ data }) => setCities(data || []))
  }, [selectedCountry])

  // Load zones when city selected
  useEffect(() => {
    if (!selectedCity) { setZones([]); return }
    setSelectedZone(null); setHotels([])
    supabase.from('zones').select('*').eq('city_id', selectedCity.id).eq('is_active', true).order('name')
      .then(({ data }) => setZones(data || []))
    loadHotels(selectedCity.id, null)
  }, [selectedCity])

  // Load hotels when zone selected
  useEffect(() => {
    if (!selectedCity) return
    loadHotels(selectedCity.id, selectedZone?.id || null)
  }, [selectedZone, filterStars, filterAmbiance])

  async function loadHotels(cityId: string, zoneId: string | null) {
    setLoading(true)
    let q = supabase
      .from('hotels')
      .select('*, zone:zones(name), scores:hotel_scores(*), media:hotel_media(url, type)')
      .eq('city_id', cityId)
      .eq('is_deleted', false)
      .eq('status', 'actif')
      .order('global_score', { ascending: false })

    if (zoneId) q = q.eq('zone_id', zoneId)
    if (filterStars) q = q.eq('category', filterStars)
    if (filterAmbiance) q = q.eq('ambiance', filterAmbiance)

    const { data } = await q
    setHotels(data || [])
    setLoading(false)
  }

  const filteredHotels = search.trim()
    ? hotels.filter(h => h.name.toLowerCase().includes(search.toLowerCase()) || h.zone?.name?.toLowerCase().includes(search.toLowerCase()))
    : hotels

  function reset() {
    setSelectedCountry(null); setSelectedCity(null); setSelectedZone(null)
    setHotels([]); setCities([]); setZones([]); setSearch('')
  }

  const AMBIANCES = [
    { value: 'familial', label: 'Familial', icon: '👨‍👩‍👧' },
    { value: 'romantique', label: 'Romantique', icon: '❤️' },
    { value: 'festif', label: 'Festif', icon: '🎉' },
    { value: 'calme', label: 'Calme', icon: '🧘' },
    { value: 'luxe', label: 'Luxe', icon: '✨' },
    { value: 'sportif', label: 'Sportif', icon: '⚽' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-background">
      <Header title="Explorer" description="Parcourez les destinations et hôtels" />

      <div className="page-container space-y-8">
        {/* Hero search bar */}
        {!selectedCity && (
          <div className="rounded-2xl bg-gradient-to-br from-primary to-blue-700 p-8 text-white text-center shadow-lg">
            <h2 className="text-2xl font-bold mb-2">Où souhaitez-vous aller ?</h2>
            <p className="text-blue-100 text-sm mb-6">Sélectionnez une destination pour explorer les hôtels disponibles</p>
          </div>
        )}

        {/* Breadcrumb navigation */}
        {(selectedCountry || selectedCity || selectedZone) && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={reset} className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />Toutes destinations
            </button>
            {selectedCountry && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                <button
                  onClick={() => { setSelectedCity(null); setSelectedZone(null); setHotels([]) }}
                  className={cn('text-sm font-medium', !selectedCity ? 'text-foreground' : 'text-primary hover:underline')}
                >
                  {selectedCountry}
                </button>
              </>
            )}
            {selectedCity && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                <button
                  onClick={() => { setSelectedZone(null); loadHotels(selectedCity.id, null) }}
                  className={cn('text-sm font-medium', !selectedZone ? 'text-foreground' : 'text-primary hover:underline')}
                >
                  {selectedCity.name}
                </button>
              </>
            )}
            {selectedZone && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{selectedZone.name}</span>
              </>
            )}
          </div>
        )}

        {/* Country selection */}
        {!selectedCountry && (
          <div>
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />Choisir un pays
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {countries.map(country => (
                <button
                  key={country}
                  onClick={() => setSelectedCountry(country)}
                  className="group p-5 rounded-xl border-2 bg-white hover:border-primary hover:shadow-md transition-all text-left"
                >
                  <div className="text-3xl mb-2">
                    {country === 'Maroc' ? '🇲🇦' : country === 'Tunisie' ? '🇹🇳' : country === 'Algérie' ? '🇩🇿' : country === 'Égypte' ? '🇪🇬' : '🌍'}
                  </div>
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{country}</p>
                </button>
              ))}
              {countries.length === 0 && (
                <p className="col-span-full text-sm text-muted-foreground text-center py-8">Aucun pays disponible. Ajoutez des villes pour commencer.</p>
              )}
            </div>
          </div>
        )}

        {/* City selection */}
        {selectedCountry && !selectedCity && (
          <div>
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />Villes au {selectedCountry}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {cities.map(city => (
                <button
                  key={city.id}
                  onClick={() => setSelectedCity(city)}
                  className="group p-5 rounded-xl border-2 bg-white hover:border-primary hover:shadow-md transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground group-hover:text-primary">{city.name}</p>
                  {city.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{city.description}</p>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hotels view */}
        {selectedCity && (
          <div className="space-y-6">
            {/* Zone pills */}
            {zones.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Filtrer par zone</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedZone(null)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm border transition-all',
                      !selectedZone ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-input hover:border-primary/40'
                    )}
                  >
                    Toutes les zones
                  </button>
                  {zones.map(zone => (
                    <button
                      key={zone.id}
                      onClick={() => setSelectedZone(zone)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm border transition-all',
                        selectedZone?.id === zone.id ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-input hover:border-primary/40'
                      )}
                    >
                      {zone.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filters row */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un hôtel…" className="pl-9" />
              </div>
              {/* Stars filter */}
              <div className="flex gap-1">
                {['5','4','3'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStars(filterStars === s ? '' : s)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm border transition-all',
                      filterStars === s ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-white border-input hover:border-primary/40'
                    )}
                  >
                    {s}★
                  </button>
                ))}
              </div>
              {/* Ambiance filter */}
              <div className="flex gap-1 flex-wrap">
                {AMBIANCES.map(a => (
                  <button
                    key={a.value}
                    onClick={() => setFilterAmbiance(filterAmbiance === a.value ? '' : a.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm border transition-all',
                      filterAmbiance === a.value ? 'bg-primary/10 text-primary border-primary/30' : 'bg-white border-input hover:border-primary/40'
                    )}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results header */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {loading ? 'Chargement…' : `${filteredHotels.length} hôtel${filteredHotels.length > 1 ? 's' : ''} trouvé${filteredHotels.length > 1 ? 's' : ''}`}
                {selectedZone && ` dans ${selectedZone.name}`}
              </p>
            </div>

            {/* Hotel cards — Booking style */}
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredHotels.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 text-3xl">🏖️</div>
                <p className="font-medium">Aucun hôtel trouvé</p>
                <p className="text-sm text-muted-foreground mt-1">Essayez de modifier vos filtres</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHotels.map((hotel: any) => {
                  const statusConfig = getStatusConfig(hotel.status)
                  const coverImg = hotel.media?.find((m: any) => m.type === 'image')?.url || hotel.map_static_url
                  const starsNum = parseInt(hotel.category) || 0

                  return (
                    <Link key={hotel.id} href={`/hotels/${hotel.id}`}>
                      <div className="group bg-white rounded-2xl border hover:border-primary/20 hover:shadow-lg transition-all overflow-hidden flex flex-col sm:flex-row">
                        {/* Image */}
                        <div className="sm:w-64 h-48 sm:h-auto bg-muted flex-shrink-0 relative overflow-hidden">
                          {coverImg ? (
                            <img src={coverImg} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
                              <span className="text-5xl opacity-30">🏨</span>
                            </div>
                          )}
                          {hotel.global_score && (
                            <div className="absolute top-3 left-3">
                              <ScoreBadge score={hotel.global_score} size="md" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <div>
                                <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                                  {hotel.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  {starsNum > 0 && <StarRating stars={starsNum} />}
                                  {hotel.ambiance && (
                                    <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-full">
                                      {hotel.ambiance}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={cn('text-xs px-2.5 py-1 rounded-md border font-medium flex-shrink-0', statusConfig.class)}>
                                {statusConfig.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{selectedCity.name}</span>
                              {hotel.zone?.name && <><span>·</span><span>{hotel.zone.name}</span></>}
                              {hotel.beach_distance && <><span>·</span><Waves className="w-3 h-3" /><span>Plage {hotel.beach_distance}</span></>}
                            </div>

                            {hotel.commercial_summary && (
                              <p className="text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-2">
                                {hotel.commercial_summary}
                              </p>
                            )}

                            {/* Strengths preview */}
                            {hotel.strengths?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {hotel.strengths.slice(0, 3).map((s: string, i: number) => (
                                  <span key={i} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                                    ✓ {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-3 border-t">
                            <div className="flex flex-wrap gap-1.5">
                              {(hotel.board_types || []).slice(0, 2).map((bt: string) => (
                                <span key={bt} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded">
                                  {BOARD_LABELS[bt as keyof typeof BOARD_LABELS] || bt}
                                </span>
                              ))}
                            </div>
                            <span className="text-xs text-primary font-semibold group-hover:underline">
                              Voir la fiche →
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
