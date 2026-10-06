import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildPrompt, createRankRequest, parseAiResponse } from './aiPrompt'
import { rankCandidatesWithAi } from './aiRankingClient'
import { retrieveBest } from './retrieveBest'
import { demoPhotos } from '../data/demoPhotos'
import type { Photo } from '../types'
import type { AiRankRequest } from './aiRankingTypes'

describe('Phase 13: Gemini & Groq Integration (Best Match)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('13.1 & 13.2 Prompt Construction & Privacy', () => {
    const clue: Photo = demoPhotos.find((p) => p.id === 'bday-1') || demoPhotos[0]
    const candidates = retrieveBest(clue.id, demoPhotos, { topK: 5 })

    it('creates rank request with metadata only (NO raw images or image URLs)', () => {
      const request: AiRankRequest = createRankRequest(clue, candidates)

      // Verifies metadata fields are present
      expect(request.clue.description).toBeDefined()
      expect(request.clue.objects).toBeInstanceOf(Array)
      expect(request.candidates.length).toBe(candidates.length)
      expect(request.candidates[0].id).toBe(candidates[0].photo.id)
      expect(request.candidates[0].localScore).toBe(candidates[0].score)

      // Privacy check: ensure no imageUrl or blob URLs are sent in the request structure
      const serialized = JSON.stringify(request)
      expect(serialized).not.toContain('blob:')
      expect(serialized).not.toContain('data:image')
      expect(serialized).not.toContain('imageUrl')
      expect(serialized).not.toContain('thumbnailUrl')
    })

    it('builds clear prompt asking for max 6 words per explanation in JSON format', () => {
      const request = createRankRequest(clue, candidates)
      const prompt = buildPrompt(request)

      expect(prompt).toContain('You are a photo retrieval assistant for Memory Clue')
      expect(prompt).toContain('CLUE PHOTO:')
      expect(prompt).toContain('CANDIDATE PHOTOS')
      expect(prompt).toContain('MAXIMUM 6 WORDS')
      expect(prompt).toContain('"rankedIds"')
      expect(prompt).toContain('"reasons"')
    })

    it('parses valid JSON response and clamps reasons to max 6 words', () => {
      const mockRawResponse = JSON.stringify({
        rankedIds: ['bday-2', 'bday-3'],
        reasons: {
          'bday-2': 'Same birthday party cake with friends',
          'bday-3': 'This is a very long reason that exceeds the six word limit set by spec',
        },
      })

      const parsed = parseAiResponse(mockRawResponse)
      expect(parsed).not.toBeNull()
      expect(parsed?.rankedIds).toEqual(['bday-2', 'bday-3'])
      expect(parsed?.reasons['bday-2']).toBe('Same birthday party cake with friends')
      // Clamped to 6 words
      expect(parsed?.reasons['bday-3'].split(' ').length).toBeLessThanOrEqual(6)
    })

    it('handles markdown wrapped JSON (```json ... ```)', () => {
      const mockWrapped = `\`\`\`json
{
  "rankedIds": ["med-2"],
  "reasons": {
    "med-2": "Similar prescription packaging"
  }
}
\`\`\``

      const parsed = parseAiResponse(mockWrapped)
      expect(parsed).not.toBeNull()
      expect(parsed?.rankedIds).toEqual(['med-2'])
      expect(parsed?.reasons['med-2']).toBe('Similar prescription packaging')
    })

    it('handles malformed JSON response gracefully without throwing', () => {
      const parsed = parseAiResponse('I am not valid JSON at all')
      expect(parsed).toBeNull()
    })
  })

  describe('13.3 AI Call in Best Match & Re-ranking', () => {
    const clue: Photo = demoPhotos[0]
    const candidates = retrieveBest(clue.id, demoPhotos, { topK: 5 })

    it('returns local candidates when no provider API key is set', async () => {
      const result = await rankCandidatesWithAi(clue, candidates, 'none')
      expect(result.usedAi).toBe(false)
      expect(result.results.length).toBe(candidates.length)
      expect(result.results[0].photo.id).toBe(candidates[0].photo.id)
    })

    it('re-ranks candidates according to AI output and adds AI reason chips', async () => {
      // Mock Groq API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  // Reverse the order of first two candidates
                  rankedIds: [candidates[1].photo.id, candidates[0].photo.id],
                  reasons: {
                    [candidates[1].photo.id]: 'AI detected strong visual match',
                  },
                }),
              },
            },
          ],
        }),
      })

      const result = await rankCandidatesWithAi(clue, candidates, {
        provider: 'groq',
        apiKey: 'test-key',
      })
      expect(result.usedAi).toBe(true)
      expect(result.results[0].photo.id).toBe(candidates[1].photo.id)
      expect(result.results[0].reasons[0].label).toBe('AI detected strong visual match')
    })

    it('gracefully falls back to local scoring when API call fails or times out', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error 503'))

      const result = await rankCandidatesWithAi(clue, candidates, {
        provider: 'groq',
        apiKey: 'test-key',
      })
      expect(result.usedAi).toBe(false)
      expect(result.results.length).toBe(candidates.length)
      expect(result.error).toBe('Best match is temporarily unavailable. Using local analysis instead.')
    })
  })

  describe('13.4 Rate Limiting & Debouncing', () => {
    const clue: Photo = demoPhotos[0]
    const candidates = retrieveBest(clue.id, demoPhotos, { topK: 3 })

    it('debounces rapid back-to-back requests (min 500ms)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"rankedIds":[],"reasons":{}}' } }],
        }),
      })

      const start = Date.now()
      await rankCandidatesWithAi(clue, candidates, { provider: 'groq', apiKey: 'test-key' })
      await rankCandidatesWithAi(clue, candidates, { provider: 'groq', apiKey: 'test-key' })
      const elapsed = Date.now() - start

      expect(elapsed).toBeGreaterThanOrEqual(450)
    })
  })

  describe('13.5 Scenario C End-to-End Validation', () => {
    it('successfully produces human-readable reasons for photo with both visual and contextual clues', async () => {
      // Scenario C: birthday cake clue
      const bdayClue = demoPhotos.find((p) => p.id === 'bday-1') || demoPhotos[0]
      const bdayCandidates = retrieveBest(bdayClue.id, demoPhotos, { topK: 5 })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  rankedIds: [bdayCandidates[0].photo.id, bdayCandidates[1].photo.id],
                  reasons: {
                    [bdayCandidates[0].photo.id]: 'Same birthday party celebration',
                    [bdayCandidates[1].photo.id]: 'Similar birthday cake candles',
                  },
                }),
              },
            },
          ],
        }),
      })

      const result = await rankCandidatesWithAi(bdayClue, bdayCandidates, {
        provider: 'groq',
        apiKey: 'test-key',
      })
      expect(result.usedAi).toBe(true)
      expect(result.results[0].reasons[0].label).toBe('Same birthday party celebration')
      expect(result.results[1].reasons[0].label).toBe('Similar birthday cake candles')
    })

  })
})
