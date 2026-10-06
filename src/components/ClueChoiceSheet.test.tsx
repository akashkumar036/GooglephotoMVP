import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ClueChoiceSheet } from './ClueChoiceSheet'
import { useAppStore } from '../store/appStore'
import { demoPhotos } from '../data/demoPhotos'

describe('ClueChoiceSheet Component', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeMode: 'demo',
      sheetOpen: true,
      activeClueId: demoPhotos[0].id,
      selectedMode: null,
      photos: new Map(),
      userPhotos: [],
    })
  })

  it('renders clue photo thumbnail, title, and supporting text', () => {
    render(
      <MemoryRouter>
        <ClueChoiceSheet />
      </MemoryRouter>
    )

    // Title & supporting text
    expect(screen.getByText('Use this photo as a clue')).toBeDefined()
    expect(
      screen.getByText(/What do you think this photo tells you about the memory you're looking for\?/i)
    ).toBeDefined()

    // Thumbnail
    const thumb = screen.getByTestId('clue-thumbnail') as HTMLImageElement
    expect(thumb).toBeDefined()
    expect(thumb.src).toContain(demoPhotos[0].thumbnailUrl || demoPhotos[0].imageUrl)
  })

  it('renders all three retrieval strategy options', () => {
    render(
      <MemoryRouter>
        <ClueChoiceSheet />
      </MemoryRouter>
    )

    // Option 1: Similar
    expect(screen.getByText('Search similar to this photo')).toBeDefined()
    expect(screen.getByText('Find photos that look like this')).toBeDefined()

    // Option 2: Memory
    expect(screen.getByText('Search around this memory')).toBeDefined()
    expect(
      screen.getByText('Find photos connected to this moment, place, people or event')
    ).toBeDefined()

    // Option 3: Best Match
    expect(screen.getByText('Let Photos find the best match')).toBeDefined()
    expect(
      screen.getByText("Use the clues most likely to find what you're looking for")
    ).toBeDefined()
  })

  it('sets mode to "similar", closes sheet, and triggers retrieval on option tap', () => {
    render(
      <MemoryRouter initialEntries={['/demo']}>
        <ClueChoiceSheet />
      </MemoryRouter>
    )

    const similarOption = screen.getByTestId('clue-option-similar')
    fireEvent.click(similarOption)

    expect(useAppStore.getState().selectedMode).toBe('similar')
    expect(useAppStore.getState().sheetOpen).toBe(false)
  })

  it('sets mode to "memory", closes sheet on option tap', () => {
    render(
      <MemoryRouter initialEntries={['/demo']}>
        <ClueChoiceSheet />
      </MemoryRouter>
    )

    const memoryOption = screen.getByTestId('clue-option-memory')
    fireEvent.click(memoryOption)

    expect(useAppStore.getState().selectedMode).toBe('memory')
    expect(useAppStore.getState().sheetOpen).toBe(false)
  })

  it('sets mode to "best", closes sheet on option tap', () => {
    render(
      <MemoryRouter initialEntries={['/demo']}>
        <ClueChoiceSheet />
      </MemoryRouter>
    )

    const bestOption = screen.getByTestId('clue-option-best')
    fireEvent.click(bestOption)

    expect(useAppStore.getState().selectedMode).toBe('best')
    expect(useAppStore.getState().sheetOpen).toBe(false)
  })
})
