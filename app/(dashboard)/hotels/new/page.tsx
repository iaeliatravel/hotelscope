import { Header } from '@/components/layout/header'
import { HotelForm } from '@/components/hotels/hotel-form'

export default function NewHotelPage() {
  return (
    <div>
      <Header title="Nouvel hôtel" description="Créez une fiche hôtel complète" />
      <div className="page-container max-w-3xl">
        <HotelForm />
      </div>
    </div>
  )
}
