import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'dd MMM yyyy', { locale: fr })
}

export function formatDateShort(date: string | Date) {
  return format(new Date(date), 'dd/MM/yyyy', { locale: fr })
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { locale: fr, addSuffix: true })
}

export function formatPrice(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function calculateAverageScore(scores: Record<string, number>): number {
  const values = Object.values(scores).filter(v => v > 0)
  if (values.length === 0) return 0
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '…'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function generateCommercialSummary(hotel: {
  name: string
  stars?: number
  ambiance?: string | null
  beach_distance?: string | null
  strengths?: string[] | null
  board_types?: string[]
}): string {
  const parts: string[] = []
  
  if (hotel.stars) {
    parts.push(`Hôtel ${hotel.stars} étoiles`)
  }
  
  if (hotel.ambiance) {
    const ambianceMap: Record<string, string> = {
      familial: 'à ambiance familiale',
      romantique: 'romantique et intimiste',
      festif: 'animé et festif',
      calme: 'calme et reposant',
      luxe: 'haut de gamme',
    }
    parts.push(ambianceMap[hotel.ambiance] || hotel.ambiance)
  }

  if (hotel.beach_distance) {
    parts.push(`à ${hotel.beach_distance} de la plage`)
  }

  let summary = `${hotel.name} — ${parts.join(', ')}.`

  if (hotel.strengths && hotel.strengths.length > 0) {
    summary += ` Points forts : ${hotel.strengths.slice(0, 2).join(', ')}.`
  }

  return summary
}
