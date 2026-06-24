'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreBadge, StarRating } from '@/components/scores/score-badge'
import { getStatusConfig, BOARD_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { FileDown, Plus, X, CheckCircle2, XCircle, Minus } from 'lucide-react'
import QRCode from 'qrcode'

const SCORE_LABELS = [
  { key: 'location_score', label: 'Emplacement' },
  { key: 'beach_score', label: 'Plage' },
  { key: 'food_score', label: 'Restauration' },
  { key: 'rooms_score', label: 'Chambres' },
  { key: 'animation_score', label: 'Animation' },
  { key: 'cleanliness_score', label: 'Propreté' },
  { key: 'value_score', label: 'Rapport Q/P' },
  { key: 'commercial_score', label: 'Intérêt commercial' },
]

function scoreColor(v: number) {
  if (v >= 8) return 'text-emerald-600 bg-emerald-50'
  if (v >= 6.5) return 'text-lime-600 bg-lime-50'
  if (v >= 5) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

function bestScore(hotels: any[], key: string): number {
  return Math.max(...hotels.map(h => h.scores?.[0]?.[key] || 0))
}

export default function ComparePage() {
  const [allHotels, setAllHotels] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>(['', '', ''])
  const [hotels, setHotels] = useState<(any | null)[]>([null, null, null])
  const [loading, setLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('hotels').select('id, name, city:cities(name)').eq('is_deleted', false).order('name')
      .then(({ data }) => setAllHotels(data || []))
  }, [])

  async function selectHotel(idx: number, id: string) {
    const newSelected = [...selected]
    newSelected[idx] = id
    setSelected(newSelected)
    if (!id) {
      const newHotels = [...hotels]
      newHotels[idx] = null
      setHotels(newHotels)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('hotels')
      .select('*, city:cities(name), zone:zones(name), scores:hotel_scores(*), media:hotel_media(url, type), profile_matches:hotel_profile_matches(*, profile:client_profiles(*))')
      .eq('id', id).single()
    const newHotels = [...hotels]
    newHotels[idx] = data
    setHotels(newHotels)
    setLoading(false)
  }

  const activeHotels = hotels.filter(Boolean)
  const count = activeHotels.length

  async function handlePrint() {
    const content = printRef.current
    if (!content) return
    const { data: a } = await supabase.from('agency_settings').select('*').limit(1).single()
    const ag = a || { name: 'Aelia Travel', slogan: 'Votre agence de voyage de confiance', email: 'contact@aeliatravel.com', website: 'www.aeliatravel.com', phone: '', address: '', primary_color: '#1e40af' }
    const color = ag.primary_color || '#1e40af'
    const win = window.open('', '_blank', 'width=900,height=800')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
    <title>Comparaison hôtels</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#1e293b;background:white;}
      @page{margin:10mm;size:A4 portrait;}
      @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}
      table{width:100%;border-collapse:collapse;table-layout:fixed;}
      th,td{padding:6px;border:1px solid #e2e8f0;vertical-align:top;word-wrap:break-word;}
      th{background:${color};color:white;font-size:9px;}
      .label-col{background:#f8fafc;font-weight:600;color:#374151;width:90px;}
      .best-cell{background:#f0fdf4;}
      .header{background:${color};color:white;padding:10px 16px;border-radius:6px 6px 0 0;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
      .header-right{text-align:right;font-size:8px;opacity:0.9;line-height:1.6;}
      .score-bar-bg{height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-top:2px;}
      .score-bar-fill{height:100%;border-radius:3px;}
      .footer{margin-top:10px;padding:7px 16px;background:${color};color:white;border-radius:0 0 6px 6px;font-size:8px;display:flex;justify-content:space-between;}
      .img-cell{display:flex;flex-direction:column;gap:4px;} .img-cell img{width:100%;height:60px;object-fit:cover;border-radius:4px;border:1px solid #e2e8f0;}
      .tag{display:inline-block;font-size:7px;padding:1px 5px;border-radius:8px;background:#dbeafe;color:#1e40af;font-weight:600;margin:1px;}
      .pt{font-size:8px;padding:1px 0;display:flex;gap:4px;}
    </style>
    </head><body>
    <div class="header">
      <div><div style="font-size:14px;font-weight:bold;">✈ ${ag.name}</div><div style="font-size:8px;opacity:0.8;">${ag.slogan}</div></div>
      <div class="header-right">${[ag.address,ag.phone,ag.email,ag.website].filter(Boolean).join(' · ')}</div>
    </div>
    <h2 style="font-size:12px;font-weight:bold;color:${color};margin-bottom:8px;text-align:center;">Comparaison hôtels — ${new Date().toLocaleDateString('fr-FR')}</h2>
    ${content.innerHTML}
    <div class="footer"><span>✈ ${ag.name}</span><span>Généré le ${new Date().toLocaleDateString('fr-FR')}</span></div>
    </body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 700)
  }

  const COL_COLORS = ['#3b82f6', '#10b981', '#f59e0b']

  return (
    <div>
      <Header title="Comparer les hôtels" description="Comparaison côte à côte — jusqu'à 3 hôtels"
        actions={
          count >= 2 && (
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <FileDown className="w-4 h-4 mr-2" />Exporter PDF
            </Button>
          )
        }
      />

      <div className="page-container space-y-6">
        {/* Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map(idx => (
            <div key={idx} className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <span className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold"
                  style={{ background: COL_COLORS[idx] }}>
                  {idx + 1}
                </span>
                Hôtel {idx + 1}{idx === 2 && ' (optionnel)'}
              </label>
              <Select value={selected[idx]} onValueChange={v => selectHotel(idx, v)}>
                <SelectTrigger className={cn('border-2 transition-colors', selected[idx] ? '' : 'border-dashed')}>
                  <SelectValue placeholder="Choisir un hôtel…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Aucun —</SelectItem>
                  {allHotels
                    .filter(h => !selected.includes(h.id) || selected[idx] === h.id)
                    .map(h => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name} <span className="text-muted-foreground text-xs">({h.city?.name})</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {count === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <div className="text-5xl mb-4">⚖️</div>
            <p className="font-medium">Sélectionnez au moins 2 hôtels pour comparer</p>
          </div>
        )}

        {count >= 2 && (
          <div ref={printRef}>
            {/* Print header */}
            <div className="hidden print:flex items-center justify-between p-4 bg-blue-700 text-white rounded-t-lg mb-3">
              <span className="font-bold text-lg">✈ AELIA TRAVEL — Comparaison hôtels</span>
              <span className="text-sm opacity-80">{new Date().toLocaleDateString('fr-FR')}</span>
            </div>

            {/* Comparison table */}
            <div className="overflow-x-auto rounded-xl border shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 w-36 text-xs font-medium text-muted-foreground">Critère</th>
                    {activeHotels.map((h, i) => (
                      <th key={h.id} className="p-3 text-left" style={{ borderTop: `3px solid ${COL_COLORS[i]}` }}>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            style={{ background: COL_COLORS[i] }}>{i + 1}</span>
                          <div>
                            <p className="font-bold text-sm text-foreground">{h.name}</p>
                            <p className="text-xs text-muted-foreground font-normal">{h.city?.name}{h.zone?.name ? ` · ${h.zone.name}` : ''}</p>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Photos — up to 3 per hotel, each hotel isolated in its own td */}
                  <tr className="border-b">
                    <td className="p-3 bg-muted/20 text-xs font-semibold text-muted-foreground align-top">Photos</td>
                    {activeHotels.map(h => {
                      const imgs = (h.media || []).filter((m: any) => m.type === 'image' || m.type === 'capture').slice(0, 3)
                      return (
                        <td key={h.id} className="p-2 align-top">
                          <div className="flex flex-col gap-1.5">
                            {imgs.length > 0 ? imgs.map((img: any) => (
                              <img
                                key={img.id}
                                src={img.url}
                                alt=""
                                className="w-full h-24 object-cover rounded-lg border"
                              />
                            )) : (
                              <div className="w-full h-24 bg-muted rounded-lg flex items-center justify-center text-3xl opacity-20">🏨</div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>

                  {/* Note globale */}
                  <tr className="border-b">
                    <td className="p-3 bg-muted/20 text-xs font-semibold text-muted-foreground">Note globale</td>
                    {activeHotels.map((h, i) => {
                      const best = bestScore(activeHotels, 'final_score') === (h.scores?.[0]?.final_score || 0)
                      return (
                        <td key={h.id} className={cn('p-3', best && 'bg-emerald-50/50')}>
                          {h.global_score
                            ? <ScoreBadge score={h.global_score} size="lg" showLabel />
                            : <span className="text-muted-foreground text-xs">—</span>}
                          {best && count > 1 && <span className="ml-2 text-[10px] text-emerald-600 font-bold">▲ Meilleur</span>}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Catégorie */}
                  <tr className="border-b bg-muted/10">
                    <td className="p-3 bg-muted/20 text-xs font-semibold text-muted-foreground">Catégorie</td>
                    {activeHotels.map(h => (
                      <td key={h.id} className="p-3">
                        <StarRating stars={parseInt(h.category) || 0} />
                      </td>
                    ))}
                  </tr>

                  {/* Statut */}
                  <tr className="border-b">
                    <td className="p-3 bg-muted/20 text-xs font-semibold text-muted-foreground">Statut</td>
                    {activeHotels.map(h => {
                      const sc = getStatusConfig(h.status)
                      return (
                        <td key={h.id} className="p-3">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', sc.class)}>{sc.label}</span>
                        </td>
                      )
                    })}
                  </tr>

                  {/* Plage */}
                  <tr className="border-b bg-muted/10">
                    <td className="p-3 bg-muted/20 text-xs font-semibold text-muted-foreground">Distance plage</td>
                    {activeHotels.map(h => (
                      <td key={h.id} className="p-3 text-sm">{h.beach_distance || <span className="text-muted-foreground">—</span>}</td>
                    ))}
                  </tr>

                  {/* Ambiance */}
                  <tr className="border-b">
                    <td className="p-3 bg-muted/20 text-xs font-semibold text-muted-foreground">Ambiance</td>
                    {activeHotels.map(h => (
                      <td key={h.id} className="p-3 text-sm capitalize">{h.ambiance || <span className="text-muted-foreground">—</span>}</td>
                    ))}
                  </tr>

                  {/* Régimes */}
                  <tr className="border-b bg-muted/10">
                    <td className="p-3 bg-muted/20 text-xs font-semibold text-muted-foreground">Régimes</td>
                    {activeHotels.map(h => (
                      <td key={h.id} className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {(h.board_types || []).map((bt: string) => (
                            <span key={bt} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded">
                              {BOARD_LABELS[bt as keyof typeof BOARD_LABELS] || bt}
                            </span>
                          ))}
                          {!h.board_types?.length && <span className="text-muted-foreground text-xs">—</span>}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Section scores */}
                  <tr className="border-b">
                    <td colSpan={count + 1} className="p-2 bg-blue-700 text-white text-xs font-bold tracking-wider">NOTES DÉTAILLÉES</td>
                  </tr>
                  {SCORE_LABELS.map((sl, si) => {
                    const vals = activeHotels.map(h => h.scores?.[0]?.[sl.key] || 0)
                    const best = Math.max(...vals)
                    return (
                      <tr key={sl.key} className={cn('border-b', si % 2 === 0 && 'bg-muted/10')}>
                        <td className="p-3 bg-muted/20 text-xs font-semibold text-muted-foreground">{sl.label}</td>
                        {activeHotels.map((h, hi) => {
                          const val = h.scores?.[0]?.[sl.key] || 0
                          const isBest = val === best && val > 0 && count > 1
                          return (
                            <td key={h.id} className={cn('p-3', isBest && 'bg-emerald-50/50')}>
                              <div className="flex items-center gap-2">
                                <span className={cn('text-xs font-bold px-2 py-0.5 rounded', val > 0 ? scoreColor(val) : 'text-muted-foreground')}>
                                  {val > 0 ? val.toFixed(1) : '—'}
                                </span>
                                {val > 0 && (
                                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-primary/60" style={{ width: `${val * 10}%` }} />
                                  </div>
                                )}
                                {isBest && <span className="text-[10px] text-emerald-600">▲</span>}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}

                  {/* Points forts */}
                  <tr className="border-b">
                    <td colSpan={count + 1} className="p-2 bg-emerald-700 text-white text-xs font-bold tracking-wider">POINTS FORTS & FAIBLES</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 bg-muted/20 text-xs font-semibold text-muted-foreground">✓ Points forts</td>
                    {activeHotels.map(h => (
                      <td key={h.id} className="p-3">
                        <div className="space-y-1">
                          {(h.strengths || []).slice(0, 4).map((s: string, i: number) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <span>{s}</span>
                            </div>
                          ))}
                          {!h.strengths?.length && <span className="text-muted-foreground text-xs">—</span>}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b bg-muted/10">
                    <td className="p-3 bg-muted/20 text-xs font-semibold text-muted-foreground">✕ Points faibles</td>
                    {activeHotels.map(h => (
                      <td key={h.id} className="p-3">
                        <div className="space-y-1">
                          {(h.weaknesses || []).slice(0, 3).map((w: string, i: number) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs">
                              <XCircle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />
                              <span>{w}</span>
                            </div>
                          ))}
                          {!h.weaknesses?.length && <span className="text-muted-foreground text-xs">—</span>}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Quality aspects */}
                  <tr className="border-b">
                    <td colSpan={count + 1} className="p-2 bg-teal-600 text-white text-xs font-bold tracking-wider">QUALITÉ PAR ASPECT</td>
                  </tr>
                  {[
                    { key: 'room_quality', label: '🛏️ Chambres' },
                    { key: 'food_quality', label: '🍽️ Nourriture' },
                    { key: 'pool_quality', label: '🏊 Piscine' },
                    { key: 'beach_quality', label: '🏖️ Plage' },
                    { key: 'animation_level', label: '🎉 Animation' },
                    { key: 'value_for_money', label: '⚖️ Rapport Q/P' },
                  ].map((q, qi) => (
                    <tr key={q.key} className={cn('border-b', qi % 2 === 0 && 'bg-muted/10')}>
                      <td className="p-3 bg-muted/20 text-xs font-semibold text-muted-foreground">{q.label}</td>
                      {activeHotels.map(h => (
                        <td key={h.id} className="p-3 text-xs">
                          {(h as any)[q.key] || <span className="text-muted-foreground/50 italic">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Summary */}
                  <tr className="border-b">
                    <td className="p-3 bg-muted/20 text-xs font-semibold text-muted-foreground">Résumé</td>
                    {activeHotels.map(h => (
                      <td key={h.id} className="p-3 text-xs text-muted-foreground leading-relaxed">
                        {h.commercial_summary ? h.commercial_summary.slice(0, 200) + (h.commercial_summary.length > 200 ? '…' : '') : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* Profils */}
                  <tr className="border-b bg-muted/10">
                    <td className="p-3 bg-muted/20 text-xs font-semibold text-muted-foreground">Profils clients</td>
                    {activeHotels.map(h => (
                      <td key={h.id} className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {(h.profile_matches || []).filter((pm: any) => pm.match_level === 'parfait').slice(0, 4).map((pm: any) => (
                            <span key={pm.profile_id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              {pm.profile?.icon} {pm.profile?.label}
                            </span>
                          ))}
                          {!h.profile_matches?.filter((pm: any) => pm.match_level === 'parfait').length && <span className="text-muted-foreground text-xs">—</span>}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Print footer */}
            <div className="hidden print:flex justify-between p-3 bg-blue-700 text-white text-xs rounded-b-lg">
              <span>✈ AELIA TRAVEL</span>
              <span>{new Date().toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
