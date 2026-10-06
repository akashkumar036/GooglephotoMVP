import { describe, it, expect, beforeEach } from 'vitest'
import { userTestPhotos } from '../data/userTestPhotos'
import { demoPhotos } from '../data/demoPhotos'
import { searchPhotos, searchPhotosScored, searchPhotosAsync } from './searchIndex'
import { retrieveSimilar } from './retrieveSimilar'
import { retrieveMemory } from './retrieveMemory'
import { retrieveBest, retrieveBestMatch } from './retrieveBest'
import { useAppStore } from '../store/appStore'

describe('Phase 12: My Photos Search & Retrieval Engine', () => {
  beforeEach(() => {
    // Populate store with user test photos for dataset: 'user' tests
    useAppStore.setState({
      activeMode: 'my-photos',
      userPhotos: userTestPhotos,
    })
  })

  describe('12.1 searchPhotos on User Photos', () => {
    it('searches user photos index by keyword (dataset: "user")', () => {
      const results = searchPhotos('amoxicillin', 'user')
      expect(results.length).toBeGreaterThanOrEqual(2)
      // Both the medicine bottle and the pharmacy receipt contain 'amoxicillin'
      const ids = results.map((r) => r.id)
      expect(ids).toContain('user-health-10')
      expect(ids).toContain('user-health-11')
      expect(results[0].score).toBeGreaterThan(0)
    })

    it('searches across location names, labels, and event descriptions', () => {
      const kyotoResults = searchPhotos('kyoto', 'user')
      expect(kyotoResults.length).toBeGreaterThanOrEqual(4)
      expect(kyotoResults.some((r) => r.id === 'user-kyoto-1')).toBe(true)

      const dogResults = searchPhotos('retriever', 'user')
      expect(dogResults.length).toBeGreaterThanOrEqual(2)
      expect(dogResults.some((r) => r.id === 'user-pet-14')).toBe(true)
    })

    it('finds photo by filename even if metadata is missing', () => {
      const edgeResults = searchPhotos('sunset_nodata', 'user')
      expect(edgeResults.length).toBe(1)
      expect(edgeResults[0].id).toBe('user-edge-17')
    })

    it('supports searchPhotosScored and searchPhotosAsync', async () => {
      const scored = searchPhotosScored('birthday', 'user')
      expect(scored.length).toBeGreaterThan(0)
      expect(scored[0].photo).toBeDefined()
      expect(scored[0].score).toBeGreaterThan(0)

      const asyncResults = await searchPhotosAsync('birthday', 'user')
      expect(asyncResults.length).toBeGreaterThan(0)
      expect(asyncResults[0].id).toBe('user-bday-6')
    })
  })

  describe('12.2 retrieveSimilar on User Photos', () => {
    it('uses user visual embeddings and object signals', () => {
      const clueId = 'user-health-10' // amoxicillin medicine bottle
      const results = retrieveSimilar(clueId, 'user', { topK: 5 })

      expect(results.length).toBeGreaterThan(0)
      // Excludes clue itself
      expect(results.some((r) => r.photo.id === clueId)).toBe(false)

      // Prescription receipt or vitamin packaging should rank near top due to object / text overlap
      const topIds = results.slice(0, 3).map((r) => r.photo.id)
      expect(
        topIds.includes('user-health-11') || topIds.includes('user-health-12')
      ).toBe(true)

      // Contains appropriate explanation chip
      const topResult = results[0]
      expect(topResult.reasons.length).toBeGreaterThan(0)
    })

    it('retrieves similar photos using custom Photo[] array directly', () => {
      const clueId = 'user-pet-14' // sleeping golden retriever
      const results = retrieveSimilar(clueId, userTestPhotos, { topK: 5 })

      expect(results.length).toBeGreaterThan(0)
      // Another dog photo should score high
      const otherDog = results.find((r) => r.photo.id === 'user-pet-15')
      expect(otherDog).toBeDefined()
      expect(otherDog!.score).toBeGreaterThan(0.1)
    })
  })

  describe('12.3 retrieveMemory on User Photos', () => {
    it('uses user event clusters, tripId, and temporal proximity', () => {
      const clueId = 'user-kyoto-2' // matcha tea ceremony during Kyoto trip
      const results = retrieveMemory(clueId, 'user', { topK: 5 })

      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.photo.id === clueId)).toBe(false)

      // user-kyoto-1 is taken 45 min earlier at same event and same GPS location
      const goldenPavilion = results.find((r) => r.photo.id === 'user-kyoto-1')
      expect(goldenPavilion).toBeDefined()
      expect(goldenPavilion!.score).toBeGreaterThan(0.6)

      // Reason chips reflect event or location
      const hasEventOrLocationReason = goldenPavilion!.reasons.some(
        (chip) => chip.type === 'event' || chip.type === 'location' || chip.type === 'temporal'
      )
      expect(hasEventOrLocationReason).toBe(true)
    })

    it('groups family birthday moments by temporal proximity and people', () => {
      const clueId = 'user-bday-6' // birthday cake with candles
      const results = retrieveMemory(clueId, 'user', { topK: 5 })

      expect(results.length).toBeGreaterThan(0)
      // user-bday-7 is 15 minutes later blowing out candles
      const blowingCandles = results.find((r) => r.photo.id === 'user-bday-7')
      expect(blowingCandles).toBeDefined()
      expect(blowingCandles!.score).toBeGreaterThan(0.5)

      // Reason chips include temporal or event description
      expect(blowingCandles!.reasons.length).toBeGreaterThan(0)
    })
  })

  describe('12.4 retrieveBestMatch on User Photos', () => {
    it('adaptively weights visual vs contextual signals for user photos', () => {
      // Medicine bottle clue has OCR and medicine tags -> dominantSignal = 'visual'
      const medClueId = 'user-health-10'
      const medResults = retrieveBestMatch(medClueId, 'user', { topK: 5 })
      expect(medResults.length).toBeGreaterThan(0)
      expect(medResults[0].dominantSignal).toBe('visual')

      // Kyoto temple clue has tripId and location -> dominantSignal = 'contextual'
      const kyotoClueId = 'user-kyoto-1'
      const kyotoResults = retrieveBest(kyotoClueId, 'user', { topK: 5 })
      expect(kyotoResults.length).toBeGreaterThan(0)
      expect(kyotoResults[0].dominantSignal).toBe('contextual')
    })
  })

  describe('12.5 Dataset-Agnostic Retrieval', () => {
    it('seamlessly switches between "demo" and "user" datasets', () => {
      const demoClueId = demoPhotos[0].id
      const demoResults = retrieveSimilar(demoClueId, 'demo', { topK: 3 })
      expect(demoResults.length).toBeGreaterThan(0)
      expect(demoResults.every((r) => r.photo.source === 'demo')).toBe(true)

      const userClueId = userTestPhotos[0].id
      const userResults = retrieveSimilar(userClueId, 'user', { topK: 3 })
      expect(userResults.length).toBeGreaterThan(0)
      expect(userResults.every((r) => r.photo.source === 'user')).toBe(true)
    })
  })

  describe('12.6 Missing Metadata Resilience (Exit Criteria)', () => {
    it('handles photo with NO EXIF date, NO GPS, NO OCR, NO embedding without crash', () => {
      const missingClueId = 'user-edge-17' // sunset with null date, GPS, embedding

      // Test all 3 retrieval modes
      expect(() => retrieveSimilar(missingClueId, 'user')).not.toThrow()
      expect(() => retrieveMemory(missingClueId, 'user')).not.toThrow()
      expect(() => retrieveBestMatch(missingClueId, 'user')).not.toThrow()

      const similarResults = retrieveSimilar(missingClueId, 'user')
      expect(Array.isArray(similarResults)).toBe(true)
      for (const r of similarResults) {
        expect(isNaN(r.score)).toBe(false)
      }
    })

    it('handles photo with completely empty metadata (user-edge-19) safely', () => {
      const emptyClueId = 'user-edge-19'

      const resultsSimilar = retrieveSimilar(emptyClueId, 'user')
      expect(Array.isArray(resultsSimilar)).toBe(true)

      const resultsMemory = retrieveMemory(emptyClueId, 'user')
      expect(Array.isArray(resultsMemory)).toBe(true)

      const resultsBest = retrieveBestMatch(emptyClueId, 'user')
      expect(Array.isArray(resultsBest)).toBe(true)
    })

    it('candidate photos with missing metadata do not throw when scored against complete clue', () => {
      const completeClueId = 'user-kyoto-1'

      const results = retrieveBestMatch(completeClueId, 'user', { topK: 20 })
      expect(results.length).toBeGreaterThan(0)
      for (const r of results) {
        expect(isNaN(r.score)).toBe(false)
        expect(r.score).toBeGreaterThanOrEqual(0)
        expect(r.score).toBeLessThanOrEqual(1.0)
      }
    })
  })
})
