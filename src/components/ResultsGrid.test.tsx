import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResultsGrid } from './ResultsGrid'
import { demoPhotos } from '../data/demoPhotos'
import type { RetrievalResult } from '../types'

describe('ResultsGrid Component (Phase 9)', () => {
  const mockResults: RetrievalResult[] = [
    {
      photo: demoPhotos[0],
      score: 0.95,
      reasons: [{ label: 'Same location', type: 'location' }],
    },
    {
      photo: demoPhotos[1],
      score: 0.85,
      reasons: [{ label: 'Taken 35 minutes after your clue', type: 'temporal' }],
    },
  ]

  it('renders all results in a grid', () => {
    render(
      <ResultsGrid
        results={mockResults}
        mode="similar"
        selectedPhotoId={null}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onMenuOpen={vi.fn()}
      />
    )

    const grid = screen.getByRole('region', { name: 'similar photos results' })
    expect(grid).toBeDefined()

    const cards = screen.getAllByRole('button', { name: /^Photo result:/i })
    expect(cards).toHaveLength(2)
  })

  it('renders empty state UI when results list is empty (Phase 9.4)', () => {
    render(
      <ResultsGrid
        results={[]}
        mode="similar"
        selectedPhotoId={null}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onMenuOpen={vi.fn()}
      />
    )

    expect(screen.getByRole('status', { name: 'No results' })).toBeDefined()
    expect(screen.getByText('0 results found')).toBeDefined()
    expect(
      screen.getByText('Try choosing another photo as a clue or change your search strategy.')
    ).toBeDefined()
  })

  it('renders custom empty message if provided', () => {
    render(
      <ResultsGrid
        results={[]}
        mode="best"
        selectedPhotoId={null}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onMenuOpen={vi.fn()}
        emptyMessage="No best matches available"
      />
    )

    expect(screen.getByText('No best matches available')).toBeDefined()
  })
})
