import type { Photo, ReasonChip, RetrievalResult } from '../types'
import { cosineSimilarity, jaccardSimilarity } from './retrieveSimilar'
import { resolvePhotos, type DatasetType } from './dataset'

export interface MemorySignalScores {
  eventScore: number
  temporalScore: number
  locationScore: number
  peopleScore: number
  visualScore: number
}

export interface LatLng {
  latitude: number
  longitude: number
}

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates.
 */
export function haversine(a: LatLng, b: LatLng): number {
  const R = 6371 // Earth radius in km
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180
  const lat1 = (a.latitude * Math.PI) / 180
  const lat2 = (b.latitude * Math.PI) / 180

  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return R * c
}

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return haversine({ latitude: lat1, longitude: lon1 }, { latitude: lat2, longitude: lon2 })
}

/**
 * Temporal proximity score using Gaussian decay.
 * exp(-Δh² / (2 * σ²)) where default σ = 4 hours.
 */
export function temporalScore(
  clueDate: Date | string | null | undefined,
  candidateDate: Date | string | null | undefined,
  sigmaHours = 4
): number {
  if (!clueDate || !candidateDate) return 0
  const d1 = clueDate instanceof Date ? clueDate : new Date(clueDate)
  const d2 = candidateDate instanceof Date ? candidateDate : new Date(candidateDate)
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0
  const deltaMs = Math.abs(d1.getTime() - d2.getTime())
  const deltaHours = deltaMs / (1000 * 60 * 60)
  return Math.exp(-(deltaHours ** 2) / (2 * (sigmaHours ** 2)))
}

/**
 * Location proximity score using distance decay: exp(-km / 10).
 * Falls back to locationName matching if GPS coordinates are unavailable.
 */
export function locationScore(clue: Photo, candidate: Photo): number {
  // If GPS coordinates are available on both photos
  if (
    clue.latitude !== null &&
    clue.longitude !== null &&
    candidate.latitude !== null &&
    candidate.longitude !== null
  ) {
    const km = haversine(
      { latitude: clue.latitude, longitude: clue.longitude },
      { latitude: candidate.latitude, longitude: candidate.longitude }
    )
    return Math.exp(-km / 10)
  }

  // Fallback to locationName string matching
  if (clue.locationName && candidate.locationName) {
    const nameA = clue.locationName.trim().toLowerCase()
    const nameB = candidate.locationName.trim().toLowerCase()
    if (nameA === nameB) return 1.0
    if (nameA.includes(nameB) || nameB.includes(nameA)) return 0.8
  }

  return 0.0
}

/**
 * Event / cluster match score.
 * Same eventId -> 1.0; same tripId -> 0.6; else 0.0.
 */
export function eventScore(clue: Photo, candidate: Photo): number {
  if (clue.eventId && candidate.eventId && clue.eventId === candidate.eventId) {
    return 1.0
  }
  if (clue.tripId && candidate.tripId && clue.tripId === candidate.tripId) {
    return 0.6
  }
  return 0.0
}

/**
 * People overlap score via Jaccard similarity.
 */
export function peopleScore(clue: Photo, candidate: Photo): number {
  return jaccardSimilarity(clue.people || [], candidate.people || [])
}

/**
 * Computes all component signals for Search Around Memory.
 */
export function computeMemorySignalScores(clue: Photo, candidate: Photo): MemorySignalScores {
  const evScore = eventScore(clue, candidate)
  const tempScore = temporalScore(clue.dateTime, candidate.dateTime)
  const locScore = locationScore(clue, candidate)
  const peopScore = peopleScore(clue, candidate)
  const visScore = cosineSimilarity(clue.embedding, candidate.embedding)

  return {
    eventScore: evScore,
    temporalScore: tempScore,
    locationScore: locScore,
    peopleScore: peopScore,
    visualScore: visScore,
  }
}

/**
 * Combines signals using the weighted formula from Phase 7 spec:
 * score = event_score × 0.30
 *       + temporal_score × 0.25
 *       + location_score × 0.20
 *       + people_score × 0.15
 *       + visual_score × 0.10
 */
export function calculateMemoryScore(scores: MemorySignalScores): number {
  return (
    scores.eventScore * 0.3 +
    scores.temporalScore * 0.25 +
    scores.locationScore * 0.2 +
    scores.peopleScore * 0.15 +
    scores.visualScore * 0.1
  )
}

/**
 * Formats a clean human-readable duration between two dates.
 */
