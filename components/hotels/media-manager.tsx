'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Upload, Trash2, Loader2, X, Play, Plus, ExternalLink } from 'lucide-react'
import type { HotelMedia } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MediaManagerProps {
  hotelId: string
}

function getVideoEmbed(url: string): { platform: string; embedUrl: string; thumbnail: string } | null {
  // TikTok
  const tiktok = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
  if (tiktok) return {
    platform: 'tiktok',
    embedUrl: `https://www.tiktok.com/embed/v2/${tiktok[1]}`,
    thumbnail: '',
  }

  // Instagram Reel
  const ig = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/)
  if (ig) return {
    platform: 'instagram',
    embedUrl: `https://www.instagram.com/p/${ig[1]}/embed/`,
    thumbnail: '',
  }

  // Facebook video
  const fb = url.match(/facebook\.com\/(?:[^/]+\/videos\/|watch\/?\?v=)(\d+)/)
  if (fb) return {
    platform: 'facebook',
    embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
    thumbnail: '',
  }

  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/)
  if (yt) return {
    platform: 'youtube',
    embedUrl: `https://www.youtube.com/embed/${yt[1]}`,
    thumbnail: `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`,
  }

  return null
}

function getPlatformIcon(platform: string) {
  const icons: Record<string, string> = {
    tiktok: '🎵',
    instagram: '📸',
    facebook: '👤',
    youtube: '▶️',
  }
  return icons[platform] || '🎬'
}

function getPlatformColor(platform: string) {
  const colors: Record<string, string> = {
    tiktok: 'bg-black/90 text-white',
    instagram: 'bg-gradient-to-br from-purple-600 to-pink-500 text-white',
    facebook: 'bg-blue-600 text-white',
    youtube: 'bg-red-600 text-white',
  }
  return colors[platform] || 'bg-slate-700 text-white'
}

function ImageUrlInput({ hotelId, onAdded }: { hotelId: string; onAdded: () => void }) {
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  async function add() {
    if (!url.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('hotel_media').insert({
      hotel_id: hotelId, author_id: user?.id,
      type: 'image', url: url.trim(), caption: caption.trim() || null,
    })
    if (!error) {
      toast({ title: 'Image ajoutée' })
      setUrl(''); setCaption(''); setOpen(false); onAdded()
    } else {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message })
    }
    setSaving(false)
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="text-xs text-primary hover:underline flex items-center gap-1">
        <Plus className="w-3 h-3" />Ajouter une image par URL
      </button>
    )
  }

  return (
    <div className="flex-1 flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border">
      <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://… (URL de l'image)" className="text-sm h-8" autoFocus />
      <div className="flex gap-2">
        <Input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Légende (optionnel)" className="text-sm h-8 flex-1" />
        <Button type="button" size="sm" className="h-8" onClick={add} disabled={!url.trim() || saving}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Ajouter'}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => setOpen(false)}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      {url && <img src={url} alt="" className="w-full h-24 object-cover rounded-lg border" onError={e => (e.currentTarget.style.display='none')} />}
    </div>
  )
}

