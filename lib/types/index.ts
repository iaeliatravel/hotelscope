export type UserRole = 'admin' | 'agent' | 'readonly'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface City {
  id: string
  name: string
  country: string
  description: string | null
  cover_image: string | null
  is_active: boolean
  hotels_count?: number
  created_at: string
  updated_at: string
}

export interface Zone {
  id: string
  city_id: string
  name: string
  description: string | null
  characteristics: string | null
  distance_center: string | null
  is_active: boolean
  city?: City
  hotels_count?: number
  created_at: string
  updated_at: string
}

export type HotelStatus = 'actif' | 'en_veille' | 'non_recommande' | 'a_verifier'
export type HotelCategory = '1' | '2' | '3' | '4' | '5' | 'apart' | 'riad' | 'resort'
export type BoardType = 'sans' | 'logement' | 'pd' | 'demi' | 'complet' | 'all_inclusive' | 'ultra_all'
export type BeachType = 'sable_fin' | 'sable_grossier' | 'galets' | 'rochers' | 'lagon' | 'piscine_privee'
export type Ambiance = 'familial' | 'romantique' | 'festif' | 'calme' | 'sportif' | 'luxe' | 'backpacker'

export interface Hotel {
  id: string
  city_id: string
  zone_id: string | null
  name: string
  slug: string
  category: HotelCategory
  stars: number
  status: HotelStatus
  address: string | null
  landmark: string | null
  beach_distance: string | null
  beach_type: BeachType | null
  ambiance: Ambiance | null
  target_audience: string | null
  board_types: BoardType[]
  animation_level: string | null
  room_quality: string | null
  food_quality: string | null
  pool_quality: string | null
  beach_quality: string | null
  value_for_money: string | null
  strengths: string[] | null
  weaknesses: string[] | null
  commercial_summary: string | null
  internal_notes: string | null
  aelia_note: string | null
  cover_image: string | null
  website_url: string | null
  booking_url: string | null
  tiktok_url: string | null
  instagram_url: string | null
  facebook_url: string | null
  latitude: number | null
  longitude: number | null
  map_static_url: string | null
  google_maps_url: string | null
  global_score: number | null
  last_updated_by: string | null
  last_reviewed_at: string | null
  is_deleted: boolean
  city?: City
  zone?: Zone
  scores?: HotelScore
  created_at: string
  updated_at: string
}

export interface HotelScore {
  id: string
  hotel_id: string
  location_score: number
  beach_score: number
  food_score: number
  rooms_score: number
  animation_score: number
  cleanliness_score: number
  value_score: number
  commercial_score: number
  reliability_score: number
  average_score: number
  final_score: number
  updated_at: string
}

export interface HotelReview {
  id: string
  hotel_id: string
  author_id: string
  source: string | null
  review_date: string
  positive_trends: string | null
  negative_trends: string | null
  recurring_remarks: string | null
  watch_points: string | null
  short_conclusion: string | null
  raw_summary: string | null
  created_at: string
  updated_at: string
  author?: Profile
}

export type PriceSeason = 'basse' | 'moyenne' | 'haute' | 'tres_haute'
export type PriceStatus = 'valide' | 'a_confirmer' | 'expire' | 'indicatif'
export type PriceCurrency = 'EUR' | 'USD' | 'MAD' | 'TND' | 'DZD'

export interface PriceSnapshot {
  id: string
  hotel_id: string
  author_id: string
  observation_date: string
  period_start: string | null
  period_end: string | null
  season: PriceSeason | null
  room_type: string | null
  board_type: BoardType | null
  adults: number
  children: number
  currency: PriceCurrency
  price: number
  price_per_person: number | null
  source_platform: string | null
  source_url: string | null
  comment: string | null
  status: PriceStatus
  hotel?: Hotel
  created_at: string
}

export type ClientProfileType =
  | 'famille'
  | 'couple'
  | 'petit_budget'
  | 'luxe'
  | 'plage_directe'
  | 'animation_forte'
  | 'calme'
  | 'adultes'
  | 'groupe'
  | 'rapport_qualite_prix'

export interface ClientProfile {
  id: string
  name: ClientProfileType
  label: string
  description: string | null
  icon: string | null
  color: string | null
  created_at: string
}

