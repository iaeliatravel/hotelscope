import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { HotelForm } from '@/components/hotels/hotel-form'

const SCORE_KEYS = [
  'location_score', 'beach_score', 'food_score', 'rooms_score',
  'animation_score', 'cleanliness_score', 'value_score',
  'commercial_score', 'reliability_score',
]

export default async function EditHotelPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: hotel } = await supabase
    .from('hotels')
    .select('*, scores:hotel_scores(*)')
    .eq('id', params.id)
    .eq('is_deleted', false)
    .single()

  if (!hotel) notFound()

  const rawScores = (hotel as any).scores?.[0] || {}

  // Only pass numeric score fields — strip id, hotel_id, updated_at, etc.
  const hotelScores: Record<string, number> = {}
  for (const key of SCORE_KEYS) {
    const v = rawScores[key]
    hotelScores[key] = (v !== undefined && v !== null && !isNaN(Number(v))) ? Number(v) : 0
  }

  return (
    <div>
      <Header title={`Modifier — ${hotel.name}`} description="Mettre à jour la fiche hôtel" />
      <div className="page-container max-w-3xl">
        <HotelForm hotel={hotel as any} hotelScores={hotelScores} />
      </div>
    </div>
  )
}
