import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'
import { useAppStore } from './store/appStore'

describe('App Component and Routes', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    useAppStore.setState({
      activeMode: null,
      selectedPhotoId: null,
      activeClueId: null,
      selectedMode: null,
      sheetOpen: false,
      menuOpen: false,
      searchQuery: '',
      searchResults: [],
      clueResults: [],
    })
  })
  it('renders Google Photos header and Memory Clue badge', () => {
    render(<App />)
    // Brand title and badge visible
    expect(screen.getByText('Google Photos')).toBeDefined()
    expect(screen.getAllByText('Memory Clue').length).toBeGreaterThanOrEqual(1)
  })

  it('renders Mode Selector landing page cards', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Memory Clue' })).toBeDefined()
    expect(screen.getByText(/Turn a photo you recognize into a clue/i)).toBeDefined()
    expect(screen.getByRole('heading', { name: 'Demo Photos' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'My Photos' })).toBeDefined()
  })

  it('navigates to /demo and shows photo grid', () => {
    render(<App />)
    const demoLink = screen.getByRole('link', { name: /Open Demo Library/i })
    fireEvent.click(demoLink)
    // DemoPage renders a search bar placeholder
    expect(screen.getByPlaceholderText(/Search demo photos/i)).toBeDefined()
  })

  it('navigates to /my-photos and shows import UI', () => {
    render(<App />)
    const myPhotosCard = screen.getAllByRole('link', { name: /My Photos/i })
    // Click the card (first card link)
    fireEvent.click(myPhotosCard[0])
    expect(screen.getByText('Import Your Photos')).toBeDefined()
    expect(screen.getByText('Select Photos')).toBeDefined()
  })

  it('triggers clue flow: context menu -> clue choice sheet -> selects mode and navigates to results', async () => {
    render(<App />)
    const demoLink = screen.getByRole('link', { name: /Open Demo Library/i })
    fireEvent.click(demoLink)

    // Find more options (⋮) button on the first photo card
    const moreBtns = screen.getAllByRole('button', { name: /More options/i })
    expect(moreBtns.length).toBeGreaterThan(0)
    fireEvent.click(moreBtns[0])

    // Context menu should appear with "Use this photo as a clue"
    const clueActionBtn = screen.getByText('Use this photo as a clue')
    expect(clueActionBtn).toBeDefined()
    fireEvent.click(clueActionBtn)

    // Await sheet appearance and content after 100ms transition
    await waitFor(() => {
      expect(screen.getByTestId('clue-choice-sheet-subtitle')).toBeDefined()
      expect(screen.getByTestId('clue-option-similar')).toBeDefined()
      expect(screen.getByTestId('clue-option-memory')).toBeDefined()
      expect(screen.getByTestId('clue-option-best')).toBeDefined()
    })

    expect(screen.getByTestId('clue-choice-sheet-subtitle').textContent).toContain("What do you think this photo tells you")

    // Click "Search similar to this photo"
    fireEvent.click(screen.getByTestId('clue-option-similar'))

    // Verifies navigation to results
    await waitFor(() => {
      expect(screen.getByText('Results related to your clue')).toBeDefined()
    })
    expect(screen.getAllByText('Search similar to this photo').length).toBeGreaterThanOrEqual(1)
  })
})


