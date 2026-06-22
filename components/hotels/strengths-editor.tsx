'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StrengthsEditorProps {
  hotelId: string
  type: 'strengths' | 'weaknesses'
  initialItems: string[]
}

export function StrengthsEditor({ hotelId, type, initialItems }: StrengthsEditorProps) {
  const [items, setItems] = useState<string[]>(initialItems || [])
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editVal, setEditVal] = useState('')
  const [newVal, setNewVal] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const isStrengths = type === 'strengths'
  const color = isStrengths ? 'emerald' : 'red'
  const icon = isStrengths ? '✓' : '✕'
  const label = isStrengths ? 'Point fort' : 'Point faible'

  async function save(newItems: string[]) {
    setSaving(true)
    const { error } = await supabase
      .from('hotels')
      .update({ [type]: newItems, updated_at: new Date().toISOString() })
      .eq('id', hotelId)
    if (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message })
    } else {
      setItems(newItems)
      toast({ title: 'Mis à jour' })
    }
    setSaving(false)
  }

  async function addItem() {
    if (!newVal.trim()) return
    const updated = [...items, newVal.trim()]
    setNewVal('')
    await save(updated)
  }

  async function deleteItem(idx: number) {
    if (!confirm(`Supprimer "${items[idx]}" ?`)) return
    const updated = items.filter((_, i) => i !== idx)
    await save(updated)
  }

  async function saveEdit() {
    if (editIdx === null || !editVal.trim()) return
    const updated = items.map((item, i) => i === editIdx ? editVal.trim() : item)
    setEditIdx(null)
    await save(updated)
  }

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className={cn(
          'flex items-center gap-2 p-2.5 rounded-lg border group',
          isStrengths ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'
        )}>
          {editIdx === idx ? (
            <>
              <Input
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditIdx(null) }}
                className="h-7 text-sm flex-1"
                autoFocus
              />
              <button onClick={saveEdit} disabled={saving} className="text-emerald-600 hover:text-emerald-700 p-1">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setEditIdx(null)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <span className={cn('text-xs font-bold flex-shrink-0', isStrengths ? 'text-emerald-600' : 'text-red-500')}>{icon}</span>
              <span className="text-sm flex-1">{item}</span>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setEditIdx(idx); setEditVal(item) }}
                  className="p-1 text-muted-foreground hover:text-primary rounded"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteItem(idx)}
                  className="p-1 text-muted-foreground hover:text-destructive rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      {/* Add new */}
      <div className="flex gap-2">
        <Input
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem())}
          placeholder={`Ajouter un ${label.toLowerCase()}…`}
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2.5"
          onClick={addItem}
          disabled={!newVal.trim() || saving}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  )
}
