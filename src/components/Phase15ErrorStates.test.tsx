import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhotoGrid } from './PhotoGrid'
import { ResultsGrid } from './ResultsGrid'
import { ProcessingScreen } from './ProcessingScreen'
import { SkeletonGrid } from './SkeletonGrid'
import { ImportScreen } from './ImportScreen'
import { validateFile } from '../analysis/validateFile'

describe('Phase 15: Empty, Error, and Loading States', () => {
  it('15.1 renders empty search results with query and guidance', () => {
    render(
      <PhotoGrid
        photos={[]}
        selectedPhotoId={null}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onMenuOpen={vi.fn()}
        searchQuery="xyz"
      />
    )

    expect(screen.getByText('No photos found for "xyz"')).toBeDefined()
    expect(screen.getByText('Try a different search term.')).toBeDefined()
    expect(screen.getByText('search_off')).toBeDefined()
  })

  it('15.2 renders recovery actions when no retrieval results are found', () => {
    const handleTryAnotherClue = vi.fn()
    const handleSearchAgain = vi.fn()

    render(
      <ResultsGrid
        results={[]}
        mode="similar"
        selectedPhotoId={null}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onMenuOpen={vi.fn()}
        onTryAnotherClue={handleTryAnotherClue}
        onSearchAgain={handleSearchAgain}
      />
    )

    expect(screen.getByText("We couldn't find a strong match.")).toBeDefined()
    expect(
      screen.getByText('Try another clue photo or a different search approach.')
    ).toBeDefined()

    const clueBtn = screen.getByRole('button', { name: /try another clue/i })
    const searchBtn = screen.getByRole('button', { name: /search again/i })

    expect(clueBtn).toBeDefined()
    expect(searchBtn).toBeDefined()

    fireEvent.click(clueBtn)
    expect(handleTryAnotherClue).toHaveBeenCalledTimes(1)

    fireEvent.click(searchBtn)
    expect(handleSearchAgain).toHaveBeenCalledTimes(1)
  })

  it('15.3 renders per-photo error badge in processing queue', () => {
    render(
      <ProcessingScreen
        progress={{
          total: 10,
          current: 4,
          stage: 'detecting',
          stageLabel: 'Analyzing photos...',
          percentage: 40,
          errors: [
            {
              filename: 'broken-image.jpg',
              message: "Couldn't analyze this photo",
            },
          ],
        }}
      />
    )

    expect(
      screen.getByText("Couldn't analyze this photo (broken-image.jpg)")
    ).toBeDefined()
  })

  it('15.5 renders skeleton grid animation during search/loading', () => {
    render(<SkeletonGrid count={6} label="Searching for photos..." />)

    const skeletonContainer = screen.getByRole('status', {
      name: 'Searching for photos...',
    })
    expect(skeletonContainer).toBeDefined()
    expect(skeletonContainer.querySelectorAll('.skeleton-grid__item').length).toBe(6)
  })

  it('15.6 validates unsupported file format (e.g. HEIC) with format not supported error', () => {
    const heicFile = new File(['mock-bytes'], 'vacation.heic', {
      type: 'image/heic',
    })
    const validation = validateFile(heicFile)

    expect(validation.valid).toBe(false)
    expect(validation.error).toMatch(/format not supported/i)
  })

  it('15.7 renders prompt and add photos action when no photos are imported', () => {
    render(<ImportScreen onStartProcessing={vi.fn()} />)

    expect(
      screen.getByText('Import some photos to get started.')
    ).toBeDefined()
    expect(
      screen.getByRole('button', { name: /add photos|select photos/i })
    ).toBeDefined()
  })
})
