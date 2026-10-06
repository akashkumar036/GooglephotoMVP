import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeedbackPrompt } from './FeedbackPrompt'
import { getAllFeedback } from '../engine/feedbackStorage'

describe('FeedbackPrompt Component (Phase 16)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear()
    }
  })

  it('16.1 renders initial question and choices', () => {
    render(<FeedbackPrompt mode="similar" chainDepth={1} onClose={vi.fn()} />)

    expect(
      screen.getByText('Did you find the photo you were looking for?')
    ).toBeDefined()
    expect(screen.getByRole('button', { name: /yes/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /not yet/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /i'm not sure/i })).toBeDefined()
  })

  it('16.2 renders secondary prompt with signal checkboxes on "Yes" and saves on Done', () => {
    const handleClose = vi.fn()
    render(<FeedbackPrompt mode="best" chainDepth={2} onClose={handleClose} />)

    const yesBtn = screen.getByRole('button', { name: /yes/i })
    fireEvent.click(yesBtn)

    // Secondary question
    expect(screen.getByText('What helped you find it?')).toBeDefined()
    expect(screen.getByText('Similar appearance')).toBeDefined()
    expect(screen.getByText('Same place')).toBeDefined()
    expect(screen.getByText('Same event')).toBeDefined()
    expect(screen.getByText('Same people')).toBeDefined()
    expect(screen.getByText('Nearby in time')).toBeDefined()
    expect(screen.getByText('Another clue photo')).toBeDefined()
    expect(screen.getByText('Best Match')).toBeDefined()

    // Select "Best Match" and "Similar appearance"
    fireEvent.click(screen.getByText('Best Match'))
    fireEvent.click(screen.getByText('Similar appearance'))

    // Click Done
    const doneBtn = screen.getByRole('button', { name: /done/i })
    fireEvent.click(doneBtn)

    expect(screen.getByText('Thanks for your feedback!')).toBeDefined()

    // Verify stored item
    const feedbackList = getAllFeedback()
    expect(feedbackList).toHaveLength(1)
    expect(feedbackList[0].success).toBe('yes')
    expect(feedbackList[0].mode).toBe('best')
    expect(feedbackList[0].chainDepth).toBe(2)
    expect(feedbackList[0].helpfulSignals).toContain('Best Match')
    expect(feedbackList[0].helpfulSignals).toContain('Similar appearance')
  })

  it('16.3 renders next-step suggestions on "Not yet" and calls appropriate callbacks', () => {
    const handleTryAnotherClue = vi.fn()
    const handleChangeApproach = vi.fn()
    const handleStartNewSearch = vi.fn()
    const handleClose = vi.fn()

    render(
      <FeedbackPrompt
        mode="similar"
        chainDepth={1}
        onClose={handleClose}
        onTryAnotherClue={handleTryAnotherClue}
        onChangeApproach={handleChangeApproach}
        onStartNewSearch={handleStartNewSearch}
      />
    )

    const notYetBtn = screen.getByRole('button', { name: /not yet/i })
    fireEvent.click(notYetBtn)

    // Suggestions header
    expect(screen.getByText('Keep going:')).toBeDefined()

    // Action buttons
    const clueActionBtn = screen.getByRole('button', { name: /try another clue/i })
    const approachActionBtn = screen.getByRole('button', { name: /change search approach/i })
    const newSearchActionBtn = screen.getByRole('button', { name: /start new search/i })

    expect(clueActionBtn).toBeDefined()
    expect(approachActionBtn).toBeDefined()
    expect(newSearchActionBtn).toBeDefined()

    // Immediate storage of 'not_yet' response
    const feedbackList = getAllFeedback()
    expect(feedbackList).toHaveLength(1)
    expect(feedbackList[0].success).toBe('not_yet')

    // Click an action
    fireEvent.click(clueActionBtn)
    expect(handleTryAnotherClue).toHaveBeenCalledTimes(1)
    expect(handleClose).toHaveBeenCalled()
  })

  it('dismisses prompt when close button is clicked', () => {
    const handleClose = vi.fn()
    render(<FeedbackPrompt mode="similar" chainDepth={1} onClose={handleClose} />)

    const closeBtn = screen.getByRole('button', { name: /dismiss feedback prompt/i })
    fireEvent.click(closeBtn)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
