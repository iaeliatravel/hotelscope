'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MapPin, Loader2, ExternalLink, Search } from 'lucide-react'

interface LocationPickerProps {
  address: string
  latitude: number | null
  longitude: number | null
  onChange: (data: { address: string; latitude: number | null; longitude: number | null; mapStaticUrl: string | null; googleMapsUrl: string | null }) => void
}

declare global {
  interface Window {
    google: any
    initGoogleMaps?: () => void
  }
}

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

export function LocationPicker({ address, latitude, longitude, onChange }: LocationPickerProps) {
  const [query, setQuery] = useState(address || '')
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [searching, setSearching] = useState(false)
  const [predictions, setPredictions] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const autocompleteServiceRef = useRef<any>(null)
  const placesServiceRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load Google Maps script once
  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) return
    if (window.google?.maps) {
      setScriptLoaded(true)
      return
    }
    if (document.getElementById('google-maps-script')) {
      const check = setInterval(() => {
        if (window.google?.maps) {
          setScriptLoaded(true)
          clearInterval(check)
        }
      }, 200)
      return () => clearInterval(check)
    }

    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`
    script.async = true
    script.onload = () => setScriptLoaded(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (scriptLoaded && window.google?.maps?.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
      const dummyDiv = document.createElement('div')
      placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv)
    }
  }, [scriptLoaded])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  function handleInputChange(value: string) {
    setQuery(value)
    if (!value.trim() || !autocompleteServiceRef.current) {
      setPredictions([])
      return
    }
    setSearching(true)
    autocompleteServiceRef.current.getPlacePredictions(
      { input: value, types: ['lodging', 'establishment'] },
      (results: any[], status: string) => {
        setSearching(false)
        if (status === 'OK' && results) {
          setPredictions(results)
          setShowDropdown(true)
        } else {
          setPredictions([])
        }
      }
    )
  }

  function selectPlace(placeId: string, description: string) {
    if (!placesServiceRef.current) return
    setSearching(true)
    placesServiceRef.current.getDetails(
      { placeId, fields: ['geometry', 'formatted_address', 'name'] },
      (place: any, status: string) => {
        setSearching(false)
        setShowDropdown(false)
        if (status === 'OK' && place?.geometry?.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          const formattedAddress = place.formatted_address || description
          setQuery(formattedAddress)

          const mapStaticUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=640x400&maptype=satellite&markers=color:red%7C${lat},${lng}&key=${GOOGLE_MAPS_KEY}`
          const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`

          onChange({
            address: formattedAddress,
            latitude: lat,
            longitude: lng,
            mapStaticUrl,
            googleMapsUrl,
          })
        }
      }
    )
  }

  function clearLocation() {
    setQuery('')
    setPredictions([])
    onChange({ address: '', latitude: null, longitude: null, mapStaticUrl: null, googleMapsUrl: null })
  }

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div className="space-y-1.5">
        <Label>Adresse / Localisation</Label>
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); onChange({ address: e.target.value, latitude, longitude, mapStaticUrl: null, googleMapsUrl: null }) }}
          placeholder="Adresse de l'hôtel…"
        />
        <p className="text-xs text-amber-600">
          Clé Google Maps non configurée — saisie manuelle uniquement. Ajoutez NEXT_PUBLIC_GOOGLE_MAPS_API_KEY pour activer l'autocomplete et la capture satellite.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label>Adresse / Localisation</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          placeholder="Rechercher l'hôtel sur Google Maps…"
          className="pl-9 pr-9"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}

        {showDropdown && predictions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {predictions.map((p) => (
              <button
                key={p.place_id}
                type="button"
                onClick={() => selectPlace(p.place_id, p.description)}
                className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors border-b last:border-0 flex items-start gap-2"
              >
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{p.structured_formatting?.main_text}</p>
                  <p className="text-xs text-muted-foreground">{p.structured_formatting?.secondary_text}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {latitude && longitude && (
        <div className="rounded-lg border overflow-hidden">
          <img
            src={`https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=18&size=640x300&maptype=satellite&markers=color:red%7C${latitude},${longitude}&key=${GOOGLE_MAPS_KEY}`}
            alt="Vue satellite de l'hôtel"
            className="w-full h-48 object-cover"
          />
          <div className="flex items-center justify-between p-2.5 bg-muted/30 text-xs">
            <span className="text-muted-foreground">
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </span>
            <div className="flex items-center gap-3">
              <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                Voir sur Google Maps <ExternalLink className="w-3 h-3" />
              </a>
              <button type="button" onClick={clearLocation} className="text-destructive hover:underline">
                Effacer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
