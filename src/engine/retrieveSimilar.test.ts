import { describe, it, expect } from 'vitest'
import {
  cosineSimilarity,
  jaccardSimilarity,
  ocrTextSimilarity,
  retrieveSimilar,
  computeSimilarSignalScores,
  calculateSimilarScore,
  generateSimilarReasons,
} from './retrieveSimilar'
import { demoPhotos } from '../data/demoPhotos'

describe('retrieveSimilar Engine', () => {
  describe('cosineSimilarity', () => {
    it('returns 1.0 for identical unit vectors', () => {
      const v = [0.6, 0.8]
      expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 4)
    })

    it('returns 0 for orthogonal vectors', () => {
      const v1 = [1, 0]
      const v2 = [0, 1]
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(0.0, 4)
    })

    it('handles null, undefined, or empty vectors gracefully', () => {
      expect(cosineSimilarity(null, [1, 2])).toBe(0)
      expect(cosineSimilarity([1, 2], undefined)).toBe(0)
      expect(cosineSimilarity([], [])).toBe(0)
      expect(cosineSimilarity([1, 2], [1])).toBe(0)
    })
  })

  describe('jaccardSimilarity', () => {
    it('computes set overlap accurately (case-insensitive)', () => {
      expect(jaccardSimilarity(['Pill', 'Packaging'], ['pill', 'bottle'])).toBeCloseTo(1 / 3, 4)
      expect(jaccardSimilarity(['Pill', 'Packaging'], ['Pill', 'Packaging'])).toBe(1.0)
      expect(jaccardSimilarity(['Pill'], ['Ocean'])).toBe(0.0)
    })

    it('returns 0 for empty arrays', () => {
      expect(jaccardSimilarity([], [])).toBe(0)
      expect(jaccardSimilarity(null, ['A'])).toBe(0)
    })
  })

  describe('ocrTextSimilarity', () => {
    it('computes token-level Jaccard overlap', () => {
      expect(ocrTextSimilarity('Paracetamol 500mg tablets', 'Paracetamol 500mg strips')).toBeGreaterThan(0.4)
      expect(ocrTextSimilarity('Dr. Sharma Rx', 'Apollo Pharmacy')).toBe(0)
    })
  })

  describe('Scoring Formula & Signal Weights', () => {
    it('weights signals: visual 0.50, object 0.25, semantic 0.20, context 0.05', () => {
      const scores = {
        visualSim: 1.0,
        objectSim: 0.5,
        semanticSim: 0.5,
        contextSim: 0.0,
      }
      // 1.0 * 0.5 + 0.5 * 0.25 + 0.5 * 0.2 + 0 = 0.5 + 0.125 + 0.10 = 0.725
      expect(calculateSimilarScore(scores)).toBeCloseTo(0.725, 4)
    })
  })

  describe('Phase 6 Requirements & Scenarios', () => {
    // 6.2 Cross-Year Constraint: medicine-2023 -> medicine-2025 in top 3
    it('medicine-2023 clue surfaces medicine-2025 in top 3 results (cross-year retrieval)', () => {
      // Find a medicine-2023 photo (e.g. demo-201: Medicine strips 2023)
      const med2023Clue = demoPhotos.find((p) => p.eventId === 'med-2023')!
      expect(med2023Clue).toBeDefined()

      const results = retrieveSimilar(med2023Clue.id, demoPhotos, { topK: 10 })
      expect(results.length).toBeGreaterThan(0)

      // The top 3 results must include at least one medicine-2025 photo
      const top3 = results.slice(0, 3)
      const hasMed2025InTop3 = top3.some((r) => r.photo.eventId === 'med-2025')
      expect(hasMed2025InTop3).toBe(true)

      // Clue itself should not be in results
      expect(results.some((r) => r.photo.id === med2023Clue.id)).toBe(false)
    })

    // doc-2022 -> doc-2024 appears
    it('doc-2022 clue surfaces doc-2024 in top results (cross-year documents)', () => {
      const doc2022Clue = demoPhotos.find((p) => p.eventId === 'doc-2022')!
      expect(doc2022Clue).toBeDefined()

      const results = retrieveSimilar(doc2022Clue.id, demoPhotos, { topK: 10 })
      expect(results.length).toBeGreaterThan(0)

      const hasDoc2024 = results.slice(0, 5).some((r) => r.photo.eventId === 'doc-2024')
      expect(hasDoc2024).toBe(true)
    })

    // Negative test: medicine photo -> beach photo does NOT appear
    it('medicine clue does NOT surface unrelated beach photos in top results', () => {
      const med2023Clue = demoPhotos.find((p) => p.eventId === 'med-2023')!
      const results = retrieveSimilar(med2023Clue.id, demoPhotos, { topK: 10 })

      // No Goa beach photo should appear in top 10 results for a medicine clue
      const hasBeachInTopResults = results.some(
        (r) => r.photo.eventId === 'goa-2024' && r.photo.labels.includes('Beach')
      )
      expect(hasBeachInTopResults).toBe(false)
    })

    // 6.3 Reason Chip Generation
    it('generates reason chips for similar results', () => {
      const med2023Clue = demoPhotos.find((p) => p.eventId === 'med-2023')!
      const med2025Photo = demoPhotos.find((p) => p.eventId === 'med-2025')!

      const scores = computeSimilarSignalScores(med2023Clue, med2025Photo)
      const chips = generateSimilarReasons(med2023Clue, med2025Photo, scores)

      expect(chips.length).toBeGreaterThan(0)
      expect(chips[0].type).toBe('visual')
      expect(
        chips.some(
          (c) =>
            c.label.includes('appearance') ||
            c.label.includes('packaging') ||
            c.label.includes('pill') ||
            c.label.includes('object')
        )
      ).toBe(true)
    })
  })
})
