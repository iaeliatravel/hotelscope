'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Upload, Link as LinkIcon, Trash2, Loader2, Image as ImageIcon, FileText, ExternalLink } from 'lucide-react'
import type { HotelMedia } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MediaManagerProps {
  hotelId: string
}

export function MediaManager({ hotelId }: MediaManagerProps) {
  const [media, setMedia] = useState<HotelMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkCaption, setLinkCaption] = useState('')
  const [linkType, setLinkType] = useState<'link' | 'image'>('image')
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

      const { error: uploadError } = await supabase.storage
        .from('hotel-media')
        .upload(fileName, file)

      if (uploadError) {
        toast({ variant: 'destructive', title: 'Erreur upload', description: uploadError.message })
        continue
      }

      const { data: urlData } = supabase.storage.from('hotel-media').getPublicUrl(fileName)

      await supabase.from('hotel_media').insert({
        hotel_id: hotelId,
        author_id: user?.id,
        type: 'image',
        url: urlData.publicUrl,
        caption: file.name,
      })
    }

    toast({ title: `${files.length} fichier(s) ajouté(s)` })
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    load()
  }

  async function addLink() {
    if (!linkUrl.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('hotel_media').insert({
      hotel_id: hotelId,
      author_id: user?.id,
      type: linkType,
      url: linkUrl.trim(),
      caption: linkCaption.trim() || null,
    })
    if (!error) {
      toast({ title: 'Lien ajouté' })
      setLinkUrl('')
      setLinkCaption('')
      load()
    }
  }

  async function deleteMedia(item: HotelMedia) {
    if (!confirm('Supprimer ce média ?')) return
    if (item.type === 'image' && item.url.includes('hotel-media')) {
      const path = item.url.split('hotel-media/')[1]
      if (path) await supabase.storage.from('hotel-media').remove([path])
    }
    await supabase.from('hotel_media').delete().eq('id', item.id)
    toast({ title: 'Média supprimé' })
    load()
  }

  const images = media.filter(m => m.type === 'image' || m.type === 'capture')
  const links = media.filter(m => m.type === 'link' || m.type === 'document')

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <div className="space-y-2">
        <Label className="text-sm">Ajouter des images</Label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Cliquez pour téléverser des images</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">JPEG, PNG, WebP — 10 MB max</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Add link */}
      <div className="space-y-2">
        <Label className="text-sm">Ou ajouter par lien</Label>
        <div className="flex gap-2">
          <Select value={linkType} onValueChange={(v: any) => setLinkType(v)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="link">Lien / Doc</SelectItem>
            </SelectContent>
          </Select>
          <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…" className="flex-1" />
          <Button type="button" variant="outline" onClick={addLink} disabled={!linkUrl.trim()}>
            Ajouter
          </Button>
        </div>
        <Input value={linkCaption} onChange={e => setLinkCaption(e.target.value)} placeholder="Légende (optionnel)" />
      </div>

      {/* Gallery */}
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {images.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{images.length} image{images.length > 1 ? 's' : ''}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {images.map(img => (
                  <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img src={img.url} alt={img.caption || ''} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => deleteMedia(img)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {links.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Liens & documents</p>
              <div className="space-y-1.5">
                {links.map(link => (
                  <div key={link.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20 group">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1">
                      {link.caption || link.url}
                    </a>
                    <button type="button" onClick={() => deleteMedia(link)} className="opacity-0 group-hover:opacity-100 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {images.length === 0 && links.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun média ajouté pour l'instant.</p>
          )}
        </>
      )}
    </div>
  )
}
