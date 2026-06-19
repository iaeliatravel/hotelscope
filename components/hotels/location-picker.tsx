'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2, ExternalLink, Search, X } from 'lucide-react'

interface LocationData {
  address: string
  latitude: number | null
  longitude: number | null
  mapStaticUrl: string | null
  googleMapsUrl: string | null
}

interface LocationPickerProps {
  address: string
  latitude: number | null
  longitude: number | null
  onChange: (data: LocationData) => void
}

declare global {
  interface Window {
    google: any
    hotelScopeGoogleReady?: boolean
    hotelScopeGoogleCallbacks?: (() => void)[]
  }
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

function buildStaticMapUrl(lat: number, lng: number): string {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=640x300&maptype=satellite&markers=color:red%7C${lat},${lng}&key=${API_KEY}`
}

export function LocationPicker({ address, latitude, longitude, onChange }: LocationPickerProps) {
  const [query, setQuery] = useState(address || '')
  const [ready, setReady] = useState(false)
  const [searching, setSearching] = useState(false)
  const [predictions, setPredictions] = useState<any[]>([])
  const [showDrop, setShowDrop] = useState(false)
  const [imgError, setImgError] = useState(false)
  const autoRef = useRef<any>(null)
  const placesRef = useRef<any>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Load Google Maps script
  useEffect(() => {
    if (!API_KEY) return

    function onReady() {
      if (!window.google?.maps?.places) return
      autoRef.current = new window.google.maps.places.AutocompleteService()
      const div = document.createElement('div')
      placesRef.current = new window.google.maps.places.PlacesService(div)
      setReady(true)
    }

    if (window.google?.maps?.places) {
      onReady()
      return
    }

    // Queue callback
    if (!window.hotelScopeGoogleCallbacks) window.hotelScopeGoogleCallbacks = []
    window.hotelScopeGoogleCallbacks.push(onReady)

    if (document.getElementById('hs-gmaps')) {
      // Script already loading, just wait
      const iv = setInterval(() => {
        if (window.google?.maps?.places) { onReady(); clearInterval(iv) }
      }, 300)
      return () => clearInterval(iv)
    }

    // Define global callback
    ;(window as any).hsGmapsInit = () => {
      window.hotelScopeGoogleCallbacks?.forEach(cb => cb())
    }

    const script = document.createElement('script')
    script.id = 'hs-gmaps'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&callback=hsGmapsInit`
    script.async = true
    script.defer = true
    script.onerror = () => console.error('Google Maps script failed to load. Check your API key.')
    document.head.appendChild(script)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function handleInput(val: string) {
    setQuery(val)
    if (!val.trim() || !ready || !autoRef.current) { setPredictions([]); return }
    setSearching(true)
    autoRef.current.getPlacePredictions(
      { input: val },
      (results: any[], status: string) => {
        setSearching(false)
        if (results && status === window.google.maps.places.PlacesServiceStatus.OK) {
          setPredictions(results)
          setShowDrop(true)
        } else {
          setPredictions([])
        }
      }
    )
  }

  function selectPlace(placeId: string, desc: string) {
    if (!placesRef.current) return
    setSearching(true)
    setShowDrop(false)
    placesRef.current.getDetails(
      { placeId, fields: ['geometry', 'formatted_address', 'name'] },
      (place: any, status: string) => {
        setSearching(false)
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          const addr = place.formatted_address || desc
          setQuery(addr)
          setImgError(false)
          onChange({
            address: addr,
            latitude: lat,
            longitude: lng,
            mapStaticUrl: buildStaticMapUrl(lat, lng),
            googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
          })
        }
      }
    )
  }

  function clear() {
    setQuery('')
    setPredictions([])
    onChange({ address: '', latitude: null, longitude: null, mapStaticUrl: null, googleMapsUrl: null })
  }

  if (!API_KEY) {
    return (
      <div className="space-y-1.5">
        <Label>Adresse / Localisation</Label>
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); onChange({ address: e.target.value, latitude, longitude, mapStaticUrl: null, googleMapsUrl: null }) }}
          placeholder="Adresse de l'hôtel…"
        />
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠️ Clé Google Maps non configurée. Ajoutez <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> dans vos variables d'environnement Vercel.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3" ref={wrapRef}>
      <Label>Localisation (Google Maps)</Label>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => predictions.length > 0 && setShowDrop(true)}
          placeholder={ready ? "Rechercher l'hôtel sur Google Maps…" : "Chargement de Google Maps…"}
          className="pl-9 pr-9"
          disabled={!ready && !latitude}
        />
        {searching ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        ) : query && (
          <button type="button" onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Dropdown suggestions */}
        {showDrop && predictions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-xl max-h-72 overflow-y-auto">
            {predictions.map(p => (
              <button
                key={p.place_id}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => selectPlace(p.place_id, p.description)}
                className="w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors border-b last:border-0 flex items-start gap-3"
              >
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.structured_formatting?.main_text || p.description}</p>
                  {p.structured_formatting?.secondary_text && (
                    <p className="text-xs text-muted-foreground truncate">{p.structured_formatting.secondary_text}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status info */}
      {!ready && API_KEY && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />Chargement de Google Maps…
        </p>
      )}

      {/* Satellite preview */}
      {latitude && longitude && (
        <div className="rounded-xl border overflow-hidden shadow-sm">
          {!imgError ? (
            <img
              src={buildStaticMapUrl(latitude, longitude)}
              alt="Vue satellite"
              className="w-full h-52 object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-52 bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <MapPin className="w-8 h-8 opacity-30" />
              <p className="text-xs">Aperçu carte non disponible</p>
              <p className="text-xs opacity-60">Vérifiez que Maps Static API est activée</p>
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/30 text-xs">
            <span className="text-muted-foreground font-mono">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </span>
            <a
              href={`https://www.google.com/maps?q=${latitude},${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              Ouvrir Maps <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
