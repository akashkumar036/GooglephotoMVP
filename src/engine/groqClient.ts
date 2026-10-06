import type { AiRankRequest, AiRankResponse } from './aiRankingTypes'
import { buildPrompt, parseAiResponse } from './aiPrompt'

export interface GroqConfig {
  apiKey?: string
  modelName?: string
}

/**
 * Calls Groq API for ultra-fast candidate re-ranking (Llama 3.3 / 3.1).
 * Never sends raw images — only structured text descriptions and metadata.
 */
export async function callGroqRanking(
  request: AiRankRequest,
  config: GroqConfig = {}
): Promise<AiRankResponse | null> {
  const apiKey = config.apiKey || (import.meta.env.VITE_GROQ_API_KEY as string | undefined)
  if (!apiKey || apiKey.trim() === '') {
    return null
  }

  const modelName =
    config.modelName ||
    (import.meta.env.VITE_GROQ_MODEL as string | undefined) ||
    'openai/gpt-oss-120b'
  const prompt = buildPrompt(request)

  const makeAttempt = async () => {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a photo retrieval assistant for Memory Clue, a Google Photos feature. Return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      const error = new Error(`Groq API error ${res.status}: ${errBody}`)
      ;(error as unknown as { status: number }).status = res.status
      throw error
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    return parseAiResponse(content)
  }

  try {
    return await makeAttempt()
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    const errorStr = String(err)
    if (status === 429 || status === 503 || errorStr.includes('429') || errorStr.includes('503')) {
      console.warn('Groq API rate limit encountered, retrying once in 1s...', err)
      await new Promise((res) => setTimeout(res, 1000))
      try {
        return await makeAttempt()
      } catch (retryErr) {
        console.error('Groq API retry failed:', retryErr)
        throw retryErr
      }
    }
    console.error('Groq API error during candidate re-ranking:', err)
    throw err
  }
}
