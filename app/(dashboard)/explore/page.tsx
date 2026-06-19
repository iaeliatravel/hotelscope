'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { ScoreBadge, StarRating } from '@/components/scores/score-badge'
import { getStatusConfig, BOARD_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Search, MapPin, ChevronRight, Globe, Waves,
  Loader2, ExternalLink, Map
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

const COUNTRY_FLAGS: Record<string, string> = {
  'Maroc': '🇲🇦', 'Tunisie': '🇹🇳', 'Algérie': '🇩🇿', 'Égypte': '🇪🇬',
  'Turquie': '🇹🇷', 'Grèce': '🇬🇷', 'Espagne': '🇪🇸', 'France': '🇫🇷',
}

const AMBIANCES = [
  { value: 'familial', label: 'Familial', icon: '👨‍👩‍👧' },
  { value: 'romantique', label: 'Romantique', icon: '❤️' },
  { value: 'festif', label: 'Festif', icon: '🎉' },
  { value: 'calme', label: 'Calme', icon: '🧘' },
  { value: 'luxe', label: 'Luxe', icon: '✨' },
  { value: 'sportif', label: 'Sportif', icon: '⚽' },
]

// Build a static satellite map centered on a set of hotels
function buildGroupMapUrl(hotels: any[], zoom = 13, size = '800x350'): string {
  if (!API_KEY || hotels.length === 0) return ''
  const withCoords = hotels.filter(h => h.latitude && h.longitude)
  if (withCoords.length === 0) return ''

  // Center = average lat/lng
  const lat = withCoords.reduce((s: number, h: any) => s + h.latitude, 0) / withCoords.length
  const lng = withCoords.reduce((s: number, h: any) => s + h.longitude, 0) / withCoords.length

  const markers = withCoords.slice(0, 20).map(
    (h: any) => `markers=color:red%7Clabel:H%7C${h.latitude},${h.longitude}`
  ).join('&')

  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=satellite&${markers}&key=${API_KEY}`
}

export default function ExplorePage() {
  const [countries, setCountries] = useState<string[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [zones, setZones] = useState<any[]>([])
  const [hotels, setHotels] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [mapImgError, setMapImgError] = useState(false)

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<any | null>(null)
  const [selectedZone, setSelectedZone] = useState<any | null>(null)
  const [search, setSearch] = useState('')
  const [filterStars, setFilterStars] = useState<string>('')
  const [filterAmbiance, setFilterAmbiance] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    supabase.from('cities').select('country').eq('is_active', true).then(({ data }) => {
      const unique = Array.from(new Set((data || []).map((c: any) => c.country as string))).sort()
      setCountries(unique)
    })
  }, [])

  useEffect(() => {
    if (!selectedCountry) { setCities([]); return }
    setSelectedCity(null); setSelectedZone(null); setHotels([])
    supabase.from('cities').select('*').eq('country', selectedCountry).eq('is_active', true).order('name')
      .then(({ data }) => setCities(data || []))
  }, [selectedCountry])

  useEffect(() => {
    if (!selectedCity) { setZones([]); return }
    setSelectedZone(null)
    supabase.from('zones').select('*').eq('city_id', selectedCity.id).eq('is_active', true).order('name')
      .then(({ data }) => setZones(data || []))
    loadHotels(selectedCity.id, null)
  }, [selectedCity])

  useEffect(() => {
    if (!selectedCity) return
    setMapImgError(false)
    loadHotels(selectedCity.id, selectedZone?.id || null)
  }, [selectedZone, filterStars, filterAmbiance])

  async function loadHotels(cityId: string, zoneId: string | null) {
    setLoading(true)
    let q = supabase
      .from('hotels')
      .select('*, zone:zones(name), scores:hotel_scores(*), media:hotel_media(url, type)')
      .eq('city_id', cityId)
      .eq('is_deleted', false)
      .neq('status', 'non_recommande')
      .order('global_score', { ascending: false })

    if (zoneId) q = q.eq('zone_id', zoneId)
    if (filterStars) q = q.eq('category', filterStars)
    if (filterAmbiance) q = q.eq('ambiance', filterAmbiance)

    const { data } = await q
    setHotels(data || [])
    setLoading(false)
  }

  const filteredHotels = search.trim()
    ? hotels.filter(h =>
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.zone?.name?.toLowerCase().includes(search.toLowerCase()))
    : hotels

  const hotelsWithCoords = filteredHotels.filter(h => h.latitude && h.longitude)
  const groupMapUrl = buildGroupMapUrl(filteredHotels)

  function reset() {
    setSelectedCountry(null); setSelectedCity(null); setSelectedZone(null)
    setHotels([]); setCities([]); setZones([]); setSearch('')
    setFilterStars(''); setFilterAmbiance('')
  }

  return (
    <div className="min-h-screen">
      <Header title="Explorer" description="Parcourez les destinations et hôtels" />

      <div className="page-container space-y-6">

        {/* Hero — shown when no country selected */}
        {!selectedCountry && (
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-8 sm:p-12 text-white text-center shadow-xl">
            <div className="text-5xl mb-4">🌍</div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Où souhaitez-vous aller ?</h2>
            <p className="text-blue-200 text-sm">Sélectionnez une destination pour explorer les hôtels</p>
          </div>
        )}

        {/* Breadcrumb */}
        {(selectedCountry || selectedCity) && (
          <div className="flex items-center gap-1.5 flex-wrap text-sm">
            <button onClick={reset} className="text-primary hover:underline font-medium flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />Destinations
            </button>
            {selectedCountry && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                <button
                  onClick={() => { setSelectedCity(null); setSelectedZone(null); setHotels([]) }}
                  className={cn('font-medium', !selectedCity ? 'text-foreground' : 'text-primary hover:underline')}
                >
                  {COUNTRY_FLAGS[selectedCountry] || '🌍'} {selectedCountry}
                </button>
              </>
            )}
            {selectedCity && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                <button
                  onClick={() => { setSelectedZone(null); setFilterStars(''); setFilterAmbiance(''); loadHotels(selectedCity.id, null) }}
                  className={cn('font-medium', !selectedZone ? 'text-foreground' : 'text-primary hover:underline')}
                >
                  {selectedCity.name}
                </button>
              </>
            )}
            {selectedZone && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">{selectedZone.name}</span>
              </>
            )}
          </div>
        )}

        {/* Country grid */}
        {!selectedCountry && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Choisir un pays</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {countries.map(country => (
                <button key={country} onClick={() => setSelectedCountry(country)}
                  className="group p-5 rounded-2xl border-2 bg-white hover:border-primary hover:shadow-lg transition-all text-left"
                >
                  <div className="text-3xl mb-2">{COUNTRY_FLAGS[country] || '🌍'}</div>
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">{country}</p>
                </button>
              ))}
              {countries.length === 0 && (
                <p className="col-span-full text-sm text-muted-foreground text-center py-12">
                  Aucune destination disponible. Commencez par ajouter des villes.
                </p>
              )}
            </div>
          </div>
        )}

        {/* City grid */}
        {selectedCountry && !selectedCity && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              Villes — {selectedCountry}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {cities.map(city => (
                <button key={city.id} onClick={() => setSelectedCity(city)}
                  className="group p-6 rounded-2xl border-2 bg-white hover:border-primary hover:shadow-lg transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <p className="font-bold text-base group-hover:text-primary">{city.name}</p>
                  {city.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{city.description}</p>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hotels view — with satellite map */}
        {selectedCity && (
          <div className="space-y-5">

            {/* SATELLITE MAP of the city/zone with hotel pins */}
            {groupMapUrl && !mapImgError && (
              <div className="rounded-2xl border overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Map className="w-4 h-4 text-primary" />
                    Vue satellite — {selectedZone?.name || selectedCity.name}
                    <span className="text-xs text-muted-foreground">
                      ({hotelsWithCoords.length} hôtel{hotelsWithCoords.length > 1 ? 's' : ''} localisé{hotelsWithCoords.length > 1 ? 's' : ''})
                    </span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/hotels/@${
                      hotelsWithCoords.reduce((s: number, h: any) => s + h.latitude, 0) / (hotelsWithCoords.length || 1)
                    },${
                      hotelsWithCoords.reduce((s: number, h: any) => s + h.longitude, 0) / (hotelsWithCoords.length || 1)
                    },14z`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Ouvrir Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <img
                  src={groupMapUrl}
                  alt={`Carte satellite ${selectedCity.name}`}
                  className="w-full h-56 sm:h-72 object-cover"
                  onError={() => setMapImgError(true)}
                />
                {hotelsWithCoords.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground bg-white/80 rounded-lg px-3 py-1.5">
                      Aucun hôtel avec coordonnées GPS — ajoutez la localisation dans les fiches
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Map placeholder if no API key */}
            {!API_KEY && selectedCity && (
              <div className="rounded-2xl border bg-muted/30 p-6 text-center">
                <Map className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Carte satellite disponible avec une clé Google Maps API</p>
              </div>
            )}

            {/* Zone pills */}
            {zones.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Zones</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSelectedZone(null)}
                    className={cn('px-4 py-2 rounded-full text-sm border font-medium transition-all',
                      !selectedZone ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-input hover:border-primary/40')}>
                    Toutes
                  </button>
                  {zones.map(zone => (
                    <button key={zone.id} onClick={() => setSelectedZone(zone)}
                      className={cn('px-4 py-2 rounded-full text-sm border font-medium transition-all',
                        selectedZone?.id === zone.id ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-input hover:border-primary/40')}>
                      {zone.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un hôtel…" className="pl-9" />
              </div>
              {['5','4','3'].map(s => (
                <button key={s} onClick={() => setFilterStars(filterStars === s ? '' : s)}
                  className={cn('px-3 py-2 rounded-lg text-sm border font-medium transition-all',
                    filterStars === s ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-sm' : 'bg-white border-input hover:border-primary/40')}>
                  {s}★
                </button>
              ))}
              {AMBIANCES.map(a => (
                <button key={a.value} onClick={() => setFilterAmbiance(filterAmbiance === a.value ? '' : a.value)}
                  className={cn('px-3 py-2 rounded-lg text-sm border font-medium transition-all',
                    filterAmbiance === a.value ? 'bg-primary/10 text-primary border-primary/30 shadow-sm' : 'bg-white border-input hover:border-primary/40')}>
                  {a.icon} {a.label}
                </button>
              ))}
            </div>

            {/* Count */}
            <p className="text-sm text-muted-foreground">
              {loading ? 'Chargement…' : `${filteredHotels.length} hôtel${filteredHotels.length > 1 ? 's' : ''}`}
              {selectedZone && ` · ${selectedZone.name}`}
              {filterStars && ` · ${filterStars}★`}
              {filterAmbiance && ` · ${filterAmbiance}`}
            </p>

            {/* Hotel cards */}
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredHotels.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <span className="text-5xl mb-4">🏖️</span>
                <p className="font-medium">Aucun hôtel trouvé</p>
                <p className="text-sm text-muted-foreground mt-1">Modifiez vos filtres ou ajoutez des hôtels</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHotels.map((hotel: any) => {
                  const statusConfig = getStatusConfig(hotel.status)
                  const coverImg = hotel.media?.find((m: any) => m.type === 'image')?.url
                    || (hotel.latitude && hotel.longitude && API_KEY
                      ? `https://maps.googleapis.com/maps/api/staticmap?center=${hotel.latitude},${hotel.longitude}&zoom=18&size=400x300&maptype=satellite&markers=color:red%7C${hotel.latitude},${hotel.longitude}&key=${API_KEY}`
                      : null)
                  const starsNum = parseInt(hotel.category) || 0

                  return (
                    <Link key={hotel.id} href={`/hotels/${hotel.id}`}>
                      <div className="group bg-white rounded-2xl border hover:border-primary/30 hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col sm:flex-row">
                        {/* Image / Map */}
                        <div className="sm:w-64 h-44 sm:h-auto flex-shrink-0 relative overflow-hidden bg-muted">
                          {coverImg ? (
                            <img src={coverImg} alt={hotel.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
                              <span className="text-4xl opacity-20">🏨</span>
                            </div>
                          )}
                          {hotel.global_score && (
                            <div className="absolute top-3 left-3">
                              <ScoreBadge score={hotel.global_score} size="md" />
                            </div>
                          )}
                          {hotel.latitude && hotel.longitude && (
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />GPS
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="min-w-0">
                                <h3 className="font-bold text-base sm:text-lg leading-tight group-hover:text-primary transition-colors truncate">
                                  {hotel.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {starsNum > 0 && <StarRating stars={starsNum} />}
                                  {hotel.ambiance && (
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">{hotel.ambiance}</span>
                                  )}
                                </div>
                              </div>
                              <span className={cn('text-xs px-2.5 py-1 rounded-md border font-medium flex-shrink-0', statusConfig.class)}>
                                {statusConfig.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 flex-wrap">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{selectedCity.name}</span>
                              {hotel.zone?.name && <><span>·</span><span>{hotel.zone.name}</span></>}
                              {hotel.beach_distance && <><span>·</span><Waves className="w-3 h-3" /><span>{hotel.beach_distance}</span></>}
                            </div>

                            {hotel.commercial_summary && (
                              <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed line-clamp-2">
                                {hotel.commercial_summary}
                              </p>
                            )}

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

                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <div className="flex flex-wrap gap-1.5">
                              {(hotel.board_types || []).slice(0, 2).map((bt: string) => (
                                <span key={bt} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded">
                                  {BOARD_LABELS[bt as keyof typeof BOARD_LABELS] || bt}
                                </span>
                              ))}
                            </div>
                            <span className="text-xs text-primary font-semibold group-hover:underline flex-shrink-0">
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
