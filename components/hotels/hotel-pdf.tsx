'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, FileDown, X } from 'lucide-react'
import { BOARD_LABELS } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import QRCode from 'qrcode'

const AELIA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60">
  <rect width="200" height="60" fill="#1e40af" rx="8"/>
  <text x="100" y="38" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">AELIA TRAVEL</text>
</svg>`

const AELIA_CONTACT = {
  address: 'Algerie',
  phone: '+213 XXX XXX XXX',
  email: 'contact@aeliatravel.com',
  website: 'www.aeliatravel.com',
}

interface HotelPdfProps {
  hotelId: string
  hotelName: string
}

export function HotelPdfButton({ hotelId, hotelName }: HotelPdfProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hotel, setHotel] = useState<any>(null)
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  const printRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  async function loadAndOpen() {
    setLoading(true)
    setOpen(true)
    const { data } = await supabase
      .from('hotels')
      .select(`
        *,
        city:cities(name, country),
        zone:zones(name),
        scores:hotel_scores(*),
        media:hotel_media(*),
        profile_matches:hotel_profile_matches(*, profile:client_profiles(*))
      `)
      .eq('id', hotelId)
      .single()
    setHotel(data)

    // Generate QR codes for video links
    const media = (data as any)?.media || []
    const videos = media.filter((m: any) => m.type === 'social')
    const codes: Record<string, string> = {}
    for (const vid of videos) {
      try {
        codes[vid.id] = await QRCode.toDataURL(vid.url, { width: 80, margin: 1, color: { dark: '#1e40af', light: '#ffffff' } })
      } catch {}
    }
    // Also QR for google maps
    if ((data as any)?.google_maps_url) {
      try {
        codes['maps'] = await QRCode.toDataURL((data as any).google_maps_url, { width: 80, margin: 1, color: { dark: '#1e40af', light: '#ffffff' } })
      } catch {}
    }
    setQrCodes(codes)
    setLoading(false)
  }

  function handlePrint() {
    const content = printRef.current
    if (!content) return

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8"/>
        <title>Fiche hôtel — ${hotel?.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1e293b; background: white; }
          @page { margin: 15mm; size: A4; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }

          .page { max-width: 794px; margin: 0 auto; }

          /* Header */
          .header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: #1e40af; color: white; border-radius: 8px 8px 0 0; margin-bottom: 0; }
          .header-logo { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
          .header-sub { font-size: 10px; opacity: 0.8; margin-top: 2px; }
          .header-contact { text-align: right; font-size: 9px; opacity: 0.9; line-height: 1.6; }

          /* Hero band */
          .hero { background: #f0f5ff; border: 1px solid #bfdbfe; border-top: none; padding: 14px 20px; display: flex; align-items: center; gap: 16px; }
          .hotel-name { font-size: 20px; font-weight: bold; color: #1e3a8a; }
          .hotel-meta { font-size: 10px; color: #64748b; margin-top: 3px; }
          .score-badge { background: #1e40af; color: white; border-radius: 8px; padding: 8px 14px; text-align: center; flex-shrink: 0; }
          .score-num { font-size: 24px; font-weight: bold; }
          .score-label { font-size: 8px; opacity: 0.8; }
          .stars { color: #f59e0b; font-size: 13px; }

          /* Sections */
          .section { margin: 12px 0; }
          .section-title { font-size: 11px; font-weight: bold; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #bfdbfe; padding-bottom: 4px; margin-bottom: 8px; }

          /* Grid */
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }

          /* Info card */
          .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
          .info-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; }
          .info-value { font-size: 10px; font-weight: 600; color: #1e293b; margin-top: 2px; }

          /* Summary */
          .summary-text { font-size: 10px; line-height: 1.6; color: #374151; background: #f0f9ff; border-left: 3px solid #3b82f6; padding: 10px 12px; border-radius: 0 6px 6px 0; }

          /* Points forts / faibles */
          .points-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .points-box { border-radius: 6px; padding: 10px; }
          .points-box.strengths { background: #f0fdf4; border: 1px solid #bbf7d0; }
          .points-box.weaknesses { background: #fff1f2; border: 1px solid #fecdd3; }
          .points-title { font-size: 9px; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; }
          .points-title.s { color: #16a34a; }
          .points-title.w { color: #dc2626; }
          .point-item { font-size: 9px; color: #374151; padding: 2px 0; display: flex; gap: 5px; }
          .point-icon { flex-shrink: 0; }

          /* Scores */
          .score-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
          .score-name { font-size: 9px; color: #374151; width: 120px; flex-shrink: 0; }
          .score-bar-bg { flex: 1; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
          .score-bar-fill { height: 100%; border-radius: 3px; }
          .score-val { font-size: 9px; font-weight: bold; color: #1e293b; width: 25px; text-align: right; }

          /* Images */
          .img-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
          .img-item { aspect-ratio: 4/3; border-radius: 6px; overflow: hidden; }
          .img-item img { width: 100%; height: 100%; object-fit: cover; }

          /* Map */
          .map-img { width: 100%; height: 160px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; }

          /* QR codes */
          .qr-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
          .qr-item { text-align: center; padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
          .qr-item img { width: 60px; height: 60px; margin: 0 auto; display: block; }
          .qr-caption { font-size: 8px; color: #64748b; margin-top: 4px; word-break: break-all; }

          /* Aelia Note */
          .aelia-note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 12px; }
          .aelia-note-title { font-size: 9px; font-weight: bold; color: #92400e; margin-bottom: 4px; }
          .aelia-note-text { font-size: 10px; color: #78350f; line-height: 1.5; }

          /* Tags */
          .tag { display: inline-block; font-size: 8px; padding: 2px 7px; border-radius: 10px; margin: 2px; font-weight: 600; }
          .tag-blue { background: #dbeafe; color: #1e40af; }
          .tag-green { background: #dcfce7; color: #16a34a; }

          /* Footer */
          .footer { margin-top: 16px; padding: 10px 20px; background: #1e40af; color: white; border-radius: 0 0 8px 8px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; }
          .footer-date { opacity: 0.7; }

          .divider { border: none; border-top: 1px solid #e2e8f0; margin: 10px 0; }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); }, 800)
  }

  if (!hotel && !loading) return (
    <Button variant="outline" size="sm" onClick={loadAndOpen}>
      <FileDown className="w-4 h-4 mr-2" />PDF
    </Button>
  )

  const h = hotel
  const scores = h?.scores?.[0]
  const images = (h?.media || []).filter((m: any) => m.type === 'image' || m.type === 'capture').slice(0, 6)
  const videos = (h?.media || []).filter((m: any) => m.type === 'social')
  const starsNum = parseInt(h?.category) || 0
  const SCORE_LABELS: Record<string, string> = {
    location_score: 'Emplacement', beach_score: 'Plage', food_score: 'Restauration',
    rooms_score: 'Chambres', animation_score: 'Animation', cleanliness_score: 'Propreté',
    value_score: 'Rapport Q/P', commercial_score: 'Intérêt commercial', reliability_score: 'Fiabilité',
  }
  const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  function scoreColor(v: number) {
    if (v >= 8) return '#10b981'
    if (v >= 6.5) return '#84cc16'
    if (v >= 5) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={loadAndOpen}>
        <FileDown className="w-4 h-4 mr-2" />PDF
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Aperçu PDF — {hotelName}</DialogTitle>
              {!loading && (
                <Button onClick={handlePrint} className="mr-8">
                  <FileDown className="w-4 h-4 mr-2" />Télécharger / Imprimer
                </Button>
              )}
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Génération du PDF…</p>
            </div>
          ) : (
            <div ref={printRef} style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#1e293b', background: 'white' }}>
              <div style={{ maxWidth: 794 }}>

                {/* HEADER */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#1e40af', color: 'white', borderRadius: '8px 8px 0 0' }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: 1 }}>✈ AELIA TRAVEL</div>
                    <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>Votre agence de voyage de confiance</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 9, opacity: 0.9, lineHeight: 1.7 }}>
                    <div>{AELIA_CONTACT.address}</div>
                    <div>{AELIA_CONTACT.phone}</div>
                    <div>{AELIA_CONTACT.email}</div>
                    <div>{AELIA_CONTACT.website}</div>
                  </div>
                </div>

                {/* HERO */}
                <div style={{ background: '#f0f5ff', border: '1px solid #bfdbfe', borderTop: 'none', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1e3a8a' }}>{h?.name}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                      {h?.city?.name}{h?.zone?.name ? ` · ${h.zone.name}` : ''} · {h?.city?.country}
                      {h?.address ? ` · ${h.address}` : ''}
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ color: '#f59e0b', fontSize: 13 }}>{'★'.repeat(starsNum)}{starsNum < 5 ? '☆'.repeat(5 - starsNum) : ''}</span>
                      {h?.ambiance && <span style={{ fontSize: 9, background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{h.ambiance}</span>}
                      {h?.status && <span style={{ fontSize: 9, background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{h.status}</span>}
                    </div>
                  </div>
                  {scores?.final_score && (
                    <div style={{ background: '#1e40af', color: 'white', borderRadius: 8, padding: '8px 16px', textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 26, fontWeight: 'bold' }}>{scores.final_score}</div>
                      <div style={{ fontSize: 8, opacity: 0.8 }}>NOTE / 10</div>
                    </div>
                  )}
                </div>

                {/* IMAGES */}
                {images.length > 0 && (
                  <div style={{ margin: '12px 0' }}>
                    <div style={{ fontSize: 11, fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #bfdbfe', paddingBottom: 4, marginBottom: 8 }}>
                      Galerie photos
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(images.length, 3)}, 1fr)`, gap: 6 }}>
                      {images.map((img: any) => (
                        <div key={img.id} style={{ aspectRatio: '4/3', borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SATELLITE MAP */}
                {h?.latitude && h?.longitude && GOOGLE_MAPS_KEY && (
                  <div style={{ margin: '12px 0' }}>
                    <div style={{ fontSize: 11, fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #bfdbfe', paddingBottom: 4, marginBottom: 8 }}>
                      Localisation
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'start' }}>
                      <img
                        src={`https://maps.googleapis.com/maps/api/staticmap?center=${h.latitude},${h.longitude}&zoom=17&size=600x160&maptype=satellite&markers=color:red%7Clabel:H%7C${h.latitude},${h.longitude}&key=${GOOGLE_MAPS_KEY}`}
                        alt="Localisation satellite"
                        style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }}
                      />
                      {qrCodes['maps'] && (
                        <div style={{ textAlign: 'center', padding: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                          <img src={qrCodes['maps']} style={{ width: 70, height: 70 }} alt="QR Maps" />
                          <div style={{ fontSize: 8, color: '#64748b', marginTop: 4 }}>Google Maps</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '12px 0' }}>
                  {/* INFOS */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #bfdbfe', paddingBottom: 4, marginBottom: 8 }}>Informations</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[
                        { label: 'Plage', value: h?.beach_distance || '—' },
                        { label: 'Type plage', value: h?.beach_type?.replace('_', ' ') || '—' },
                        { label: 'Animation', value: h?.animation_level || '—' },
                        { label: 'Clientèle', value: h?.target_audience || '—' },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8 }}>
                          <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    {/* Régimes */}
                    {h?.board_types?.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 9, color: '#64748b', marginBottom: 4 }}>RÉGIMES</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {h.board_types.map((bt: string) => (
                            <span key={bt} style={{ fontSize: 8, padding: '2px 7px', borderRadius: 10, background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>
                              {BOARD_LABELS[bt as keyof typeof BOARD_LABELS] || bt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SCORES */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #bfdbfe', paddingBottom: 4, marginBottom: 8 }}>Notation</div>
                    {scores && Object.entries(SCORE_LABELS).map(([key, label]) => {
                      const val = scores[key] || 0
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <div style={{ fontSize: 9, color: '#374151', width: 100, flexShrink: 0 }}>{label}</div>
                          <div style={{ flex: 1, height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${val * 10}%`, height: '100%', background: scoreColor(val), borderRadius: 3 }} />
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 'bold', width: 22, textAlign: 'right' }}>{val}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* SUMMARY */}
                {h?.commercial_summary && (
                  <div style={{ margin: '12px 0' }}>
                    <div style={{ fontSize: 11, fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #bfdbfe', paddingBottom: 4, marginBottom: 8 }}>Résumé commercial</div>
                    <div style={{ fontSize: 10, lineHeight: 1.6, color: '#374151', background: '#f0f9ff', borderLeft: '3px solid #3b82f6', padding: '10px 12px', borderRadius: '0 6px 6px 0' }}>
                      {h.commercial_summary}
                    </div>
                  </div>
                )}

                {/* POINTS FORTS / FAIBLES */}
                {((h?.strengths?.length > 0) || (h?.weaknesses?.length > 0)) && (
                  <div style={{ margin: '12px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {h?.strengths?.length > 0 && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: 10 }}>
                        <div style={{ fontSize: 9, fontWeight: 'bold', color: '#16a34a', textTransform: 'uppercase', marginBottom: 6 }}>✓ Points forts</div>
                        {h.strengths.map((s: string, i: number) => (
                          <div key={i} style={{ fontSize: 9, color: '#374151', padding: '2px 0', display: 'flex', gap: 5 }}>
                            <span style={{ color: '#16a34a', flexShrink: 0 }}>•</span>{s}
                          </div>
                        ))}
                      </div>
                    )}
                    {h?.weaknesses?.length > 0 && (
                      <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 6, padding: 10 }}>
                        <div style={{ fontSize: 9, fontWeight: 'bold', color: '#dc2626', textTransform: 'uppercase', marginBottom: 6 }}>✕ Points faibles</div>
                        {h.weaknesses.map((w: string, i: number) => (
                          <div key={i} style={{ fontSize: 9, color: '#374151', padding: '2px 0', display: 'flex', gap: 5 }}>
                            <span style={{ color: '#dc2626', flexShrink: 0 }}>•</span>{w}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* AELIA NOTE */}
                {h?.aelia_note && (
                  <div style={{ margin: '12px 0', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '10px 12px' }}>
                    <div style={{ fontSize: 9, fontWeight: 'bold', color: '#92400e', marginBottom: 4 }}>✍️ AELIA NOTE — Avis interne</div>
                    <div style={{ fontSize: 10, color: '#78350f', lineHeight: 1.5 }}>{h.aelia_note}</div>
                  </div>
                )}

                {/* PROFILS */}
                {h?.profile_matches?.length > 0 && (
                  <div style={{ margin: '12px 0' }}>
                    <div style={{ fontSize: 11, fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #bfdbfe', paddingBottom: 4, marginBottom: 8 }}>Profils clients recommandés</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {h.profile_matches.map((pm: any) => (
                        <span key={pm.profile_id} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 20, background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>
                          {pm.profile?.icon} {pm.profile?.label}
                          {pm.match_level === 'parfait' ? ' ★' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* QR CODES VIDEOS */}
                {videos.length > 0 && (
                  <div style={{ margin: '12px 0' }}>
                    <div style={{ fontSize: 11, fontWeight: 'bold', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #bfdbfe', paddingBottom: 4, marginBottom: 8 }}>Vidéos & Réseaux sociaux</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {videos.map((vid: any) => qrCodes[vid.id] && (
                        <div key={vid.id} style={{ textAlign: 'center', padding: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                          <img src={qrCodes[vid.id]} style={{ width: 70, height: 70, margin: '0 auto', display: 'block' }} alt="QR" />
                          <div style={{ fontSize: 8, color: '#64748b', marginTop: 4, wordBreak: 'break-all' }}>
                            {vid.caption || vid.source || 'Vidéo'}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>
                      Scannez les QR codes pour accéder aux vidéos et réels de l'hôtel
                    </div>
                  </div>
                )}

                {/* FOOTER */}
                <div style={{ marginTop: 16, padding: '10px 20px', background: '#1e40af', color: 'white', borderRadius: '0 0 8px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8 }}>
                  <div style={{ fontWeight: 'bold' }}>✈ AELIA TRAVEL — {AELIA_CONTACT.email} — {AELIA_CONTACT.website}</div>
                  <div style={{ opacity: 0.7 }}>Document généré le {formatDate(new Date().toISOString())}</div>
                </div>

              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
