import type { Photo, ReasonChip, RetrievalResult } from '../types'
import {
  cosineSimilarity,
  jaccardSimilarity,
  ocrTextSimilarity,
  contextSimilarity,
  generateSimilarReasons,
  type SignalScores,
} from './retrieveSimilar'
import {
  temporalScore,
  locationScore,
  eventScore,
  peopleScore,
  generateMemoryReasons,
  type MemorySignalScores,
} from './retrieveMemory'
import {
  analyzeClueSignals,
  getAdaptiveWeights,
  type SignalStrength,
  type AdaptiveWeights,
} from './analyzeClueSignals'
import { resolvePhotos, type DatasetType } from './dataset'

export interface BestMatchSignalBreakdown {
  visual: number
  object: number
  semantic: number
  context: number
  event: number
  temporal: number
  location: number
  people: number
  ocr: number
}

export interface BestMatchResult extends RetrievalResult {
  breakdown: BestMatchSignalBreakdown
  dominantSignal: 'visual' | 'contextual' | 'balanced'
}

/**
 * Computes per-signal metrics for a candidate photo given a clue.
 */
export function computeBestMatchSignals(clue: Photo, candidate: Photo): BestMatchSignalBreakdown {
  const visual = cosineSimilarity(clue.embedding, candidate.embedding)
  const object = jaccardSimilarity(clue.objects, candidate.objects)
  const labelSim = jaccardSimilarity(clue.labels, candidate.labels)
  const ocr = ocrTextSimilarity(clue.ocrText, candidate.ocrText)

  let semantic = labelSim
  if (clue.ocrText && candidate.ocrText) {
    semantic = labelSim * 0.6 + ocr * 0.4
  } else if (clue.ocrText || candidate.ocrText) {
    semantic = labelSim * 0.85
  }

  const context = contextSimilarity(clue, candidate)
  const event = eventScore(clue, candidate)
  const temporal = temporalScore(clue.dateTime, candidate.dateTime)
  const location = locationScore(clue, candidate)
  const people = peopleScore(clue, candidate)

  return {
    visual,
    object,
    semantic,
    context,
    event,
    temporal,
    location,
    people,
    ocr,
  }
}

/**
 * Applies adaptive weights to the signal breakdown to calculate total score.
 */
export function calculateAdaptiveScore(
  signals: BestMatchSignalBreakdown,
  weights: AdaptiveWeights
): number {
  return (
    signals.visual * weights.visual +
    signals.object * weights.object +
    signals.semantic * weights.semantic +
    signals.context * weights.context +
    signals.event * weights.event +
    signals.temporal * weights.temporal +
    signals.location * weights.location +
    signals.people * weights.people
  )
}

/**
 * Generates explainable reason chips for Best Match.
 */
export function generateBestMatchReasons(
  clue: Photo,
  candidate: Photo,
  signals: BestMatchSignalBreakdown,
  dominantSignal: 'visual' | 'contextual' | 'balanced'
): ReasonChip[] {
  // If balanced and both visual and contextual signals are strong
  if (dominantSignal === 'balanced') {
    const isStrongVisual = signals.visual >= 0.7 || signals.object >= 0.5
    const isStrongContext = signals.event >= 0.6 || signals.temporal >= 0.6 || signals.location >= 0.6

    if (isStrongVisual && isStrongContext) {
      return [{ label: 'Strong visual + contextual match', type: 'visual' }]
    }
  }

  if (dominantSignal === 'visual') {
    const similarScores: SignalScores = {
      visualSim: signals.visual,
      objectSim: signals.object,
      semanticSim: signals.semantic,
      contextSim: signals.context,
      ocrSim: signals.ocr,
    }
    return generateSimilarReasons(clue, candidate, similarScores)
  }

  if (dominantSignal === 'contextual') {
    const memoryScores: MemorySignalScores = {
      eventScore: signals.event,
      temporalScore: signals.temporal,
      locationScore: signals.location,
      peopleScore: signals.people,
      visualScore: signals.visual,
    }
    return generateMemoryReasons(clue, candidate, memoryScores)
  }

  // Fallback for balanced: check whether visual or contextual scored higher on this specific candidate
  const visualContrib = signals.visual * 0.25 + signals.object * 0.2
  const contextContrib =
    signals.event * 0.2 + signals.temporal * 0.15 + signals.location * 0.1 + signals.people * 0.1

  if (visualContrib >= contextContrib) {
    const similarScores: SignalScores = {
      visualSim: signals.visual,
      objectSim: signals.object,
      semanticSim: signals.semantic,
      contextSim: signals.context,
      ocrSim: signals.ocr,
    }
    return generateSimilarReasons(clue, candidate, similarScores)
  } else {
    const memoryScores: MemorySignalScores = {
      eventScore: signals.event,
      temporalScore: signals.temporal,
      locationScore: signals.location,
      peopleScore: signals.people,
      visualScore: signals.visual,
    }
    return generateMemoryReasons(clue, candidate, memoryScores)
  }
}

export interface RetrieveBestOptions {
  excludeIds?: string[]
  seenResultIds?: string[]
  topK?: number
  minScore?: number
}

/**
 * Local Best Match retrieval engine using dynamic adaptive weighting.
 * Returns ranked candidate photos along with per-signal breakdowns.
 * Dataset-agnostic: accepts dataset name ('demo' | 'user') or explicit Photo[] array.
 */
export function retrieveBest(
  cluePhotoId: string,
  photosOrDataset: DatasetType = 'demo',
  options: RetrieveBestOptions = {}
): BestMatchResult[] {
  const photos = resolvePhotos(photosOrDataset)
  const clue = photos.find((p) => p.id === cluePhotoId)
  if (!clue) return []

  const excludeSet = new Set(options.excludeIds ?? [])
  excludeSet.add(cluePhotoId)
  const seenSet = new Set(options.seenResultIds ?? [])

  const topK = options.topK ?? 20
  const minScore = options.minScore ?? 0.08

  // 1. Analyze clue signals
  const signalStrength: SignalStrength = analyzeClueSignals(clue)

  // 2. Compute dynamic weights based on signal strength
  const weights: AdaptiveWeights = getAdaptiveWeights(signalStrength.dominantSignal)

  const results: BestMatchResult[] = []

  // 3. Score candidates
  for (const candidate of photos) {
    if (excludeSet.has(candidate.id)) continue

    const breakdown = computeBestMatchSignals(clue, candidate)
    let score = calculateAdaptiveScore(breakdown, weights)

    // Slightly penalize (-0.1) photos already seen in previous results (Phase 10.3)
    if (seenSet.has(candidate.id)) {
      score = Math.max(0, score - 0.1)
    }

    if (score >= minScore) {
      const reasons = generateBestMatchReasons(
        clue,
        candidate,
        breakdown,
        signalStrength.dominantSignal
      )
      results.push({
        photo: candidate,
        score,
        reasons,
        breakdown,
        dominantSignal: signalStrength.dominantSignal,
      })
    }
  }

  // 4. Rank descending by adaptive score
  results.sort((a, b) => b.score - a.score)

  return results.slice(0, topK)
}

/**
 * Alias for retrieveBest matching architecture.md naming conventions.
 */
export const retrieveBestMatch = retrieveBest

