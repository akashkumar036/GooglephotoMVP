import type { Photo } from '../types'

export interface SignalStrength {
  hasEmbedding: boolean
  hasLocation: boolean
  hasEvent: boolean
  hasPeople: boolean
  hasOCR: boolean
  dominantSignal: 'visual' | 'contextual' | 'balanced'
}

export interface AdaptiveWeights {
  visual: number
  object: number
  semantic: number
  context: number
  event: number
  temporal: number
  location: number
  people: number
}

/**
 * Analyzes a clue photo to evaluate available signal strengths
 * and decide which retrieval mode/weighting should dominate.
 */
export function analyzeClueSignals(clue: Photo): SignalStrength {
  const hasEmbedding = Boolean(clue.embedding && clue.embedding.length > 0)
  const hasLocation = Boolean(
    (clue.latitude !== null && clue.longitude !== null) ||
    Boolean(clue.locationName && clue.locationName.trim().length > 0)
  )
  const hasEvent = Boolean(clue.eventId || clue.tripId)
  const hasPeople = Boolean(clue.people && clue.people.length > 0)
  const hasOCR = Boolean(clue.ocrText && clue.ocrText.trim().length > 0)

  const isTrip = Boolean(clue.tripId)
  const isDocumentOrMedicine =
    clue.eventId?.startsWith('med') ||
    clue.eventId?.startsWith('doc') ||
    (clue.labels || []).some((l) =>
      ['medicine', 'health', 'document', 'invoice', 'receipt', 'certificate'].includes(
        l.toLowerCase()
      )
    )

  let dominantSignal: 'visual' | 'contextual' | 'balanced' = 'balanced'

  if (isDocumentOrMedicine || (hasOCR && !isTrip)) {
    // Medicine, documents, and packaging focus on visual appearance, text, and object properties
    dominantSignal = 'visual'
  } else if (isTrip || (hasEvent && hasLocation && !hasOCR)) {
    // Vacations, trips, and location-bound events focus on time, place, and cluster context
    dominantSignal = 'contextual'
  } else if (hasOCR && hasEvent) {
    dominantSignal = 'balanced'
  } else if (hasLocation && hasPeople && !hasOCR) {
    dominantSignal = 'contextual'
  } else if (hasEmbedding && (clue.objects || []).length > 0 && !hasEvent && !hasLocation) {
    dominantSignal = 'visual'
  } else {
    dominantSignal = 'balanced'
  }

  return {
    hasEmbedding,
    hasLocation,
    hasEvent,
    hasPeople,
    hasOCR,
    dominantSignal,
  }
}

/**
 * Computes dynamic adaptive weights according to Phase 8 spec:
 *
 * if dominantSignal === 'visual':
 *   visual × 0.45, object × 0.30, semantic × 0.20, context × 0.05
 *
 * if dominantSignal === 'contextual':
 *   event × 0.30, temporal × 0.25, location × 0.25, people × 0.15, visual × 0.05
 *
 * if balanced:
 *   visual × 0.25, object × 0.20, event × 0.20, temporal × 0.15, location × 0.10, people × 0.10
 */
export function getAdaptiveWeights(
  dominantSignal: 'visual' | 'contextual' | 'balanced'
): AdaptiveWeights {
  switch (dominantSignal) {
    case 'visual':
      return {
        visual: 0.45,
        object: 0.3,
        semantic: 0.2,
        context: 0.05,
        event: 0.0,
        temporal: 0.0,
        location: 0.0,
        people: 0.0,
      }
    case 'contextual':
      return {
        visual: 0.05,
        object: 0.0,
        semantic: 0.0,
        context: 0.0,
        event: 0.3,
        temporal: 0.25,
        location: 0.25,
        people: 0.15,
      }
    case 'balanced':
    default:
      return {
        visual: 0.25,
        object: 0.2,
        semantic: 0.0,
        context: 0.0,
        event: 0.2,
        temporal: 0.15,
        location: 0.1,
        people: 0.1,
      }
  }
}
