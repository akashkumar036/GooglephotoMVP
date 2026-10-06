import type { StoredFeedback, RetrievalMode } from '../types'

export const FEEDBACK_STORAGE_KEY = 'memory_clue_feedback'

export interface FeedbackStats {
  total: number
  yesCount: number
  notYetCount: number
  notSureCount: number
  successRate: number // 0 to 100 percentage
  signalCounts: Record<string, number>
}

/**
 * Saves a feedback entry to localStorage.
 * Structure: { id, timestamp, mode, chainDepth, success, helpfulSignals[] }
 */
export function saveFeedback(
  entry: Omit<StoredFeedback, 'id' | 'timestamp'> & { timestamp?: string; mode?: RetrievalMode }
): StoredFeedback {
  const item: StoredFeedback = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    mode: entry.mode || 'similar',
    chainDepth: entry.chainDepth ?? 1,
    success: entry.success,
    helpfulSignals: entry.helpfulSignals || [],
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const existing = getAllFeedback()
      const updated = [item, ...existing]
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updated))
    } catch (err) {
      console.warn('Failed to save feedback to localStorage:', err)
    }
  }

  return item
}

/**
 * Retrieves all stored feedback entries from localStorage.
 */
export function getAllFeedback(): StoredFeedback[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return []
  }

  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch (err) {
    console.warn('Failed to read feedback from localStorage:', err)
    return []
  }
}

/**
 * Clears all stored feedback from localStorage.
 */
export function clearAllFeedback(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(FEEDBACK_STORAGE_KEY)
  }
}

/**
 * Aggregates feedback metrics for analytics and debug visualization.
 */
export function getFeedbackStats(): FeedbackStats {
  const all = getAllFeedback()
  const total = all.length

  let yesCount = 0
  let notYetCount = 0
  let notSureCount = 0
  const signalCounts: Record<string, number> = {}

  for (const item of all) {
    if (item.success === 'yes') yesCount++
    else if (item.success === 'not_yet') notYetCount++
    else if (item.success === 'not_sure') notSureCount++

    for (const signal of item.helpfulSignals) {
      signalCounts[signal] = (signalCounts[signal] || 0) + 1
    }
  }

  const successRate = total > 0 ? Math.round((yesCount / total) * 100) : 0

  return {
    total,
    yesCount,
    notYetCount,
    notSureCount,
    successRate,
    signalCounts,
  }
}
