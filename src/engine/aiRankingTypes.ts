import type { RetrievalResult } from '../types'

export interface AiRankCandidate {
  id: string
  description: string
  objects: string[]
  labels: string[]
  locationName: string | null
  eventName: string | null
  dateTime: string | null
  localScore: number
}

export interface AiRankRequest {
  clue: {
    description: string
    objects: string[]
    labels: string[]
    locationName: string | null
    eventName: string | null
    dateTime: string | null
  }
  candidates: AiRankCandidate[]
}

export interface AiRankResponse {
  rankedIds: string[]
  reasons: Record<string, string> // photoId -> reason string (max 6 words)
}

export type AiProvider = 'groq' | 'gemini' | 'none'

export interface AiRankingResult {
  results: RetrievalResult[]
  usedAi: boolean
  provider: AiProvider
  error?: string
}
