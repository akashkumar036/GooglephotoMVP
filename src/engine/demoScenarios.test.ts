import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { demoPhotos } from '../data/demoPhotos'
import { searchPhotos } from './searchIndex'
import { retrieveSimilar, cosineSimilarity } from './retrieveSimilar'
import { retrieveMemory } from './retrieveMemory'
import { retrieveBest } from './retrieveBest'
import { rankCandidatesWithAi } from './aiRankingClient'
import { useAppStore } from '../store/appStore'
import type { Photo } from '../types'

describe('Phase 17 — Demo Scenario Validation', () => {
  // =========================================================================
  // Scenario A — Cross-year visual similarity
  // =========================================================================
  describe('Scenario A — Cross-year visual similarity', () => {
    it('executes Scenario A end-to-end: search "medicine" -> 2023 clue -> Search Similar -> 2025 target in top 5', () => {
      // 1. Search "medicine" -> 2023 medicine photo appears in results
      const searchResults = searchPhotos('medicine', demoPhotos)
      expect(searchResults.length).toBeGreaterThan(0)
      const med2023Photo = searchResults.find(
        (p) => p.eventId === 'med-2023' && p.description?.toLowerCase().includes('medicine')
      )
      expect(med2023Photo).toBeDefined()
      expect(med2023Photo!.dateTime?.getFullYear()).toBe(2023)

      // 2. Select -> Use as clue -> Search Similar
      const cluePhoto = med2023Photo!
      const similarResults = retrieveSimilar(cluePhoto.id, demoPhotos, { topK: 10 })
      expect(similarResults.length).toBeGreaterThan(0)

      // 3. 2025 medicine photo appears in top 5 results
      const top5 = similarResults.slice(0, 5)
      const med2025InTop5 = top5.find((r) => r.photo.eventId === 'med-2025')
      expect(med2025InTop5).toBeDefined()
      expect(med2025InTop5!.photo.dateTime?.getFullYear()).toBe(2025)

      // 4. Reason chip: "Similar appearance" or "Similar packaging"
      const reasonLabels = med2025InTop5!.reasons.map((r) => r.label)
      const hasExpectedReason = reasonLabels.some(
        (label) =>
          label.includes('Similar appearance') ||
          label.includes('Similar packaging') ||
          label.includes('Similar pill') ||
          label.includes('Visual')
      )
      expect(hasExpectedReason).toBe(true)

      // 5. Cross-year retrieval confirmed: clue is 2023, target is 2025, high visual similarity
      const visualSim = cosineSimilarity(cluePhoto.embedding, med2025InTop5!.photo.embedding)
      expect(visualSim).toBeGreaterThan(0.85)
    })
  })

  // =========================================================================
  // Scenario B — Same memory, different visual appearance
  // =========================================================================
  describe('Scenario B — Same memory, different visual appearance', () => {
    it('executes Scenario B end-to-end: search "goa" -> restaurant clue -> Search Around Memory -> beach target in top 5 with cosine < 0.5', () => {
      // 1. Search "goa" -> Goa restaurant photo appears
      const searchResults = searchPhotos('goa', demoPhotos)
      expect(searchResults.length).toBeGreaterThan(0)
      const restaurantPhoto = searchResults.find(
        (p) => p.description?.toLowerCase().includes('restaurant meal')
      )
      expect(restaurantPhoto).toBeDefined()
      expect(restaurantPhoto!.locationName).toContain('Goa')

      // 2. Select -> Use as clue -> Search Around This Memory
      const cluePhoto = restaurantPhoto!
      const memoryResults = retrieveMemory(cluePhoto.id, demoPhotos, { topK: 10 })
      expect(memoryResults.length).toBeGreaterThan(0)

      // 3. Goa beach photo appears in top 5
      const top5 = memoryResults.slice(0, 5)
      const beachTarget = top5.find(
        (r) =>
          r.photo.description?.toLowerCase().includes('beach') ||
          r.photo.labels?.some((l) => l.toLowerCase() === 'beach')
      )
      expect(beachTarget).toBeDefined()

      // 4. Beach and restaurant photos have low visual similarity (cosine < 0.5)
      const visualSim = cosineSimilarity(cluePhoto.embedding, beachTarget!.photo.embedding)
      expect(visualSim).toBeLessThan(0.5)

      // 5. Reason chip: "Same Goa trip"
      const reasonLabels = beachTarget!.reasons.map((r) => r.label)
      const hasTripReason = reasonLabels.some(
        (label) => label.toLowerCase().includes('goa') || label.toLowerCase().includes('trip')
      )
      expect(hasTripReason).toBe(true)
      expect(reasonLabels).toContain('Same Goa trip')
    })
  })

  // =========================================================================
  // Scenario C — AI best match
  // =========================================================================
  describe('Scenario C — AI best match', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('executes Scenario C: photo with visual + contextual signals -> Best Match ranks strongest candidates with human-readable reasons', async () => {
      // 1. Select a photo with both visual + contextual signals (Birthday clue)
      const birthdayClue = demoPhotos.find(
        (p) => p.eventId === 'birthday-2024' && p.description?.includes('cake')
      )
      expect(birthdayClue).toBeDefined()

      // 2. Use as clue -> Let Photos find the best match (Local Adaptive)
      const localResults = retrieveBest(birthdayClue!.id, demoPhotos, { topK: 10 })
      expect(localResults.length).toBeGreaterThan(0)

      // 3. System combines available signals and ranks strongest candidates from birthday
      const top5Local = localResults.slice(0, 5)
      const birthdayCandidates = top5Local.filter((r) => r.photo.eventId === 'birthday-2024')
      expect(birthdayCandidates.length).toBeGreaterThanOrEqual(3)

      // Reasons are human-readable and accurate
      for (const res of birthdayCandidates) {
        expect(res.reasons.length).toBeGreaterThan(0)
        expect(res.reasons[0].label.length).toBeGreaterThan(0)
      }

      // 4. AI Best Match Re-ranking test: Gemini/Groq returns re-ranked candidates with custom explanation reasons
      const mockAiRankingResponse = {
        rankedIds: [
          top5Local[0].photo.id,
          top5Local[1].photo.id,
          top5Local[2].photo.id,
        ],
        reasons: {
          [top5Local[0].photo.id]: 'Same Rahul birthday celebration',
          [top5Local[1].photo.id]: 'Birthday dinner celebration in Pune',
          [top5Local[2].photo.id]: 'Group gathering at venue',
        },
      }

      // Mock fetch to simulate Groq/Gemini API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockAiRankingResponse),
              },
            },
          ],
        }),
      } as unknown as Response)

      const aiResult = await rankCandidatesWithAi(
        birthdayClue!,
        localResults.slice(0, 5),
        { provider: 'groq', apiKey: 'mock-key' }
      )

      expect(aiResult.results.length).toBeGreaterThan(0)
      expect(aiResult.usedAi).toBe(true)
      expect(aiResult.results[0].reasons[0].label).toBe(
        'Same Rahul birthday celebration'
      )
      expect(['event', 'visual']).toContain(aiResult.results[0].reasons[0].type)
    })
  })

  // =========================================================================
  // Scenario D — Clue chaining
  // =========================================================================
  describe('Scenario D — Clue chaining', () => {
    it('executes Scenario D: multi-hop clue chaining Search -> Clue A -> results -> Clue B -> results -> target', () => {
      // 1. Search -> finds Clue A
      const searchResults = searchPhotos('birthday', demoPhotos)
      expect(searchResults.length).toBeGreaterThan(0)
      const clueA: Photo = searchResults.find(
        (p) => p.eventId === 'birthday-2024' && p.description?.includes('cake')
      )!
      expect(clueA).toBeDefined()

      // Reset store before test
      useAppStore.getState().resetClueChain()

      // Initialize Clue Chain at Hop 0
      useAppStore.getState().addClueStep({
        stepIndex: 0,
        cluePhotoId: clueA.id,
        mode: 'best',
        resultIds: [],
        timestamp: new Date(),
        label: clueA.description || 'Birthday cake',
      })
      expect(useAppStore.getState().clueChain?.steps.length).toBe(1)

      // Hop 1: Retrieve results from Clue A
      const hop1Results = retrieveBest(clueA.id, demoPhotos, { topK: 10 })
      expect(hop1Results.length).toBeGreaterThan(0)
      useAppStore.getState().updateStepResultIds(0, hop1Results.map((r) => r.photo.id))

      // Select Clue B from results (e.g. Birthday group photo demo-503)
      const clueB: Photo = hop1Results.find(
        (r) => r.photo.description?.includes('group photo')
      )!.photo
      expect(clueB).toBeDefined()
      expect(clueB.id).not.toBe(clueA.id)

      // Add Clue B as next hop
      useAppStore.getState().addClueStep({
        stepIndex: 1,
        cluePhotoId: clueB.id,
        mode: 'memory',
        resultIds: [],
        timestamp: new Date(),
        label: clueB.description || 'Group photo',
      })
      expect(useAppStore.getState().clueChain?.steps.length).toBe(2)

      // Hop 2: Retrieve results from Clue B (excluding Clue A and penalizing seen results)
      const hop2Results = retrieveMemory(clueB.id, demoPhotos, {
        topK: 10,
        excludeIds: [clueA.id],
        seenResultIds: hop1Results.map((r) => r.photo.id),
      })
      expect(hop2Results.length).toBeGreaterThan(0)
      expect(hop2Results.some((r) => r.photo.id === clueA.id)).toBe(false)
      expect(hop2Results.some((r) => r.photo.id === clueB.id)).toBe(false)

      // Target photo (e.g. birthday candid moment or dinner table) accessible at step 2
      const targetPhoto = hop2Results.find(
        (r) =>
          r.photo.description?.includes('candid moment') ||
          r.photo.description?.includes('dinner table')
      )
      expect(targetPhoto).toBeDefined()

      // Breadcrumb shows both hops correctly
      const chain = useAppStore.getState().clueChain!
      expect(chain.steps.map((s) => s.cluePhotoId)).toEqual([clueA.id, clueB.id])
      expect(chain.steps[0].mode).toBe('best')
      expect(chain.steps[1].mode).toBe('memory')
    })
  })

  // =========================================================================
  // Scenario E — Different year
  // =========================================================================
  describe('Scenario E — Different year', () => {
    it('executes Scenario E: doc-2022 as clue -> Search Similar -> doc-2024 appears in top 5, confirming cross-year retrieval', () => {
      // 1. Clue: doc-2022 photo (demo-601 Document scan 2022)
      const doc2022 = demoPhotos.find((p) => p.eventId === 'doc-2022')!
      expect(doc2022).toBeDefined()
      expect(doc2022.dateTime?.getFullYear()).toBe(2022)

      // 2. Search Similar on doc-2022
      const similarResults = retrieveSimilar(doc2022.id, demoPhotos, { topK: 10 })
      expect(similarResults.length).toBeGreaterThan(0)

      // 3. doc-2024 appears in top 5 results
      const top5 = similarResults.slice(0, 5)
      const doc2024InTop5 = top5.find((r) => r.photo.eventId === 'doc-2024')
      expect(doc2024InTop5).toBeDefined()
      expect(doc2024InTop5!.photo.dateTime?.getFullYear()).toBe(2024)

      // 4. Cross-year retrieval confirmed: time gap is > 2 years, visual similarity is high
      const yearDiff = Math.abs(
        doc2024InTop5!.photo.dateTime!.getFullYear() - doc2022.dateTime!.getFullYear()
      )
      expect(yearDiff).toBe(2)

      const simScore = cosineSimilarity(doc2022.embedding, doc2024InTop5!.photo.embedding)
      expect(simScore).toBeGreaterThan(0.85)

      // Verify reason chip is visual/document related
      const reasonLabels = doc2024InTop5!.reasons.map((r) => r.label)
      expect(
        reasonLabels.some(
          (l) => l.includes('appearance') || l.includes('document') || l.includes('text') || l.includes('object')
        )
      ).toBe(true)
    })
  })

  // =========================================================================
  // Scenario F — Same context, different appearance
  // =========================================================================
  describe('Scenario F — Same context, different appearance', () => {
    it('executes Scenario F: hotel-goa as clue -> Search Around Memory -> Goa beach appears; visually very different (cosine < 0.5)', () => {
      // 1. Clue: Hotel-Goa photo (demo-405 Goa hotel room view)
      const hotelClue = demoPhotos.find(
        (p) => p.eventId === 'hotel-goa' && p.description?.includes('hotel room')
      )!
      expect(hotelClue).toBeDefined()
      expect(hotelClue.locationName).toContain('Goa')

      // 2. Target: Goa beach photo (demo-401 Goa beach sunset)
      const beachTarget = demoPhotos.find(
        (p) => p.eventId === 'goa-2024' && p.description?.includes('beach sunset')
      )!
      expect(beachTarget).toBeDefined()

      // 3. Both share trip/event/location
      expect(hotelClue.tripId).toBe('goa-2024')
      expect(beachTarget.tripId).toBe('goa-2024')
      expect(hotelClue.locationName).toContain('Goa')
      expect(beachTarget.locationName).toContain('Goa')

      // 4. Visually very different (confirmed by low cosine score < 0.5)
      const visualSim = cosineSimilarity(hotelClue.embedding, beachTarget.embedding)
      expect(visualSim).toBeLessThan(0.5)

      // 5. Hotel-Goa as clue -> Search Around Memory -> Goa beach appears in top 5
      const memoryResults = retrieveMemory(hotelClue.id, demoPhotos, { topK: 10 })
      const top5Memory = memoryResults.slice(0, 5)
      const beachInTop5 = top5Memory.find((r) => r.photo.id === beachTarget.id)
      expect(beachInTop5).toBeDefined()

      // 6. Search Around This Memory outperforms pure visual similarity:
      // In pure visual Search Similar, Goa beach is NOT in the top 5
      const visualResults = retrieveSimilar(hotelClue.id, demoPhotos, { topK: 10 })
      const top5VisualIds = visualResults.slice(0, 5).map((r) => r.photo.id)
      expect(top5VisualIds).not.toContain(beachTarget.id)
    })
  })
})