export interface HotelProfileMatch {
  hotel_id: string
  profile_id: string
  match_level: 'parfait' | 'bon' | 'possible' | 'deconseille'
  notes: string | null
}

export interface HotelMedia {
  id: string
  hotel_id: string
  author_id: string
  type: 'image' | 'capture' | 'document' | 'link' | 'social'
  url: string
  caption: string | null
  source: string | null
  created_at: string
}

export interface Source {
  id: string
  hotel_id: string
  name: string
  url: string | null
  type: 'site_officiel' | 'ota' | 'avis' | 'presse' | 'interne' | 'autre'
  notes: string | null
  created_at: string
}

export interface OfferRequest {
  id: string
  author_id: string
  client_name: string
  client_email: string | null
  city_id: string
  check_in: string
  check_out: string
  adults: number
  children: number
  budget_min: number | null
  budget_max: number | null
  currency: PriceCurrency
  profile_ids: string[]
  notes: string | null
  status: 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire'
  city?: City
  recommendations?: OfferRecommendation[]
  created_at: string
  updated_at: string
}

export interface OfferRecommendation {
  id: string
  offer_id: string
  hotel_id: string
  rank: number
  commercial_summary: string | null
  strengths_highlight: string | null
  weaknesses_mention: string | null
  estimated_price: number | null
  currency: PriceCurrency
  final_recommendation: string | null
  hotel?: Hotel
}

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  entity_name: string | null
  details: Record<string, unknown> | null
  created_at: string
  user?: Profile
}

// Utility types
export interface ScoreBadgeConfig {
  label: string
  class: string
  emoji: string
}

export function getScoreBadge(score: number): ScoreBadgeConfig {
  if (score >= 8) return { label: 'Excellent', class: 'score-badge-excellent', emoji: '⭐' }
  if (score >= 6.5) return { label: 'Bien', class: 'score-badge-good', emoji: '👍' }
  if (score >= 5) return { label: 'Moyen', class: 'score-badge-average', emoji: '⚡' }
  return { label: 'Faible', class: 'score-badge-poor', emoji: '⚠️' }
}

export function getStatusConfig(status: HotelStatus) {
  const map = {
    actif: { label: 'Actif', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    en_veille: { label: 'En veille', class: 'bg-slate-50 text-slate-600 border-slate-200' },
    non_recommande: { label: 'Non recommandé', class: 'bg-red-50 text-red-700 border-red-200' },
    a_verifier: { label: 'À vérifier', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  }
  return map[status]
}

export function getCategoryLabel(cat: HotelCategory) {
  const map: Record<HotelCategory, string> = {
    '1': '1 étoile', '2': '2 étoiles', '3': '3 étoiles',
    '4': '4 étoiles', '5': '5 étoiles',
    'apart': 'Appartement', 'riad': 'Riad', 'resort': 'Resort',
  }
  return map[cat] || cat
}

export const BOARD_LABELS: Record<BoardType, string> = {
  sans: 'Sans repas',
  logement: 'Logement seul',
  pd: 'Petit-déjeuner',
  demi: 'Demi-pension',
  complet: 'Pension complète',
  all_inclusive: 'All Inclusive',
  ultra_all: 'Ultra All Inclusive',
}

export const PROFILE_CONFIG: Record<ClientProfileType, { label: string; icon: string; color: string }> = {
  famille: { label: 'Famille', icon: '👨‍👩‍👧', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  couple: { label: 'Couple', icon: '❤️', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  petit_budget: { label: 'Petit budget', icon: '💰', color: 'bg-green-50 text-green-700 border-green-200' },
  luxe: { label: 'Luxe', icon: '✨', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  plage_directe: { label: 'Plage directe', icon: '🏖️', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  animation_forte: { label: 'Animation', icon: '🎉', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  calme: { label: 'Calme', icon: '🧘', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  adultes: { label: 'Adultes', icon: '🍷', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  groupe: { label: 'Groupe', icon: '👥', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  rapport_qualite_prix: { label: 'Bon rapport Q/P', icon: '⚖️', color: 'bg-orange-50 text-orange-700 border-orange-200' },
}
