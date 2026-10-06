import type { Photo, ReasonChip, RetrievalResult } from '../types'
import type { BestMatchResult } from './retrieveBest'
import type { AiProvider, AiRankingResult, AiRankResponse } from './aiRankingTypes'
import { createRankRequest } from './aiPrompt'
import { callGeminiRanking } from './geminiClient'
import { callGroqRanking } from './groqClient'

let lastRequestTimestamp = 0
const MIN_DEBOUNCE_INTERVAL_MS = 500

/**
 * Checks which AI provider is configured in environment variables.
 * Priority: Groq (ultra-low latency) -> Gemini -> none
 */
export function getAvailableAiProvider(): AiProvider {
  const groqKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined
  if (groqKey && groqKey.trim().length > 0) return 'groq'

  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (geminiKey && geminiKey.trim().length > 0) return 'gemini'

  return 'none'
}

export interface RankCandidatesOptions {
  provider?: AiProvider
  apiKey?: string
  modelName?: string
}

/**
 * Re-ranks local candidate photos using Groq or Google Gemini.
 * Strictly sends text metadata, never raw image bytes.
 * Falls back gracefully to local scoring on network error or missing key.
 */
export async function rankCandidatesWithAi(
  clue: Photo,
  localCandidates: BestMatchResult[],
  optionsOrProvider?: AiProvider | RankCandidatesOptions
): Promise<AiRankingResult> {
  const options: RankCandidatesOptions =
    typeof optionsOrProvider === 'string'
      ? { provider: optionsOrProvider }
      : optionsOrProvider || {}

  const provider = options.provider || getAvailableAiProvider()

  if (provider === 'none' || localCandidates.length === 0) {
    return {
      results: localCandidates,
      usedAi: false,
      provider: 'none',
    }
  }

  // Enforce minimum 500ms debounce interval between repeated requests
  const now = Date.now()
  const timeSinceLast = now - lastRequestTimestamp
  if (timeSinceLast < MIN_DEBOUNCE_INTERVAL_MS) {
    await new Promise((res) => setTimeout(res, MIN_DEBOUNCE_INTERVAL_MS - timeSinceLast))
  }
  lastRequestTimestamp = Date.now()

  // Take top-20 candidates for AI re-ranking
  const top20 = localCandidates.slice(0, 20)
  const rankRequest = createRankRequest(clue, top20)

  try {
    let aiResponse: AiRankResponse | null = null

    if (provider === 'groq') {
      aiResponse = await callGroqRanking(rankRequest, {
        apiKey: options.apiKey,
        modelName: options.modelName,
      })
    } else if (provider === 'gemini') {
      aiResponse = await callGeminiRanking(rankRequest, {
        apiKey: options.apiKey,
        modelName: options.modelName,
      })
    }


    if (!aiResponse || !aiResponse.rankedIds || aiResponse.rankedIds.length === 0) {
      return {
        results: localCandidates,
        usedAi: false,
        provider,
        error: 'Best match is temporarily unavailable. Using local analysis instead.',
      }
    }

    // Build map of candidate photos
    const candidateMap = new Map<string, BestMatchResult>()
    localCandidates.forEach((c) => candidateMap.set(c.photo.id, c))

    const reRankedResults: RetrievalResult[] = []
    const processedIds = new Set<string>()

    // 1. Add AI-ranked photos in AI-specified order
    for (const id of aiResponse.rankedIds) {
      const candidate = candidateMap.get(id)
      if (candidate) {
        processedIds.add(id)
        const aiReason = aiResponse.reasons[id]
        let reasons: ReasonChip[] = candidate.reasons

        if (aiReason && aiReason.trim().length > 0) {
          // Put the AI reason chip first
          const aiChip: ReasonChip = {
            label: aiReason,
            type: candidate.dominantSignal === 'contextual' ? 'event' : 'visual',
          }
          // Keep at most 2 chips
          reasons = [aiChip, ...candidate.reasons.slice(0, 1)]
        }

        reRankedResults.push({
          photo: candidate.photo,
          score: candidate.score,
          reasons,
        })
      }
    }

    // 2. Append any remaining local candidates not mentioned by AI
    for (const candidate of localCandidates) {
      if (!processedIds.has(candidate.photo.id)) {
        reRankedResults.push({
          photo: candidate.photo,
          score: candidate.score,
          reasons: candidate.reasons,
        })
      }
    }

    return {
      results: reRankedResults,
      usedAi: true,
      provider,
    }
  } catch (err) {
    console.warn('AI re-ranking failed, falling back to local adaptive scoring:', err)
    return {
      results: localCandidates,
      usedAi: false,
      provider,
      error: 'Best match is temporarily unavailable. Using local analysis instead.',
    }
  }
}
