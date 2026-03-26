import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function normalizeItemName(name: string): string {
  return name.toLowerCase().trim()
}

/** Days since a date, null-safe */
export function daysSince(date: string | null): number | null {
  if (!date) return null
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
}

/** Human-readable "4 uker siden" label */
export function timeSinceLabel(date: string | null): string | null {
  const days = daysSince(date)
  if (days === null) return null
  if (days === 0) return 'i dag'
  if (days === 1) return 'i går'
  if (days < 7) return `${days} dager siden`
  if (days < 14) return '1 uke siden'
  const weeks = Math.round(days / 7)
  if (weeks < 8) return `${weeks} uker siden`
  const months = Math.round(days / 30)
  return `${months} måneder siden`
}

/** Score an item for smart suggestions (0..1) */
export function scoreItem(params: {
  daysSincePurchase: number | null
  avgFrequencyDays: number | null
  isStarred: boolean
  associationWeight: number
  purchaseCount: number
}): number {
  const { daysSincePurchase, avgFrequencyDays, isStarred, associationWeight, purchaseCount } = params

  let timeScore = 0
  if (daysSincePurchase !== null && avgFrequencyDays !== null && avgFrequencyDays > 0) {
    timeScore = Math.min(daysSincePurchase / avgFrequencyDays, 1.5) / 1.5
  }

  const starScore = isStarred ? 1 : 0
  const togetherScore = associationWeight
  // Boost items with purchase history (not brand new)
  const historyScore = Math.min(purchaseCount / 5, 1)

  return (
    timeScore * 0.40 +
    starScore * 0.20 +
    togetherScore * 0.25 +
    historyScore * 0.15
  )
}
