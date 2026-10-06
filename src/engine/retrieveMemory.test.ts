import { describe, it, expect } from 'vitest'
import {
  haversine,
  temporalScore,
  locationScore,
  eventScore,
  peopleScore,
  calculateMemoryScore,
  computeMemorySignalScores,
  generateMemoryReasons,
  retrieveMemory,
} from './retrieveMemory'
import { demoPhotos } from '../data/demoPhotos'

describe('retrieveMemory Engine', () => {
  describe('haversine', () => {
    it('returns 0 km for identical coordinates', () => {
      const p = { latitude: 15.2993, longitude: 74.124 }
      expect(haversine(p, p)).toBe(0)
    })

    it('calculates realistic distance between two geographic coordinates', () => {
      // Mumbai to Pune is ~120-150 km
      const mumbai = { latitude: 19.076, longitude: 72.8777 }
      const pune = { latitude: 18.5204, longitude: 73.8567 }
      const dist = haversine(mumbai, pune)
      expect(dist).toBeGreaterThan(100)
      expect(dist).toBeLessThan(160)
    })
  })

  describe('temporalScore (Gaussian decay)', () => {
    it('returns 1.0 for same timestamp', () => {
      const now = new Date('2024-03-10T18:00:00')
      expect(temporalScore(now, now)).toBe(1.0)
    })

    it('decays with Gaussian distribution for 2 hours difference (sigma = 4h)', () => {
      const d1 = new Date('2024-03-10T18:00:00')
      const d2 = new Date('2024-03-10T20:00:00')
      // exp(-(2^2) / (2 * 16)) = exp(-4/32) = exp(-0.125) ~ 0.8825
      expect(temporalScore(d1, d2, 4)).toBeCloseTo(0.8825, 3)
    })

    it('returns near 0 for distant dates (e.g. 1 year apart)', () => {
      const d1 = new Date('2023-01-01T12:00:00')
      const d2 = new Date('2024-01-01T12:00:00')
      expect(temporalScore(d1, d2)).toBeLessThan(0.001)
    })

    it('returns 0 for null dates', () => {
      expect(temporalScore(null, new Date())).toBe(0)
      expect(temporalScore(new Date(), undefined)).toBe(0)
    })
  })

  describe('locationScore', () => {
    it('returns 1.0 for same GPS coordinates', () => {
      const clue = demoPhotos.find((p) => p.eventId === 'goa-2024')!
      expect(locationScore(clue, clue)).toBe(1.0)
    })

    it('returns high score for same location name fallback', () => {
      const p1 = { ...demoPhotos[0], latitude: null, longitude: null, locationName: 'Goa, India' }
      const p2 = { ...demoPhotos[1], latitude: null, longitude: null, locationName: 'Goa, India' }
      expect(locationScore(p1, p2)).toBe(1.0)
    })
  })

  describe('eventScore & peopleScore', () => {
    it('assigns 1.0 for same eventId and 0.6 for same tripId', () => {
      const p1 = { ...demoPhotos[0], eventId: 'event-A', tripId: 'trip-1' }
      const p2 = { ...demoPhotos[1], eventId: 'event-A', tripId: 'trip-1' }
      const p3 = { ...demoPhotos[2], eventId: 'event-B', tripId: 'trip-1' }
      const p4 = { ...demoPhotos[3], eventId: 'event-C', tripId: 'trip-2' }

      expect(eventScore(p1, p2)).toBe(1.0)
      expect(eventScore(p1, p3)).toBe(0.6)
      expect(eventScore(p1, p4)).toBe(0.0)
    })

    it('computes people overlap via Jaccard similarity', () => {
      const p1 = { ...demoPhotos[0], people: ['Alice', 'Bob'] }
      const p2 = { ...demoPhotos[1], people: ['Bob', 'Charlie'] }
      expect(peopleScore(p1, p2)).toBeCloseTo(1 / 3, 3)
    })
  })

  describe('Scoring Formula Weights', () => {
    it('combines signals with specified weights: 0.30 event, 0.25 temporal, 0.20 location, 0.15 people, 0.10 visual', () => {
      const scores = {
        eventScore: 1.0,
        temporalScore: 1.0,
        locationScore: 1.0,
        peopleScore: 1.0,
        visualScore: 1.0,
      }
      expect(calculateMemoryScore(scores)).toBeCloseTo(1.0, 4)

      const mixed = {
        eventScore: 1.0, // 0.30
        temporalScore: 0.5, // 0.125
        locationScore: 0.5, // 0.10
        peopleScore: 0.0, // 0.00
        visualScore: 0.0, // 0.00
      }
      expect(calculateMemoryScore(mixed)).toBeCloseTo(0.525, 4)
    })
  })

  describe('Phase 7.3 Key Scenario Test: Goa Restaurant -> Goa Beach', () => {
    it('Goa restaurant clue surfaces Goa beach target in top 5 results despite visual differences', () => {
      // Clue: Goa restaurant meal (demo-403)
      const restaurantClue = demoPhotos.find(
        (p) => p.eventId === 'goa-2024' && p.description?.includes('restaurant meal')
      )!
      expect(restaurantClue).toBeDefined()

      // Target: Goa beach sunset (demo-401)
      const beachTarget = demoPhotos.find(
        (p) => p.eventId === 'goa-2024' && p.description?.includes('beach sunset')
      )!
      expect(beachTarget).toBeDefined()

      // Execute Search Around Memory
      const results = retrieveMemory(restaurantClue.id, demoPhotos, { topK: 10 })
      expect(results.length).toBeGreaterThan(0)

      // Target must appear in the top 5 results
      const top5Ids = results.slice(0, 5).map((r) => r.photo.id)
      expect(top5Ids).toContain(beachTarget.id)

      // Verify reason chips reflect contextual relationship (event / temporal / location)
      const targetResult = results.find((r) => r.photo.id === beachTarget.id)!
      expect(targetResult.reasons.length).toBeGreaterThan(0)
      const reasonLabels = targetResult.reasons.map((r) => r.label.toLowerCase())
      expect(
        reasonLabels.some(
          (l) => l.includes('goa') || l.includes('location') || l.includes('taken') || l.includes('trip')
        )
      ).toBe(true)
    })

    it('does NOT surface unrelated cross-location photos (e.g. Delhi documents, Mumbai medicine) in top results', () => {
      const restaurantClue = demoPhotos.find(
        (p) => p.eventId === 'goa-2024' && p.description?.includes('restaurant meal')
      )!
      const results = retrieveMemory(restaurantClue.id, demoPhotos, { topK: 10 })

      // Top 5 should belong to Goa memory/trip
      const top5 = results.slice(0, 5)
      for (const res of top5) {
        expect(res.photo.locationName).toContain('Goa')
      }
    })
  })

  describe('Reason Chip Generation', () => {
    it('generates event, temporal, location, or people reason chips based on dominant signal', () => {
      const clue = demoPhotos.find((p) => p.eventId === 'goa-2024')!
      const candidate = demoPhotos.find((p) => p.id !== clue.id && p.eventId === 'goa-2024')!

      const scores = computeMemorySignalScores(clue, candidate)
      const chips = generateMemoryReasons(clue, candidate, scores)

      expect(chips.length).toBeGreaterThan(0)
      expect(['event', 'temporal', 'location', 'people', 'visual']).toContain(chips[0].type)
    })
  })
})
