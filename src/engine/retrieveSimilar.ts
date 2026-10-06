import type { Photo, ReasonChip, RetrievalResult } from '../types'
import { resolvePhotos, type DatasetType } from './dataset'

export interface SignalScores {
  visualSim: number
  objectSim: number
  semanticSim: number
  contextSim: number
  ocrSim?: number
}

/**
 * Computes cosine similarity between two embedding vectors.
 * Clamped to [0, 1] range.
 */
export function cosineSimilarity(
  a: number[] | null | undefined,
  b: number[] | null | undefined
): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0
  }

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  if (denom === 0) return 0

  const cos = dot / denom
  return Math.max(0, Math.min(1, cos))
}

/**
 * Computes Jaccard similarity between two string arrays (case-insensitive).
 * |A ∩ B| / |A ∪ B|
 */
export function jaccardSimilarity(
  a: string[] | null | undefined,
  b: string[] | null | undefined
): number {
  if (!a || !b) return 0

  const setA = new Set(a.map((s) => s.trim().toLowerCase()).filter(Boolean))
  const setB = new Set(b.map((s) => s.trim().toLowerCase()).filter(Boolean))

  if (setA.size === 0 && setB.size === 0) return 0

  let intersection = 0
  for (const item of setA) {
    if (setB.has(item)) intersection++
  }

  const union = setA.size + setB.size - intersection
  if (union === 0) return 0

  return intersection / union
}

/**
 * Computes token-level Jaccard overlap on OCR text.
 */
export function ocrTextSimilarity(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  if (!a || !b) return 0

  const tokenize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1)

  const tokensA = tokenize(a)
  const tokensB = tokenize(b)

  return jaccardSimilarity(tokensA, tokensB)
}

/**
 * Weak contextual similarity boost for similar mode (0.0 - 1.0).
 * Note: explicitly excludes date/time!
 */
export function contextSimilarity(clue: Photo, candidate: Photo): number {
  if (clue.eventId && candidate.eventId && clue.eventId === candidate.eventId) {
    return 1.0
  }
  if (clue.tripId && candidate.tripId && clue.tripId === candidate.tripId) {
    return 0.7
  }
  if (clue.locationName && candidate.locationName && clue.locationName === candidate.locationName) {
    return 0.4
  }
  return 0.0
}

/**
 * Computes all component signals for Search Similar.
 * Explicitly excludes date from any computation to support cross-year retrieval.
 */
export function computeSimilarSignalScores(clue: Photo, candidate: Photo): SignalScores {
  const visualSim = cosineSimilarity(clue.embedding, candidate.embedding)
  const objectSim = jaccardSimilarity(clue.objects, candidate.objects)
  const ocrSim = ocrTextSimilarity(clue.ocrText, candidate.ocrText)
  const labelSim = jaccardSimilarity(clue.labels, candidate.labels)

  // Combine label similarity and OCR text overlap
  let semanticSim = labelSim
  if (clue.ocrText && candidate.ocrText) {
    semanticSim = labelSim * 0.6 + ocrSim * 0.4
  } else if (clue.ocrText || candidate.ocrText) {
    semanticSim = labelSim * 0.85
  }

  const contextSim = contextSimilarity(clue, candidate)

  return {
    visualSim,
    objectSim,
    semanticSim,
    contextSim,
    ocrSim,
  }
}

/**
 * Combines signals using the weighted formula from Phase 6 spec:
 * score = visual_sim × 0.50 + object_sim × 0.25 + semantic_sim × 0.20 + context_sim × 0.05
 */
export function calculateSimilarScore(scores: SignalScores): number {
  return (
    scores.visualSim * 0.5 +
    scores.objectSim * 0.25 +
    scores.semanticSim * 0.2 +
    scores.contextSim * 0.05
  )
}

/**
 * Generates reason explanation chips based on dominant contributing signals.
 */
export function generateSimilarReasons(
  clue: Photo,
  result: Photo,
  scores: SignalScores
): ReasonChip[] {
  const reasons: ReasonChip[] = []

  const lowerObjectsA = (clue.objects || []).map((o) => o.toLowerCase())
  const matchingObjects = (result.objects || []).filter((o) =>
    lowerObjectsA.includes(o.toLowerCase())
  )

  // 1. Visual appearance match
  if (scores.visualSim >= 0.75) {
    reasons.push({ label: 'Similar appearance', type: 'visual' })
  }

  // 2. Object match
  if (matchingObjects.length > 0 && scores.objectSim >= 0.25) {
    const obj = matchingObjects[0].toLowerCase()
    if (obj === 'packaging') {
      reasons.push({ label: 'Similar packaging', type: 'visual' })
    } else if (obj === 'pill') {
      reasons.push({ label: 'Similar pill / medicine', type: 'visual' })
    } else {
      reasons.push({ label: `Similar ${obj}`, type: 'visual' })
    }
  } else if (scores.objectSim >= 0.4) {
    reasons.push({ label: 'Similar object', type: 'visual' })
  }

  // 3. Text overlap match
  if (scores.ocrSim && scores.ocrSim >= 0.3) {
    reasons.push({ label: 'Similar text', type: 'text' })
  }

  // Fallback if no specific chips triggered
  if (reasons.length === 0) {
    if (scores.visualSim >= 0.5) {
      reasons.push({ label: 'Visual match', type: 'visual' })
    } else if (scores.semanticSim >= 0.4) {
      reasons.push({ label: 'Similar category', type: 'visual' })
    } else {
      reasons.push({ label: 'Visual similarity', type: 'visual' })
    }
  }

  // At most 2 chips
  return reasons.slice(0, 2)
}

export interface RetrieveSimilarOptions {
  excludeIds?: string[]
  seenResultIds?: string[]
  topK?: number
  minScore?: number
}

/**
 * Core retrieval function for mode = 'similar'.
 * Ranks all candidate photos against the clue photo.
 * Dataset-agnostic: accepts dataset name ('demo' | 'user') or explicit Photo[] array.
 */
export function retrieveSimilar(
  cluePhotoId: string,
  photosOrDataset: DatasetType = 'demo',
  options: RetrieveSimilarOptions = {}
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

    const scores = computeSimilarSignalScores(clue, candidate)
    let score = calculateSimilarScore(scores)

    // Slightly penalize (-0.1) photos already seen in previous results (Phase 10.3)
    if (seenSet.has(candidate.id)) {
      score = Math.max(0, score - 0.1)
    }

    if (score >= minScore) {
      const reasons = generateSimilarReasons(clue, candidate, scores)
      results.push({
        photo: candidate,
        score,
        reasons,
      })
    }
  }

  // Sort descending by score
  results.sort((a, b) => b.score - a.score)

  return results.slice(0, topK)
}