function formatTimeDifference(clueDate: Date | string, targetDate: Date | string): string {
  const d1 = clueDate instanceof Date ? clueDate : new Date(clueDate)
  const d2 = targetDate instanceof Date ? targetDate : new Date(targetDate)
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 'Same period'

  const diffMs = Math.abs(d1.getTime() - d2.getTime())
  const diffMinutes = Math.round(diffMs / (1000 * 60))

  if (diffMinutes < 1) {
    return 'Taken moments from your clue'
  }
  if (diffMinutes < 60) {
    return `Taken ${diffMinutes} minutes from your clue`
  }
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) {
    return `Taken ${diffHours} hour${diffHours > 1 ? 's' : ''} from your clue`
  }
  const diffDays = Math.round(diffHours / 24)
  return `Taken ${diffDays} day${diffDays > 1 ? 's' : ''} from your clue`
}

/**
 * Generates reason chips reflecting the actual dominant relationship
 * (event, time, location, people).
 */
export function generateMemoryReasons(
  clue: Photo,
  result: Photo,
  scores: MemorySignalScores
): ReasonChip[] {
  const reasons: ReasonChip[] = []

  // Weighted signal contributions to determine dominant signal
  const contributions = [
    { type: 'event' as const, weighted: scores.eventScore * 0.3, raw: scores.eventScore },
    { type: 'temporal' as const, weighted: scores.temporalScore * 0.25, raw: scores.temporalScore },
    { type: 'location' as const, weighted: scores.locationScore * 0.2, raw: scores.locationScore },
    { type: 'people' as const, weighted: scores.peopleScore * 0.15, raw: scores.peopleScore },
  ].sort((a, b) => b.weighted - a.weighted)

  for (const item of contributions) {
    if (reasons.length >= 2) break

    if (item.type === 'event' && item.raw >= 0.5) {
      if (clue.tripId && result.tripId && clue.tripId === result.tripId) {
        // e.g. "goa-2024" -> "Same Goa trip"
        const tripName = clue.tripId.includes('goa') ? 'Same Goa trip' : 'Same trip'
        reasons.push({ label: tripName, type: 'event' })
      } else if (clue.eventName || result.eventName) {
        const evName = clue.eventName || result.eventName || 'event'
        reasons.push({ label: `Same ${evName}`, type: 'event' })
      } else {
        reasons.push({ label: 'Same event', type: 'event' })
      }
    } else if (item.type === 'temporal' && item.raw >= 0.3 && clue.dateTime && result.dateTime) {
      reasons.push({
        label: formatTimeDifference(clue.dateTime, result.dateTime),
        type: 'temporal',
      })
    } else if (item.type === 'location' && item.raw >= 0.4) {
      const locLabel = clue.locationName
        ? `Same location (${clue.locationName.split(',')[0].trim()})`
        : 'Same location'
      reasons.push({ label: locLabel, type: 'location' })
    } else if (item.type === 'people' && item.raw >= 0.3) {
      reasons.push({ label: 'Same people', type: 'people' })
    }
  }

  // Fallback if no specific contextual signal exceeded threshold
  if (reasons.length === 0) {
    if (scores.visualScore >= 0.6) {
      reasons.push({ label: 'Similar appearance', type: 'visual' })
    } else {
      reasons.push({ label: 'Related memory', type: 'event' })
    }
  }

  return reasons.slice(0, 2)
}

export interface RetrieveMemoryOptions {
  excludeIds?: string[]
  seenResultIds?: string[]
  topK?: number
  minScore?: number
}

/**
 * Core retrieval function for mode = 'memory'.
 * Surfaces photos connected to the clue's moment, place, people, or event.
 * Dataset-agnostic: accepts dataset name ('demo' | 'user') or explicit Photo[] array.
 */
export function retrieveMemory(
  cluePhotoId: string,
  photosOrDataset: DatasetType = 'demo',
  options: RetrieveMemoryOptions = {}
): RetrievalResult[] {
  const photos = resolvePhotos(photosOrDataset)
  const clue = photos.find((p) => p.id === cluePhotoId)
  if (!clue) return []

  const excludeSet = new Set(options.excludeIds ?? [])
  excludeSet.add(cluePhotoId)
  const seenSet = new Set(options.seenResultIds ?? [])

  const topK = options.topK ?? 20
  const minScore = options.minScore ?? 0.08

  const results: RetrievalResult[] = []

  for (const candidate of photos) {
    if (excludeSet.has(candidate.id)) continue

    const scores = computeMemorySignalScores(clue, candidate)
    let score = calculateMemoryScore(scores)

    // Slightly penalize (-0.1) photos already seen in previous results (Phase 10.3)
    if (seenSet.has(candidate.id)) {
      score = Math.max(0, score - 0.1)
    }

    if (score >= minScore) {
      const reasons = generateMemoryReasons(clue, candidate, scores)
      results.push({
        photo: candidate,
        score,
        reasons,
      })
    }
  }

  // Rank by score descending
  results.sort((a, b) => b.score - a.score)

  return results.slice(0, topK)
}

