import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultCard } from './ResultCard'
import { demoPhotos } from '../data/demoPhotos'
import type { RetrievalResult } from '../types'

describe('ResultCard Component (Phase 9)', () => {
  const mockPhoto = demoPhotos[0]
  const mockResult: RetrievalResult = {
    photo: mockPhoto,
    score: 0.88,
    reasons: [{ label: 'Same Goa trip', type: 'event' }],
  }

  it('renders photo thumbnail and accessibility label', () => {
    render(
      <ResultCard
        result={mockResult}
        isSelected={false}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onMenuOpen={vi.fn()}
      />
    )

    const card = screen.getByRole('button', { name: /^Photo result:/i })
    expect(card).toBeDefined()
    expect(card.getAttribute('aria-pressed')).toBe('false')

    const img = screen.getByRole('img', { name: mockPhoto.description || mockPhoto.filename })
    expect(img).toBeDefined()
  })

  it('renders color-coded reason chip with subtle opacity', () => {
    render(
      <ResultCard
        result={mockResult}
        isSelected={false}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onMenuOpen={vi.fn()}
      />
    )

    const chip = screen.getByLabelText('Reason: Same Goa trip')
    expect(chip).toBeDefined()
    expect(chip.className).toContain('result-card__chip--event')
    expect(chip.textContent).toBe('Same Goa trip')
  })

  it('renders correct chip classes for visual, temporal, location, people, and text chips', () => {
    const types = ['visual', 'temporal', 'location', 'people', 'text'] as const

    types.forEach((type) => {
      const res: RetrievalResult = {
        photo: mockPhoto,
        score: 0.9,
        reasons: [{ label: `Test ${type}`, type }],
      }

      const { unmount } = render(
        <ResultCard
          result={res}
          isSelected={false}
          onSelect={vi.fn()}
          onDeselect={vi.fn()}
          onMenuOpen={vi.fn()}
        />
      )

      const chip = screen.getByLabelText(`Reason: Test ${type}`)
      expect(chip.className).toContain(`result-card__chip--${type}`)
      unmount()
    })
  })

  it('renders Best Match explanation footer when mode is "best"', () => {
    const bestResult: RetrievalResult = {
      photo: mockPhoto,
      score: 0.95,
      reasons: [{ label: 'Similar medicine packaging', type: 'visual' }],
    }

    render(
      <ResultCard
        result={bestResult}
        mode="best"
        isSelected={false}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onMenuOpen={vi.fn()}
      />
    )

    expect(screen.getByText('auto_awesome')).toBeDefined()
    // Explanation label is rendered in both the chip and the explanation footer
    const explanationMatches = screen.getAllByText('Similar medicine packaging')
    expect(explanationMatches.length).toBeGreaterThanOrEqual(1)
  })

  it('handles card selection and deselection', () => {
    const handleSelect = vi.fn()
    const handleDeselect = vi.fn()

    const { rerender } = render(
      <ResultCard
        result={mockResult}
        isSelected={false}
        onSelect={handleSelect}
        onDeselect={handleDeselect}
        onMenuOpen={vi.fn()}
      />
    )

    const card = screen.getByRole('button', { name: /^Photo result:/i })
    fireEvent.click(card)
    expect(handleSelect).toHaveBeenCalledWith(mockPhoto.id)

    rerender(
      <ResultCard
        result={mockResult}
        isSelected={true}
        onSelect={handleSelect}
        onDeselect={handleDeselect}
        onMenuOpen={vi.fn()}
      />
    )

    fireEvent.click(card)
    expect(handleDeselect).toHaveBeenCalledWith(mockPhoto.id)
  })

  it('triggers onMenuOpen when clicking ⋮ menu button', () => {
    const handleMenuOpen = vi.fn()

    render(
      <ResultCard
        result={mockResult}
        isSelected={false}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onMenuOpen={handleMenuOpen}
      />
    )

    const menuBtn = screen.getByRole('button', { name: 'More options' })
    fireEvent.click(menuBtn)

    expect(handleMenuOpen).toHaveBeenCalledWith(mockPhoto.id, expect.any(HTMLElement))
  })
})
