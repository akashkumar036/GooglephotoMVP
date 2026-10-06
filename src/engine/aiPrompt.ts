import type { Photo } from '../types'
import type { BestMatchResult } from './retrieveBest'
import type { AiRankCandidate, AiRankRequest, AiRankResponse } from './aiRankingTypes'

/**
 * Builds the AI prompt for re-ranking candidates according to the spec in docs/architecture.md.
 * Strictly sends text descriptions and metadata — never raw image bytes or URLs.
 */
export function buildPrompt(request: AiRankRequest): string {
  const clueDate = request.clue.dateTime || 'Unknown'
  const clueLocation = request.clue.locationName || 'Unknown'
  const clueEvent = request.clue.eventName || 'None'
  const clueObjects = request.clue.objects.length > 0 ? request.clue.objects.join(', ') : 'None'
  const clueLabels = request.clue.labels.length > 0 ? request.clue.labels.join(', ') : 'None'

  const candidateLines = request.candidates.map((c, index) => {
    const objStr = c.objects.length > 0 ? c.objects.join(', ') : 'None'
    const locStr = c.locationName || 'None'
    const evStr = c.eventName || 'None'
    const dateStr = c.dateTime || 'None'
    return `${index + 1}. ID: ${c.id} | Description: ${c.description} | Objects: ${objStr} | Location: ${locStr} | Event: ${evStr} | Date: ${dateStr} | LocalScore: ${c.localScore.toFixed(2)}`
  })

  return `You are a photo retrieval assistant for Memory Clue, a Google Photos feature.

The user is trying to find a photo they cannot describe precisely.
They have selected a clue photo. Your job is to re-rank the candidate photos
and explain in plain language (max 6 words per explanation) why each is relevant.

CLUE PHOTO:
- Description: ${request.clue.description}
- Objects: ${clueObjects}
- Labels: ${clueLabels}
- Location: ${clueLocation}
- Event: ${clueEvent}
- Date: ${clueDate}

CANDIDATE PHOTOS (pre-ranked by local scoring):
${candidateLines.join('\n')}

INSTRUCTIONS:
1. Re-rank the candidates from most relevant to least relevant based on semantic, visual, temporal, location, or event connection to the clue.
2. For each candidate, provide a short, natural human-readable reason (MAXIMUM 6 WORDS). Examples: "Similar medicine packaging", "Same Kyoto trip", "Taken 45 minutes after clue", "Same birthday celebration", "Similar golden retriever".
3. Return ONLY a valid JSON object without markdown or commentary with this exact structure:
{
  "rankedIds": ["<id1>", "<id2>", ...],
  "reasons": {
    "<id1>": "Short explanation (max 6 words)",
    "<id2>": "Short explanation (max 6 words)"
  }
}`
}

/**
 * Converts a clue Photo and top-K BestMatchResult array into an AiRankRequest.
 * Enforces privacy: no image URLs, no base64 bytes, only descriptions and metadata.
 */
export function createRankRequest(clue: Photo, candidates: BestMatchResult[]): AiRankRequest {
  const clueDateStr = clue.dateTime
    ? (clue.dateTime instanceof Date ? clue.dateTime.toISOString() : String(clue.dateTime))
    : null

  const rankCandidates: AiRankCandidate[] = candidates.map((c) => {
    const candidateDateStr = c.photo.dateTime
      ? (c.photo.dateTime instanceof Date ? c.photo.dateTime.toISOString() : String(c.photo.dateTime))
      : null

    return {
      id: c.photo.id,
      description: c.photo.description || c.photo.filename,
      objects: c.photo.objects || [],
      labels: c.photo.labels || [],
      locationName: c.photo.locationName,
      eventName: c.photo.eventName,
      dateTime: candidateDateStr,
      localScore: c.score,
    }
  })

  return {
    clue: {
      description: clue.description || clue.filename,
      objects: clue.objects || [],
      labels: clue.labels || [],
      locationName: clue.locationName,
      eventName: clue.eventName,
      dateTime: clueDateStr,
    },
    candidates: rankCandidates,
  }
}

/**
 * Parses and validates the raw JSON response from Gemini or Groq.
 * Gracefully strips markdown wrappers and sanitizes reasons.
 */
export function parseAiResponse(rawText: string): AiRankResponse | null {
  if (!rawText || typeof rawText !== 'string') return null

  // Clean markdown fences ```json ... ``` or ``` ... ```
  let cleaned = rawText.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  }

  try {
    const parsed = JSON.parse(cleaned)
    if (!parsed || typeof parsed !== 'object') return null

    if (!Array.isArray(parsed.rankedIds)) return null

    const rankedIds = parsed.rankedIds.filter((id: unknown) => typeof id === 'string') as string[]
    const rawReasons = typeof parsed.reasons === 'object' && parsed.reasons !== null ? parsed.reasons : {}
    const reasons: Record<string, string> = {}

    for (const [id, reason] of Object.entries(rawReasons)) {
      if (typeof reason === 'string' && reason.trim().length > 0) {
        // Enforce max 6 words per explanation
        const words = reason.trim().split(/\s+/)
        reasons[id] = words.slice(0, 6).join(' ')
      }
    }

    return {
      rankedIds,
      reasons,
    }
  } catch (err) {
    console.warn('Failed to parse AI re-ranking JSON response:', err, rawText)
    return null
  }
}
