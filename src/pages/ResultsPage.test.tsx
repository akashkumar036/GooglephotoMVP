import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ResultsPage } from './ResultsPage'
import { useAppStore } from '../store/appStore'
import { demoPhotos } from '../data/demoPhotos'

describe('ResultsPage Component', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeMode: 'demo',
      selectedMode: 'similar',
      activeClueId: demoPhotos[0].id,
      clueResults: [],
      selectedPhotoId: null,
      sheetOpen: false,
    })
  })

  it('renders header with clue thumbnail and mode title', () => {
    render(
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Search similar to this photo')).toBeDefined()
    expect(screen.getByText('Results related to your clue')).toBeDefined()
    expect(screen.getByText(/related photos found/i)).toBeDefined()
  })

  it('renders similar photo cards with reason chips', () => {
    // Clue is medicine-2023 (demo-201)
    const medClue = demoPhotos.find((p) => p.eventId === 'med-2023')!
    useAppStore.setState({
      activeClueId: medClue.id,
      selectedMode: 'similar',
    })

    render(
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>
    )

    // Check that photo cards are rendered in the results grid
    const photoCards = screen.getAllByRole('button', { name: /^Photo/i })
    expect(photoCards.length).toBeGreaterThan(0)

    // Check that reason chips are visible
    const chips = screen.getAllByLabelText(/^Reason:/i)
    expect(chips.length).toBeGreaterThan(0)
    expect(chips[0].textContent).toMatch(/similar|appearance|packaging|pill|object/i)
  })

  it('renders memory photo cards with contextual reason chips when mode is "memory"', () => {
    // Clue is Goa restaurant meal (demo-403)
    const restaurantClue = demoPhotos.find(
      (p) => p.eventId === 'goa-2024' && p.description?.includes('restaurant meal')
    )!
    useAppStore.setState({
      activeClueId: restaurantClue.id,
      selectedMode: 'memory',
    })

    render(
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Search around this memory')).toBeDefined()
    expect(screen.getByText('Memory results')).toBeDefined()

    // Check that photo cards are rendered in the results grid
    const photoCards = screen.getAllByRole('button', { name: /^Photo/i })
    expect(photoCards.length).toBeGreaterThan(0)

    // Check that reason chips are visible and contextual
    const chips = screen.getAllByLabelText(/^Reason:/i)
    expect(chips.length).toBeGreaterThan(0)
    expect(chips.some((c) => /goa|trip|location|taken/i.test(c.textContent || ''))).toBe(true)
  })

  it('renders best match photo cards with adaptively scored reason chips when mode is "best"', () => {
    const medClue = demoPhotos.find((p) => p.eventId === 'med-2023')!
    useAppStore.setState({
      activeClueId: medClue.id,
      selectedMode: 'best',
    })

    render(
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Let Photos find the best match')).toBeDefined()
    expect(screen.getByText('Best matches')).toBeDefined()

    const photoCards = screen.getAllByRole('button', { name: /^Photo/i })
    expect(photoCards.length).toBeGreaterThan(0)

    const chips = screen.getAllByLabelText(/^Reason:/i)
    expect(chips.length).toBeGreaterThan(0)
  })

  it('displays "0 results" and empty state when no clue results exist (Phase 9.4)', () => {
    useAppStore.setState({
      activeClueId: 'non-existent-clue-id',
      selectedMode: 'similar',
    })

    render(
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>
    )

    expect(screen.getByText('0 results')).toBeDefined()
    expect(screen.getByText('0 results found')).toBeDefined()
    expect(
      screen.getByText('Try choosing another photo as a clue or change your search strategy.')
    ).toBeDefined()
  })

  it('opens clue choice sheet when clicking "Change strategy"', () => {
    render(
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>
    )

    const changeBtn = screen.getByRole('button', { name: /Change strategy/i })
    fireEvent.click(changeBtn)

    expect(useAppStore.getState().sheetOpen).toBe(true)
  })

  it('allows re-using a result photo as clue from ⋮ menu (Phase 9.5)', () => {
    const medClue = demoPhotos.find((p) => p.eventId === 'med-2023')!
    useAppStore.setState({
      activeClueId: medClue.id,
      selectedMode: 'similar',
    })

    render(
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>
    )

    const menuButtons = screen.getAllByRole('button', { name: 'More options' })
    expect(menuButtons.length).toBeGreaterThan(0)

    // Click more options menu on the first result
    fireEvent.click(menuButtons[0])

    // Context menu option "Use this photo as a clue" should appear
    const useAsClueOption = screen.getByText('Use this photo as a clue')
    expect(useAsClueOption).toBeDefined()

    fireEvent.click(useAsClueOption)
    // Check that activeClueId was updated
    expect(useAppStore.getState().activeClueId).not.toBe(medClue.id)
  })

  it('renders ClueBreadcrumb when chain depth > 1 and resets on Start Over (Phase 10.2 & 10.4)', () => {
    const clue1 = demoPhotos[0]
    const clue2 = demoPhotos[1]

    useAppStore.setState({
      activeClueId: clue2.id,
      selectedMode: 'memory',
      clueChain: {
        id: 'chain-123',
        steps: [
          {
            stepIndex: 0,
            cluePhotoId: clue1.id,
            mode: 'similar',
            resultIds: [clue2.id],
            timestamp: new Date(),
            label: 'clue-1',
          },
          {
            stepIndex: 1,
            cluePhotoId: clue2.id,
            mode: 'memory',
            resultIds: [],
            timestamp: new Date(),
            label: 'clue-2',
          },
        ],
      },
    })

    render(
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>
    )

    // Breadcrumb navigation should be visible
    expect(screen.getByRole('navigation', { name: /clue chain navigation/i })).toBeDefined()
    expect(screen.getByText('Search')).toBeDefined()
    expect(screen.getByText(/\[clue-1\]/i)).toBeDefined()
    expect(screen.getByText(/\[clue-2\]/i)).toBeDefined()

    // Clicking "Start over" should reset the chain
    const startOverBtn = screen.getByRole('button', { name: /start over/i })
    fireEvent.click(startOverBtn)
    expect(useAppStore.getState().clueChain).toBeNull()
  })
})
