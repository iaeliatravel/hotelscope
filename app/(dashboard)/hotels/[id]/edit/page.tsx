import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { HotelForm } from '@/components/hotels/hotel-form'

export default async function EditHotelPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: hotel } = await supabase
    .from('hotels')
    .select('*, scores:hotel_scores(*)')
    .eq('id', params.id)
    .eq('is_deleted', false)
    .single()

  if (!hotel) notFound()

  const scores = (hotel as any).scores?.[0] || {}

  return (
    <div>
      <Header title={`Modifier — ${hotel.name}`} description="Mettre à jour la fiche hôtel" />
      <div className="page-container max-w-3xl">
        <HotelForm hotel={hotel as any} hotelScores={scores} />
      </div>
    </div>
  )
}
