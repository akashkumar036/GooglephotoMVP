import { describe, it, expect, beforeEach } from 'vitest'
import { retrieveSimilar } from './retrieveSimilar'
import { retrieveMemory } from './retrieveMemory'
import { retrieveBest } from './retrieveBest'
import { useAppStore } from '../store/appStore'
import { demoPhotos } from '../data/demoPhotos'

describe('Clue Chaining Engine & Scenario D (Phase 10)', () => {
  beforeEach(() => {
    useAppStore.getState().resetClueChain()
  })

  describe('10.3 Exclusion Logic & Penalization', () => {
    it('excludes prior clue photo completely from subsequent results', () => {
      const clueA = demoPhotos.find((p) => p.eventId === 'med-2023')!
      const clueB = demoPhotos.find((p) => p.eventId === 'med-2025')!

      // Step 2 retrieval from clueB, excluding clueA
      const results = retrieveSimilar(clueB.id, demoPhotos, {
        excludeIds: [clueA.id],
      })

      // Neither clueB (current) nor clueA (previous) should appear in results
      expect(results.some((r) => r.photo.id === clueA.id)).toBe(false)
      expect(results.some((r) => r.photo.id === clueB.id)).toBe(false)
    })

    it('penalizes photos seen in previous results by 0.1 to favor fresh discoveries', () => {
      const clue = demoPhotos.find((p) => p.eventId === 'goa-2024')!
      const normalResults = retrieveMemory(clue.id, demoPhotos)
      expect(normalResults.length).toBeGreaterThan(0)

      const targetPhotoId = normalResults[0].photo.id
      const originalScore = normalResults[0].score

      // Re-run with targetPhotoId in seenResultIds
      const penalizedResults = retrieveMemory(clue.id, demoPhotos, {
        seenResultIds: [targetPhotoId],
      })

      const penalizedMatch = penalizedResults.find((r) => r.photo.id === targetPhotoId)
      expect(penalizedMatch).toBeDefined()
      // Score should be approximately originalScore - 0.1
      expect(penalizedMatch!.score).toBeCloseTo(Math.max(0, originalScore - 0.1), 5)
    })

    it('excludes prior clue and penalizes seen results in retrieveBest', () => {
      const clueA = demoPhotos.find((p) => p.eventId === 'med-2023')!
      const clueB = demoPhotos.find((p) => p.eventId === 'med-2025')!

      const normal = retrieveBest(clueB.id, demoPhotos)
      const targetId = normal[0]?.photo.id

      const results = retrieveBest(clueB.id, demoPhotos, {
        excludeIds: [clueA.id],
        seenResultIds: targetId ? [targetId] : [],
      })

      expect(results.some((r) => r.photo.id === clueA.id)).toBe(false)
      expect(results.some((r) => r.photo.id === clueB.id)).toBe(false)
      if (targetId && normal[0]) {
        const match = results.find((r) => r.photo.id === targetId)
        if (match) {
          expect(match.score).toBeLessThanOrEqual(normal[0].score)
        }
      }
    })
  })

  describe('10.1 & 10.4 Store State & Multi-Hop Chaining', () => {
    it('manages 2-hop and 3-hop chains in Zustand store', () => {
      const store = useAppStore.getState()

      // Hop 1 (stepIndex 0)
      store.addClueStep({
        stepIndex: 0,
        cluePhotoId: demoPhotos[0].id,
        mode: 'similar',
        resultIds: [demoPhotos[1].id, demoPhotos[2].id],
        timestamp: new Date(),
        label: 'medicine-2023',
      })

      expect(useAppStore.getState().clueChain?.steps).toHaveLength(1)

      // Hop 2 (stepIndex 1)
      useAppStore.getState().addClueStep({
        stepIndex: 1,
        cluePhotoId: demoPhotos[1].id,
        mode: 'memory',
        resultIds: [demoPhotos[3].id],
        timestamp: new Date(),
        label: 'medicine-2025',
      })

      expect(useAppStore.getState().clueChain?.steps).toHaveLength(2)

      // Hop 3 (stepIndex 2)
      useAppStore.getState().addClueStep({
        stepIndex: 2,
        cluePhotoId: demoPhotos[3].id,
        mode: 'best',
        resultIds: [demoPhotos[4].id],
        timestamp: new Date(),
        label: 'goa-beach',
      })

      expect(useAppStore.getState().clueChain?.steps).toHaveLength(3)

      // Truncate back to step 1
      useAppStore.getState().truncateChainToStep(1)
      const truncatedChain = useAppStore.getState().clueChain
      expect(truncatedChain?.steps).toHaveLength(2)
      expect(useAppStore.getState().activeClueId).toBe(demoPhotos[1].id)
      expect(useAppStore.getState().selectedMode).toBe('memory')

      // Reset chain
      useAppStore.getState().resetClueChain()
      expect(useAppStore.getState().clueChain).toBeNull()
      expect(useAppStore.getState().activeClueId).toBeNull()
    })
  })

  describe('Scenario D: 2-Hop Chain End-to-End', () => {
    it('executes Scenario D: Search -> Clue A -> results -> select Clue B -> results (excluding Clue A)', () => {
      // Step 1: Clue A is medicine 2023 photo (demo-201)
      const clueA = demoPhotos.find((p) => p.eventId === 'med-2023')!
      const step1Results = retrieveSimilar(clueA.id, demoPhotos)
      expect(step1Results.length).toBeGreaterThan(0)

      // User identifies Clue B (medicine 2025 photo, demo-202) in step 1 results
      const clueBResult = step1Results.find((r) => r.photo.eventId === 'med-2025')
      expect(clueBResult).toBeDefined()
      const clueB = clueBResult!.photo

      // Step 2: Use Clue B with exclusion of Clue A
      const step1ResultIds = step1Results.map((r) => r.photo.id)
      const step2Results = retrieveSimilar(clueB.id, demoPhotos, {
        excludeIds: [clueA.id],
        seenResultIds: step1ResultIds,
      })

      expect(step2Results.length).toBeGreaterThan(0)
      // Clue A must be completely excluded
      expect(step2Results.some((r) => r.photo.id === clueA.id)).toBe(false)
      // Clue B (active clue) must also not appear in results
      expect(step2Results.some((r) => r.photo.id === clueB.id)).toBe(false)

      // Target medicine photos exist in step 2 results
      const hasMedicine = step2Results.some((r) => r.photo.eventId?.startsWith('med'))
      expect(hasMedicine).toBe(true)
    })
  })
})