export function MediaManager({ hotelId }: MediaManagerProps) {
  const [media, setMedia] = useState<HotelMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkCaption, setLinkCaption] = useState('')
  const [adding, setAdding] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [videoModal, setVideoModal] = useState<{ url: string; platform: string; embedUrl: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { toast } = useToast()

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('hotel_media')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
    setMedia(data as HotelMedia[] || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [hotelId])

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const fileName = `${hotelId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('hotel-media').upload(fileName, file)
      if (uploadError) { toast({ variant: 'destructive', title: 'Erreur upload', description: uploadError.message }); continue }
      const { data: urlData } = supabase.storage.from('hotel-media').getPublicUrl(fileName)
      await supabase.from('hotel_media').insert({
        hotel_id: hotelId, author_id: user?.id,
        type: 'image', url: urlData.publicUrl, caption: file.name,
      })
    }
    toast({ title: `${files.length} photo(s) ajoutée(s)` })
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    load()
  }

  async function addLink() {
    if (!linkUrl.trim()) return
    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    const videoInfo = getVideoEmbed(linkUrl.trim())
    const type = videoInfo ? 'social' : 'link'
    const { error } = await supabase.from('hotel_media').insert({
      hotel_id: hotelId, author_id: user?.id,
      type, url: linkUrl.trim(),
      caption: linkCaption.trim() || (videoInfo ? `Vidéo ${videoInfo.platform}` : null),
      source: videoInfo?.platform || null,
    })
    if (!error) {
      toast({ title: videoInfo ? `Vidéo ${videoInfo.platform} ajoutée` : 'Lien ajouté' })
      setLinkUrl(''); setLinkCaption('')
    }
    setAdding(false)
    load()
  }

  async function deleteMedia(item: HotelMedia) {
    if (!confirm('Supprimer ce média ?')) return
    // If stored in Supabase Storage, delete file too
    if (item.type === 'image' && item.url.includes('hotel-media')) {
      const parts = item.url.split('/hotel-media/')
      if (parts[1]) await supabase.storage.from('hotel-media').remove([parts[1]])
    }
    const { error } = await supabase.from('hotel_media').delete().eq('id', item.id)
    if (!error) { toast({ title: 'Média supprimé' }); load() }
    else toast({ variant: 'destructive', title: 'Erreur suppression' })
  }

  const images = media.filter(m => m.type === 'image' || m.type === 'capture')
  const videos = media.filter(m => m.type === 'social')
  const links = media.filter(m => m.type === 'link' || m.type === 'document')

  const linkPreview = linkUrl ? getVideoEmbed(linkUrl) : null

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div className="space-y-3">
        <Label className="text-sm block font-medium">Ajouter des photos</Label>

        {/* Upload file */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Envoi en cours…</p>
            </div>
          ) : (
            <>
              <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Cliquez pour téléverser des photos</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">JPEG, PNG, WebP — 10 MB max</p>
            </>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />

        {/* OR add by URL */}
        <div className="flex gap-2 items-center">
          <div className="flex-shrink-0 text-xs text-muted-foreground font-medium">ou par lien :</div>
          <ImageUrlInput hotelId={hotelId} onAdded={load} />
        </div>
      </div>

      {/* Add video/link */}
      <div>
        <Label className="text-sm mb-2 block">Ajouter un lien vidéo / reel</Label>
        <div className="space-y-2">
          <Input
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="Lien TikTok, Instagram Reel, Facebook video, YouTube…"
          />
          {linkPreview && (
            <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium', getPlatformColor(linkPreview.platform))}>
              {getPlatformIcon(linkPreview.platform)} Vidéo {linkPreview.platform} détectée
            </div>
          )}
          <Input
            value={linkCaption}
            onChange={e => setLinkCaption(e.target.value)}
            placeholder="Description (optionnel)"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLink}
            disabled={!linkUrl.trim() || adding}
          >
            {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Ajouter
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Images gallery - ALL images with delete */}
          {images.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Photos ({images.length})
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {images.map(img => (
                  <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer">
                    <img
                      src={img.url}
                      alt={img.caption || ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onClick={() => setLightbox(img.url)}
                    />
                    {/* Delete button - always visible on mobile, hover on desktop */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteMedia(img) }}
                      className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {img.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-[10px] truncate">{img.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {videos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Vidéos & Reels ({videos.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {videos.map(vid => {
                  const info = getVideoEmbed(vid.url)
                  return (
                    <div key={vid.id} className="group relative rounded-xl border overflow-hidden bg-muted">
                      {/* Thumbnail or placeholder */}
                      <div
                        className="relative aspect-video cursor-pointer"
                        onClick={() => info && setVideoModal({ url: vid.url, platform: info.platform, embedUrl: info.embedUrl })}
                      >
                        {info?.thumbnail ? (
                          <img src={info.thumbnail} alt={vid.caption || ''} className="w-full h-full object-cover" />
                        ) : (
                          <div className={cn('w-full h-full flex items-center justify-center text-3xl', info ? getPlatformColor(info.platform) : 'bg-slate-800')}>
                            {info ? getPlatformIcon(info.platform) : '🎬'}
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 text-slate-800 ml-0.5" />
                          </div>
                        </div>
                        {info && (
                          <div className={cn('absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold', getPlatformColor(info.platform))}>
                            {info.platform.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="p-2 flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground truncate flex-1">{vid.caption || vid.url}</p>
                        <div className="flex gap-1 flex-shrink-0">
                          <a href={vid.url} target="_blank" rel="noopener noreferrer" className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-primary">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button type="button" onClick={() => deleteMedia(vid)} className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Links */}
          {links.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Liens</p>
              <div className="space-y-1.5">
                {links.map(link => (
                  <div key={link.id} className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20 group">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1">
                      {link.caption || link.url}
                    </a>
                    <button type="button" onClick={() => deleteMedia(link)} className="opacity-60 group-hover:opacity-100 text-destructive flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {images.length === 0 && videos.length === 0 && links.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun média ajouté.</p>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)}>
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Video modal */}
      {videoModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setVideoModal(null)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setVideoModal(null)}>
            <X className="w-8 h-8" />
          </button>
          <div
            className="w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {videoModal.platform === 'tiktok' ? (
              <div className="flex flex-col items-center gap-3 p-8 bg-black text-white text-center">
                <div className="text-5xl">🎵</div>
                <p className="text-lg font-semibold">TikTok</p>
                <p className="text-sm text-white/70">L'embed TikTok nécessite une autorisation spéciale.</p>
                <a href={videoModal.url} target="_blank" rel="noopener noreferrer"
                  className="mt-2 px-4 py-2 bg-white text-black rounded-lg font-medium text-sm hover:bg-white/90">
                  Ouvrir dans TikTok →
                </a>
              </div>
            ) : (
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  src={videoModal.embedUrl}
                  className="absolute inset-0 w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
