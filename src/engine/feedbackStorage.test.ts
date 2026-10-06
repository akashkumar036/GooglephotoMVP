import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveFeedback,
  getAllFeedback,
  clearAllFeedback,
  getFeedbackStats,
  FEEDBACK_STORAGE_KEY,
} from './feedbackStorage'

describe('Feedback Storage (Phase 16.4)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear()
    }
  })

  it('saves feedback to localStorage with required metadata schema', () => {
    const saved = saveFeedback({
      mode: 'similar',
      chainDepth: 2,
      success: 'yes',
      helpfulSignals: ['Similar appearance', 'Same place'],
    })

    expect(saved.id).toBeDefined()
    expect(saved.timestamp).toBeDefined()
    expect(saved.mode).toBe('similar')
    expect(saved.chainDepth).toBe(2)
    expect(saved.success).toBe('yes')
    expect(saved.helpfulSignals).toEqual(['Similar appearance', 'Same place'])

    const all = getAllFeedback()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe(saved.id)
  })

  it('calculates feedback metrics, success rate, and signal counts correctly', () => {
    saveFeedback({
      mode: 'best',
      chainDepth: 1,
      success: 'yes',
      helpfulSignals: ['Best Match', 'Similar appearance'],
    })

    saveFeedback({
      mode: 'memory',
      chainDepth: 2,
      success: 'yes',
      helpfulSignals: ['Same event'],
    })

    saveFeedback({
      mode: 'similar',
      chainDepth: 1,
      success: 'not_yet',
      helpfulSignals: [],
    })

    saveFeedback({
      mode: 'similar',
      chainDepth: 3,
      success: 'not_sure',
      helpfulSignals: [],
    })

    const stats = getFeedbackStats()
    expect(stats.total).toBe(4)
    expect(stats.yesCount).toBe(2)
    expect(stats.notYetCount).toBe(1)
    expect(stats.notSureCount).toBe(1)
    expect(stats.successRate).toBe(50) // 2 / 4 = 50%
    expect(stats.signalCounts['Best Match']).toBe(1)
    expect(stats.signalCounts['Similar appearance']).toBe(1)
    expect(stats.signalCounts['Same event']).toBe(1)
  })

  it('clears all feedback items from localStorage', () => {
    saveFeedback({
      mode: 'similar',
      chainDepth: 1,
      success: 'yes',
      helpfulSignals: [],
    })
    expect(getAllFeedback().length).toBe(1)

    clearAllFeedback()
    expect(getAllFeedback().length).toBe(0)
    expect(localStorage.getItem(FEEDBACK_STORAGE_KEY)).toBeNull()
  })
})
