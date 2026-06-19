'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Trash2, X, ChevronLeft, ChevronRight, Play, ExternalLink } from 'lucide-react'
import type { HotelMedia } from '@/lib/types'
import { cn } from '@/lib/utils'

function getVideoEmbed(url: string) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/)
  if (yt) return { platform: 'youtube', embedUrl: `https://www.youtube.com/embed/${yt[1]}`, thumb: `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` }
  const ig = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/)
  if (ig) return { platform: 'instagram', embedUrl: `https://www.instagram.com/p/${ig[1]}/embed/`, thumb: '' }
  const fb = url.match(/facebook\.com\//)
  if (fb) return { platform: 'facebook', embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`, thumb: '' }
  const tt = url.match(/tiktok\.com\//)
  if (tt) return { platform: 'tiktok', embedUrl: '', thumb: '' }
  return null
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'bg-red-600', instagram: 'bg-gradient-to-br from-purple-600 to-pink-500',
  facebook: 'bg-blue-600', tiktok: 'bg-black',
}
const PLATFORM_ICONS: Record<string, string> = {
  youtube: '▶️', instagram: '📸', facebook: '👤', tiktok: '🎵',
}

interface HotelGalleryProps {
  hotelId: string
  initialMedia: HotelMedia[]
}

export function HotelGallery({ hotelId, initialMedia }: HotelGalleryProps) {
  const [media, setMedia] = useState<HotelMedia[]>(initialMedia)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [videoModal, setVideoModal] = useState<any | null>(null)
  const [editMode, setEditMode] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const images = media.filter(m => m.type === 'image' || m.type === 'capture')
  const videos = media.filter(m => m.type === 'social')

  async function deleteMedia(item: HotelMedia) {
    // Delete from storage if it's an uploaded image
    if (item.type === 'image' && item.url.includes('/hotel-media/')) {
      const path = item.url.split('/hotel-media/')[1]
      if (path) await supabase.storage.from('hotel-media').remove([path])
    }
    const { error } = await supabase.from('hotel_media').delete().eq('id', item.id)
    if (error) { toast({ variant: 'destructive', title: 'Erreur', description: error.message }); return }
    setMedia(prev => prev.filter(m => m.id !== item.id))
    toast({ title: 'Photo supprimée' })
    if (lightboxIdx !== null && lightboxIdx >= images.length - 1) setLightboxIdx(null)
  }

  function prevImg() {
    if (lightboxIdx === null) return
    setLightboxIdx(i => (i! > 0 ? i! - 1 : images.length - 1))
  }
  function nextImg() {
    if (lightboxIdx === null) return
    setLightboxIdx(i => (i! < images.length - 1 ? i! + 1 : 0))
  }

  if (images.length === 0 && videos.length === 0) return null

  return (
    <>
      <div className="space-y-3">
        {/* Images */}
        {images.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Photos ({images.length})
              </p>
              <button
                onClick={() => setEditMode(e => !e)}
                className={cn('text-xs px-2.5 py-1 rounded-lg border transition-all',
                  editMode ? 'bg-destructive/10 text-destructive border-destructive/30' : 'text-muted-foreground border-input hover:border-primary/40')}
              >
                {editMode ? 'Terminer' : '✏️ Gérer'}
              </button>
            </div>

            {/* Mosaic grid — all photos */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="relative group aspect-square rounded-xl overflow-hidden border bg-muted cursor-pointer"
                  onClick={() => !editMode && setLightboxIdx(idx)}
                >
                  <img
                    src={img.url}
                    alt={img.caption || ''}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Delete overlay in edit mode */}
                  {editMode && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMedia(img) }}
                        className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {/* Hover delete button (not in edit mode) */}
                  {!editMode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMedia(img) }}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Index indicator */}
                  {!editMode && (
                    <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {idx + 1}/{images.length}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos / Reels */}
        {videos.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Vidéos & Reels ({videos.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {videos.map(vid => {
                const info = getVideoEmbed(vid.url)
                return (
                  <div key={vid.id} className="group relative rounded-xl border overflow-hidden bg-muted">
                    <div
                      className="relative aspect-video cursor-pointer"
                      onClick={() => info && setVideoModal({ ...info, url: vid.url })}
                    >
                      {info?.thumb ? (
                        <img src={info.thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className={cn('w-full h-full flex items-center justify-center text-2xl', info ? PLATFORM_COLORS[info.platform] : 'bg-slate-800')}>
                          {info ? PLATFORM_ICONS[info.platform] : '🎬'}
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 text-slate-800 ml-0.5" />
                        </div>
                      </div>
                      {info && (
                        <div className={cn('absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded text-white', PLATFORM_COLORS[info.platform])}>
                          {info.platform.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="p-2 flex items-center gap-1">
                      <p className="text-xs text-muted-foreground truncate flex-1">{vid.caption || 'Vidéo'}</p>
                      <a href={vid.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary flex-shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button onClick={() => deleteMedia(vid)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && images[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[100] bg-black/96 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close */}
          <button className="absolute top-4 right-4 text-white/70 hover:text-white z-10" onClick={() => setLightboxIdx(null)}>
            <X className="w-8 h-8" />
          </button>
          {/* Counter */}
          <div className="absolute top-4 left-4 text-white/70 text-sm bg-black/40 px-3 py-1 rounded-full">
            {lightboxIdx + 1} / {images.length}
          </div>
          {/* Delete in lightbox */}
          <button
            className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-sm bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-full transition-colors"
            onClick={(e) => { e.stopPropagation(); deleteMedia(images[lightboxIdx!]) }}
          >
            <Trash2 className="w-3.5 h-3.5" />Supprimer
          </button>
          {/* Prev */}
          {images.length > 1 && (
            <button
              className="absolute left-4 text-white/70 hover:text-white z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60"
              onClick={(e) => { e.stopPropagation(); prevImg() }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {/* Image */}
          <img
            src={images[lightboxIdx].url}
            alt={images[lightboxIdx].caption || ''}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          {/* Next */}
          {images.length > 1 && (
            <button
              className="absolute right-4 text-white/70 hover:text-white z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60"
              onClick={(e) => { e.stopPropagation(); nextImg() }}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
          {/* Caption */}
          {images[lightboxIdx].caption && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/50 px-4 py-2 rounded-full">
              {images[lightboxIdx].caption}
            </div>
          )}
          {/* Thumbnails strip */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 px-4 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(i) }}
                  className={cn('w-10 h-10 rounded-md overflow-hidden flex-shrink-0 border-2 transition-all',
                    i === lightboxIdx ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100')}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Video modal */}
      {videoModal && (
        <div className="fixed inset-0 z-[100] bg-black/96 flex items-center justify-center p-4" onClick={() => setVideoModal(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setVideoModal(null)}>
            <X className="w-8 h-8" />
          </button>
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            {videoModal.platform === 'tiktok' ? (
              <div className="bg-black text-white p-10 text-center space-y-4">
                <div className="text-5xl">🎵</div>
                <p className="font-semibold">Vidéo TikTok</p>
                <a href={videoModal.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl font-medium text-sm hover:bg-white/90">
                  Ouvrir dans TikTok <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe src={videoModal.embedUrl} className="absolute inset-0 w-full h-full"
                  frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
