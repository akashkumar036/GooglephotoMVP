import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AiRankRequest, AiRankResponse } from './aiRankingTypes'
import { buildPrompt, parseAiResponse } from './aiPrompt'

export interface GeminiConfig {
  apiKey?: string
  modelName?: string
}

/**
 * Calls Google Gemini 1.5 Flash to re-rank candidate photos based on text metadata.
 * Never sends raw images — only structured text descriptions, objects, and timestamps.
 */
export async function callGeminiRanking(
  request: AiRankRequest,
  config: GeminiConfig = {}
): Promise<AiRankResponse | null> {
  const apiKey = config.apiKey || (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)
  if (!apiKey || apiKey.trim() === '') {
    return null
  }

  const modelName = config.modelName || 'gemini-1.5-flash'
  const prompt = buildPrompt(request)

  const makeAttempt = async () => {
    const genAI = new GoogleGenerativeAI(apiKey.trim())
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    return parseAiResponse(text)
  }

  try {
    return await makeAttempt()
  } catch (err: unknown) {
    const errorStr = String(err)
    // Retry once on rate limit (429) or transient server error (503)
    if (errorStr.includes('429') || errorStr.includes('503') || errorStr.includes('RESOURCE_EXHAUSTED')) {
      console.warn('Gemini API rate limit encountered, retrying once in 1s...', err)
      await new Promise((res) => setTimeout(res, 1000))
      try {
        return await makeAttempt()
      } catch (retryErr) {
        console.error('Gemini API retry failed:', retryErr)
        throw retryErr
      }
    }
    console.error('Gemini API error during candidate re-ranking:', err)
    throw err
  }
}
