import { describe, it, expect } from 'vitest'
import { analyzeClueSignals, getAdaptiveWeights } from './analyzeClueSignals'
import {
  retrieveBest,
  computeBestMatchSignals,
  calculateAdaptiveScore,
  generateBestMatchReasons,
} from './retrieveBest'
import { demoPhotos } from '../data/demoPhotos'

describe('Best Match Retrieval Engine (Local)', () => {
  describe('8.1 Signal Strength Analysis', () => {
    it('identifies visual signals as dominant for medicine photos', () => {
      const medClue = demoPhotos.find((p) => p.eventId === 'med-2023')!
      expect(medClue).toBeDefined()

      const strength = analyzeClueSignals(medClue)
      expect(strength.hasEmbedding).toBe(true)
      expect(strength.hasOCR).toBe(true)
      expect(strength.dominantSignal).toBe('visual')
    })

    it('identifies visual signals as dominant for document photos', () => {
      const docClue = demoPhotos.find((p) => p.eventId === 'doc-2022')!
      expect(docClue).toBeDefined()

      const strength = analyzeClueSignals(docClue)
      expect(strength.dominantSignal).toBe('visual')
    })

    it('identifies contextual signals as dominant for vacation trip photos', () => {
      const goaClue = demoPhotos.find((p) => p.eventId === 'goa-2024')!
      expect(goaClue).toBeDefined()

      const strength = analyzeClueSignals(goaClue)
      expect(strength.hasEvent).toBe(true)
      expect(strength.hasLocation).toBe(true)
      expect(strength.dominantSignal).toBe('contextual')
    })
  })

  describe('8.2 Adaptive Weight Calculation', () => {
    it('calculates correct weights for visual dominant signal', () => {
      const weights = getAdaptiveWeights('visual')
      expect(weights.visual).toBe(0.45)
      expect(weights.object).toBe(0.3)
      expect(weights.semantic).toBe(0.2)
      expect(weights.context).toBe(0.05)
      expect(weights.event).toBe(0.0)
    })

    it('calculates correct weights for contextual dominant signal', () => {
      const weights = getAdaptiveWeights('contextual')
      expect(weights.event).toBe(0.3)
      expect(weights.temporal).toBe(0.25)
      expect(weights.location).toBe(0.25)
      expect(weights.people).toBe(0.15)
      expect(weights.visual).toBe(0.05)
    })

    it('calculates correct weights for balanced signal', () => {
      const weights = getAdaptiveWeights('balanced')
      expect(weights.visual).toBe(0.25)
      expect(weights.object).toBe(0.2)
      expect(weights.event).toBe(0.2)
      expect(weights.temporal).toBe(0.15)
      expect(weights.location).toBe(0.1)
      expect(weights.people).toBe(0.1)
    })
  })

  describe('8.3 & 8.4 Combined Scoring & Scenarios', () => {
    it('computes breakdown signals and applies adaptive score accurately', () => {
      const clue = demoPhotos[0]
      const candidate = demoPhotos[1]
      const breakdown = computeBestMatchSignals(clue, candidate)

      expect(breakdown).toBeDefined()
      expect(typeof breakdown.visual).toBe('number')
      expect(typeof breakdown.event).toBe('number')
      expect(typeof breakdown.temporal).toBe('number')

      const weights = getAdaptiveWeights('balanced')
      const score = calculateAdaptiveScore(breakdown, weights)
      expect(typeof score).toBe('number')
      expect(score).toBeGreaterThanOrEqual(0)
    })

    it('medicine clue -> visual signals dominate and surfaces medicine photos in top-10', () => {
      const medClue = demoPhotos.find((p) => p.eventId === 'med-2023')!
      const results = retrieveBest(medClue.id, demoPhotos, { topK: 10 })

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].dominantSignal).toBe('visual')
      expect(results[0].breakdown).toBeDefined()

      // Top 3 should be medicine photos
      const top3 = results.slice(0, 3)
      const allMedicine = top3.every(
        (r) => r.photo.eventId === 'med-2023' || r.photo.eventId === 'med-2025'
      )
      expect(allMedicine).toBe(true)

      // Reason chips reflect visual signals
      const firstChip = results[0].reasons[0]
      expect(firstChip.type).toMatch(/visual|text/)
      expect(firstChip.label.toLowerCase()).toMatch(/appearance|packaging|pill|text|object/)
    })

    it('trip clue (Goa) -> contextual signals dominate and surfaces Goa trip photos in top-10', () => {
      const goaClue = demoPhotos.find((p) => p.eventId === 'goa-2024')!
      const results = retrieveBest(goaClue.id, demoPhotos, { topK: 10 })

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].dominantSignal).toBe('contextual')
      expect(results[0].breakdown).toBeDefined()

      // Top results should be from Goa trip
      const top5 = results.slice(0, 5)
      const allGoa = top5.every((r) => r.photo.locationName?.includes('Goa'))
      expect(allGoa).toBe(true)

      // Reason chips reflect contextual signals
      const reasons = results[0].reasons
      expect(reasons.some((c) => ['event', 'location', 'temporal'].includes(c.type))).toBe(true)
    })

    it('generates "Strong visual + contextual match" chip when both signals are high in balanced mode', () => {
      const clue = demoPhotos[0]
      const candidate = demoPhotos[1]
      const signals = {
        visual: 0.85,
        object: 0.6,
        semantic: 0.5,
        context: 0.5,
        event: 0.8,
        temporal: 0.8,
        location: 0.8,
        people: 0.0,
        ocr: 0.0,
      }

      const chips = generateBestMatchReasons(clue, candidate, signals, 'balanced')
      expect(chips[0].label).toBe('Strong visual + contextual match')
      expect(chips[0].type).toBe('visual')
    })
  })
})
