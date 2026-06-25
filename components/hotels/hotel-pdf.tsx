'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, FileDown } from 'lucide-react'
import { BOARD_LABELS } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import QRCode from 'qrcode'

interface HotelPdfProps {
  hotelId: string
  hotelName: string
}

const SCORE_LABELS: Record<string, string> = {
  location_score: 'Emplacement', beach_score: 'Plage', food_score: 'Restauration',
  rooms_score: 'Chambres', animation_score: 'Animation', cleanliness_score: 'Propreté',
  value_score: 'Rapport Q/P', commercial_score: 'Intérêt commercial', reliability_score: 'Fiabilité',
}

function scoreColor(v: number) {
  if (v >= 8) return '#10b981'
  if (v >= 6.5) return '#84cc16'
  if (v >= 5) return '#f59e0b'
  return '#ef4444'
}

const DEFAULT_AGENCY = {
  name: 'Aelia Travel',
  slogan: 'Votre agence de voyage de confiance',
  address: 'Algérie',
  phone: '+213 XXX XXX XXX',
  email: 'contact@aeliatravel.com',
  website: 'www.aeliatravel.com',
  primary_color: '#1e40af',
}

export function HotelPdfButton({ hotelId, hotelName }: HotelPdfProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  // Store hotel + agency + qrCodes atomically to avoid partial-render issue
  const [pdfData, setPdfData] = useState<{
    hotel: any
    agency: typeof DEFAULT_AGENCY
    qrCodes: Record<string, string>
  } | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  async function loadAndOpen() {
    setLoading(true)
    setPdfData(null)
    setOpen(true)

    const [{ data: h }, { data: a }] = await Promise.all([
      supabase.from('hotels').select(`
        *, city:cities(name, country), zone:zones(name),
        scores:hotel_scores(*), media:hotel_media(*),
        profile_matches:hotel_profile_matches(*, profile:client_profiles(*))
      `).eq('id', hotelId).single(),
      supabase.from('agency_settings').select('*').limit(1).single(),
    ])

    const agencyData = a ? { ...DEFAULT_AGENCY, ...(a as any) } : DEFAULT_AGENCY
    const color = agencyData.primary_color || '#1e40af'

    // Generate ALL QR codes before setting state — avoids partial renders
    const codes: Record<string, string> = {}
    const allMedia: any[] = (h as any)?.media || []
    const socialVideos = allMedia.filter((m: any) => m.type === 'social')

    for (const vid of socialVideos) {
      try {
        codes[vid.id] = await QRCode.toDataURL(vid.url, {
          width: 120, margin: 2,
          color: { dark: color, light: '#ffffff' },
          errorCorrectionLevel: 'M',
        })
      } catch (e) {
        console.warn('QR failed for video:', vid.url, e)
      }
    }

    const mapsUrl = (h as any)?.google_maps_url
    if (mapsUrl) {
      try {
        codes['maps'] = await QRCode.toDataURL(mapsUrl, {
          width: 120, margin: 2,
          color: { dark: color, light: '#ffffff' },
          errorCorrectionLevel: 'M',
        })
      } catch (e) {
        console.warn('QR maps failed', e)
      }
    }

    // Set everything atomically
    setPdfData({ hotel: h, agency: agencyData, qrCodes: codes })
    setLoading(false)
  }

  function handlePrint() {
    const content = printRef.current
    if (!content || !pdfData) return
    const { agency } = pdfData
    const color = agency.primary_color || '#1e40af'
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return

    win.document.write(`<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8"/>
<title>Fiche hôtel — ${hotelName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1e293b;background:white;}
@page{margin:12mm;size:A4;}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}
.header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:${color};color:white;border-radius:8px 8px 0 0;}
.agency-name{font-size:18px;font-weight:bold;letter-spacing:1px;}
.agency-slogan{font-size:9px;opacity:0.8;margin-top:2px;}
.contact-info{text-align:right;font-size:9px;opacity:0.9;line-height:1.7;}
.hero{background:#f0f5ff;border:1px solid #bfdbfe;border-top:none;padding:12px 20px;display:flex;align-items:center;gap:14px;}
.hotel-name{font-size:19px;font-weight:bold;color:#1e3a8a;}
.hotel-loc{font-size:10px;color:#64748b;margin-top:3px;}
.score-box{background:${color};color:white;border-radius:8px;padding:8px 14px;text-align:center;flex-shrink:0;}
.score-num{font-size:24px;font-weight:bold;}
.score-sub{font-size:8px;opacity:0.8;}
.sec{margin:10px 0;}
.sec-title{font-size:10px;font-weight:bold;color:${color};text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ${color}44;padding-bottom:3px;margin-bottom:7px;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;}
.icard{background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:7px;}
.icard .lbl{font-size:8px;color:#64748b;text-transform:uppercase;}
.icard .val{font-size:10px;font-weight:600;margin-top:1px;}
.summary{font-size:10px;line-height:1.6;color:#374151;background:#f0f9ff;border-left:3px solid ${color};padding:9px 11px;border-radius:0 5px 5px 0;}
.pts-s{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;padding:9px;}
.pts-w{background:#fff1f2;border:1px solid #fecdd3;border-radius:5px;padding:9px;}
.pts-title-s{font-size:8px;font-weight:bold;color:#16a34a;text-transform:uppercase;margin-bottom:5px;}
.pts-title-w{font-size:8px;font-weight:bold;color:#dc2626;text-transform:uppercase;margin-bottom:5px;}
.pt{font-size:9px;color:#374151;padding:1.5px 0;display:flex;gap:5px;}
.score-row{display:flex;align-items:center;gap:7px;margin-bottom:4px;}
.score-lbl{font-size:9px;color:#374151;width:110px;flex-shrink:0;}
.score-bar{flex:1;height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden;}
.score-fill{height:100%;border-radius:3px;}
.score-val{font-size:9px;font-weight:bold;width:22px;text-align:right;}
.img-grid{display:grid;gap:5px;}
.img-item{border-radius:5px;overflow:hidden;border:1px solid #e2e8f0;aspect-ratio:4/3;}
.img-item img{width:100%;height:100%;object-fit:cover;}
.qr-item{text-align:center;padding:7px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;}
.qr-item img{width:70px;height:70px;margin:0 auto;display:block;}
.qr-cap{font-size:8px;color:#64748b;margin-top:3px;word-break:break-all;}
.aelia-note{background:#fffbeb;border:1px solid #fde68a;border-radius:5px;padding:9px 11px;margin:10px 0;}
.aelia-note-t{font-size:8px;font-weight:bold;color:#92400e;margin-bottom:3px;}
.aelia-note-b{font-size:10px;color:#78350f;line-height:1.5;}
.profile-tag{display:inline-block;font-size:9px;padding:3px 9px;border-radius:20px;background:#dbeafe;color:#1e40af;font-weight:600;margin:2px;}
.policy-badge{display:inline-block;font-size:8px;padding:3px 8px;border-radius:5px;font-weight:600;margin:2px;}
.footer{margin-top:14px;padding:9px 20px;background:${color};color:white;border-radius:0 0 8px 8px;display:flex;justify-content:space-between;align-items:center;font-size:8px;}
.tag{display:inline-block;font-size:8px;padding:2px 7px;border-radius:10px;background:#dbeafe;color:#1e40af;font-weight:600;margin:2px;}
</style>
</head><body>${content.innerHTML}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 800)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={loadAndOpen}>
        <FileDown className="w-4 h-4 mr-2" />PDF
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>Aperçu PDF — {hotelName}</DialogTitle>
              {!loading && pdfData && (
                <Button onClick={handlePrint}>
                  <FileDown className="w-4 h-4 mr-2" />Imprimer / Télécharger
                </Button>
              )}
            </div>
          </DialogHeader>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Génération du document…</p>
            </div>
          )}

          {!loading && pdfData && (() => {
            const { hotel: h, agency, qrCodes } = pdfData
            const scores = h?.scores?.[0]
            const images = (h?.media || []).filter((m: any) => m.type === 'image' || m.type === 'capture').slice(0, 6)
            const videos = (h?.media || []).filter((m: any) => m.type === 'social')
            const starsNum = parseInt(h?.category) || 0
            const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
            const color = agency.primary_color || '#1e40af'
            const SINGLES_LABELS: Record<string, string> = {
              familles_couples: '👨‍👩‍👧 Familles & couples uniquement',
              accepte_celibataires: '✅ Célibataires acceptés',
              celibataires_demande: '📋 Célibataires sur demande',
              non_applique: '',
            }
            const BURKINI_LABELS: Record<string, string> = {
              autorise: '✅ Burkini autorisé',
              interdit: '🚫 Burkini interdit',
              non_applique: '',
            }
            const BURKINI_COLORS: Record<string, string> = {
              autorise: 'background:#dcfce7;color:#16a34a;',
              interdit: 'background:#fee2e2;color:#dc2626;',
              non_applique: '',
            }
            return (
              <div ref={printRef} style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 11, color: '#1e293b' }}>

                {/* HEADER */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: color, color: 'white', borderRadius: '8px 8px 0 0' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }}>✈ {agency.name}</div>
                    <div style={{ fontSize: 9, opacity: 0.8, marginTop: 2 }}>{agency.slogan}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 9, opacity: 0.9, lineHeight: 1.7 }}>
                    {agency.address && <div>{agency.address}</div>}
                    {agency.phone && <div>📞 {agency.phone}</div>}
                    {agency.email && <div>✉ {agency.email}</div>}
                    {agency.website && <div>🌐 {agency.website}</div>}
                  </div>
                </div>

                {/* HERO */}
                <div style={{ background: '#f0f5ff', border: '1px solid #bfdbfe', borderTop: 'none', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 19, fontWeight: 'bold', color: '#1e3a8a' }}>{h.name}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                      {h.city?.name}{h.zone?.name ? ` · ${h.zone.name}` : ''}{h.city?.country ? ` · ${h.city.country}` : ''}
                      {h.address ? ` · ${h.address}` : ''}
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ color: '#f59e0b', fontSize: 13 }}>{'★'.repeat(starsNum)}{'☆'.repeat(Math.max(0, 5 - starsNum))}</span>
                      {h.ambiance && <span style={{ fontSize: 9, background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{h.ambiance}</span>}
                      {h.status && <span style={{ fontSize: 9, background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{h.status}</span>}
                      {h.singles_policy && h.singles_policy !== 'non_applique' && (
                        <span style={{ fontSize: 9, background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                          {SINGLES_LABELS[h.singles_policy]}
                        </span>
                      )}
                      {h.burkini_policy && h.burkini_policy !== 'non_applique' && (
                        <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 600, ...(h.burkini_policy === 'autorise' ? { background: '#dcfce7', color: '#16a34a' } : { background: '#fee2e2', color: '#dc2626' }) }}>
                          {BURKINI_LABELS[h.burkini_policy]}
                        </span>
                      )}
                    </div>
                  </div>
                  {scores?.final_score && (
                    <div style={{ background: color, color: 'white', borderRadius: 8, padding: '8px 16px', textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 26, fontWeight: 'bold' }}>{scores.final_score}</div>
                      <div style={{ fontSize: 8, opacity: 0.8 }}>NOTE / 10</div>
                    </div>
                  )}
                </div>

                {/* IMAGES — 3 photos max, same layout as comparison page */}
                {images.length > 0 && (
                  <div style={{ margin: '10px 0' }}>
                    <div style={{ fontSize: 10, fontWeight: 'bold', color, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${color}44`, paddingBottom: 3, marginBottom: 7 }}>
                      Galerie photos ({images.length} photo{images.length > 1 ? 's' : ''})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      {images.slice(0, 3).map((img: any) => (
                        <div key={img.id} style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          <img
                            src={img.url}
                            alt={img.caption || ''}
                            style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
                          />
                        </div>
                      ))}
                      {/* Fill empty slots to keep grid consistent */}
                      {images.length === 1 && [1,2].map(i => (
                        <div key={i} style={{ borderRadius: 6, border: '1px dashed #e2e8f0', height: 130 }} />
                      ))}
                      {images.length === 2 && (
                        <div style={{ borderRadius: 6, border: '1px dashed #e2e8f0', height: 130 }} />
                      )}
                    </div>
                    {images.length > 3 && (
                      <div style={{ fontSize: 8, color: '#94a3b8', textAlign: 'right', marginTop: 3 }}>
                        +{images.length - 3} photo{images.length - 3 > 1 ? 's' : ''} supplémentaire{images.length - 3 > 1 ? 's' : ''} dans l'application
                      </div>
                    )}
                  </div>
                )}

                {/* MAP + KEY INFO */}
                <div style={{ display: 'grid', gridTemplateColumns: h?.latitude && h?.longitude && GOOGLE_KEY ? '1fr 1fr' : '1fr', gap: 10, margin: '10px 0' }}>
                  {h?.latitude && h?.longitude && GOOGLE_KEY && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 'bold', color, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${color}44`, paddingBottom: 3, marginBottom: 7 }}>Localisation</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <img
                          src={`https://maps.googleapis.com/maps/api/staticmap?center=${h.latitude},${h.longitude}&zoom=17&size=400x150&maptype=satellite&markers=color:red%7Clabel:H%7C${h.latitude},${h.longitude}&key=${GOOGLE_KEY}`}
                          style={{ flex: 1, height: 130, objectFit: 'cover', borderRadius: 5, border: '1px solid #e2e8f0' }}
                          alt="Carte"
                        />
                        {qrCodes['maps'] && (
                          <div style={{ textAlign: 'center', padding: 6, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 5, flexShrink: 0 }}>
                            <img src={qrCodes['maps']} style={{ width: 72, height: 72 }} alt="QR Maps" />
                            <div style={{ fontSize: 7, color: '#64748b', marginTop: 3 }}>📍 Google Maps</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 'bold', color, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${color}44`, paddingBottom: 3, marginBottom: 7 }}>Informations clés</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                      {[
                        { label: 'Distance plage', value: h.beach_distance || '—' },
                        { label: 'Type de plage', value: h.beach_type?.replace(/_/g,' ') || '—' },
                        { label: 'Clientèle', value: h.target_audience || '—' },
                        {
                          label: 'Politique',
                          value: h.singles_policy && h.singles_policy !== 'non_applique'
                            ? ({
                                familles_couples: '👨‍👩‍👧 Familles & couples',
                                accepte_celibataires: '✅ Célibataires acceptés',
                                celibataires_demande: '📋 Célibataires/demande',
                              } as Record<string,string>)[h.singles_policy] || h.singles_policy
                            : '—'
                        },
                        {
                          label: 'Burkini',
                          value: h.burkini_policy && h.burkini_policy !== 'non_applique'
                            ? h.burkini_policy === 'autorise' ? '✅ Autorisé' : '🚫 Interdit'
                            : '—'
                        },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 5, padding: '6px 8px' }}>
                          <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, marginTop: 1 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    {h.board_types?.length > 0 && (
                      <div style={{ marginTop: 7 }}>
                        <div style={{ fontSize: 8, color: '#64748b', marginBottom: 4 }}>RÉGIMES</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {h.board_types.map((bt: string) => (
                            <span key={bt} style={{ fontSize: 8, padding: '2px 7px', borderRadius: 10, background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>
                              {BOARD_LABELS[bt as keyof typeof BOARD_LABELS] || bt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SCORES + STRENGTHS/WEAKNESSES */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '10px 0' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 'bold', color, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${color}44`, paddingBottom: 3, marginBottom: 7 }}>Notation</div>
                    {scores && Object.entries(SCORE_LABELS).map(([key, label]) => {
                      const val = scores[key] || 0
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3.5 }}>
                          <div style={{ fontSize: 9, color: '#374151', width: 110, flexShrink: 0 }}>{label}</div>
                          <div style={{ flex: 1, height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${val * 10}%`, height: '100%', background: scoreColor(val), borderRadius: 3 }} />
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 'bold', width: 22, textAlign: 'right', color: scoreColor(val) }}>{val > 0 ? val : '—'}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {h.strengths?.length > 0 && (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 5, padding: 9 }}>
                        <div style={{ fontSize: 8, fontWeight: 'bold', color: '#16a34a', textTransform: 'uppercase', marginBottom: 5 }}>✓ Points forts</div>
                        {h.strengths.map((s: string, i: number) => (
                          <div key={i} style={{ fontSize: 9, color: '#374151', padding: '1.5px 0', display: 'flex', gap: 5 }}>
                            <span style={{ color: '#16a34a', flexShrink: 0 }}>•</span>{s}
                          </div>
                        ))}
                      </div>
                    )}
                    {h.weaknesses?.length > 0 && (
                      <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 5, padding: 9 }}>
                        <div style={{ fontSize: 8, fontWeight: 'bold', color: '#dc2626', textTransform: 'uppercase', marginBottom: 5 }}>✕ Points faibles</div>
                        {h.weaknesses.map((w: string, i: number) => (
                          <div key={i} style={{ fontSize: 9, color: '#374151', padding: '1.5px 0', display: 'flex', gap: 5 }}>
                            <span style={{ color: '#dc2626', flexShrink: 0 }}>•</span>{w}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* QUALITY TEXT EVALUATIONS */}
                {(h.room_quality || h.food_quality || h.pool_quality || h.beach_quality || h.animation_level || h.value_for_money) && (
                  <div style={{ margin: '10px 0' }}>
                    <div style={{ fontSize: 10, fontWeight: 'bold', color, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${color}44`, paddingBottom: 3, marginBottom: 7 }}>
                      Évaluation des prestations
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {[
                        { label: '🛏️ Chambres', value: h.room_quality },
                        { label: '🍽️ Nourriture', value: h.food_quality },
                        { label: '🏊 Piscine', value: h.pool_quality },
                        { label: '🏖️ Plage', value: h.beach_quality },
                        { label: '🎉 Animation', value: h.animation_level },
                        { label: '⚖️ Rapport Q/P', value: h.value_for_money },
                      ].filter(i => i.value).map(({ label, value }) => (
                        <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 5, padding: '7px 9px' }}>
                          <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                          <div style={{ fontSize: 10, color: '#1e293b', lineHeight: 1.4 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SUMMARY */}
                {h.commercial_summary && (
                  <div style={{ margin: '10px 0' }}>
                    <div style={{ fontSize: 10, fontWeight: 'bold', color, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${color}44`, paddingBottom: 3, marginBottom: 7 }}>Résumé commercial</div>
                    <div style={{ fontSize: 10, lineHeight: 1.6, color: '#374151', background: '#f0f9ff', borderLeft: `3px solid ${color}`, padding: '9px 11px', borderRadius: '0 5px 5px 0' }}>
                      {h.commercial_summary}
                    </div>
                  </div>
                )}

                {/* AELIA NOTE */}
                {h.aelia_note && (
                  <div style={{ margin: '10px 0', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 5, padding: '9px 11px' }}>
                    <div style={{ fontSize: 8, fontWeight: 'bold', color: '#92400e', marginBottom: 3 }}>✍️ AELIA NOTE — Avis interne</div>
                    <div style={{ fontSize: 10, color: '#78350f', lineHeight: 1.5 }}>{h.aelia_note}</div>
                  </div>
                )}

                {/* PROFILS */}
                {h.profile_matches?.filter((pm: any) => pm.match_level === 'parfait' || pm.match_level === 'bon').length > 0 && (
                  <div style={{ margin: '10px 0' }}>
                    <div style={{ fontSize: 10, fontWeight: 'bold', color, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${color}44`, paddingBottom: 3, marginBottom: 7 }}>Profils clients recommandés</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {h.profile_matches.map((pm: any) => (
                        <span key={pm.profile_id} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>
                          {pm.profile?.icon} {pm.profile?.label}{pm.match_level === 'parfait' ? ' ★' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* QR CODES VIDEOS */}
                {videos.length > 0 && (
                  <div style={{ margin: '10px 0' }}>
                    <div style={{ fontSize: 10, fontWeight: 'bold', color, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${color}44`, paddingBottom: 3, marginBottom: 7 }}>
                      Vidéos & Réseaux sociaux — Scannez pour accéder
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {videos.map((vid: any) => (
                        <div key={vid.id} style={{ textAlign: 'center', padding: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                          {qrCodes[vid.id] ? (
                            <img src={qrCodes[vid.id]} style={{ width: 72, height: 72, margin: '0 auto', display: 'block' }} alt="QR" />
                          ) : (
                            <div style={{ width: 72, height: 72, margin: '0 auto', background: '#e2e8f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                              🎬
                            </div>
                          )}
                          <div style={{ fontSize: 8, color: '#64748b', marginTop: 4, wordBreak: 'break-all' }}>
                            {vid.caption || vid.source || 'Vidéo'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FOOTER */}
                <div style={{ marginTop: 14, padding: '9px 20px', background: color, color: 'white', borderRadius: '0 0 8px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8 }}>
                  <div style={{ fontWeight: 'bold' }}>✈ {agency.name} — {agency.email} — {agency.website}</div>
                  <div style={{ opacity: 0.7 }}>Document généré le {formatDate(new Date().toISOString())}</div>
                </div>

              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </>
  )
}
