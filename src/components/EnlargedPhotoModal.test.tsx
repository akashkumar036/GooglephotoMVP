import '@testing-library/jest-dom/vitest'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { EnlargedPhotoModal } from './EnlargedPhotoModal'
import { useAppStore } from '../store/appStore'
import { demoPhotos } from '../data/demoPhotos'
import { PhotoCard } from './PhotoCard'
import { ResultCard } from './ResultCard'
import type { RetrievalResult } from '../types'

describe('EnlargedPhotoModal Component', () => {
  beforeEach(() => {
    useAppStore.setState({
      enlargedPhotoId: null,
      activeClueId: null,
      sheetOpen: false,
      userPhotos: [],
      photos: new Map(),
    })
  })

  it('renders nothing when enlargedPhotoId is null', () => {
    const { container } = render(<EnlargedPhotoModal />)
    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders enlarged image, title, and close button when photo is selected', () => {
    const photo = demoPhotos[0]
    useAppStore.setState({ enlargedPhotoId: photo.id })

    render(<EnlargedPhotoModal />)

    const dialog = screen.getByRole('dialog', { name: new RegExp(photo.description || photo.filename, 'i') })
    expect(dialog).toBeInTheDocument()

    // High-resolution image is rendered
    const img = screen.getByAltText(photo.description || photo.filename)
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', photo.imageUrl)

    // Close button exists
    const closeBtn = screen.getByRole('button', { name: /close enlarged view/i })
    expect(closeBtn).toBeInTheDocument()
  })

  it('renders 3-dot setting button in top right corner and opens options menu on click', () => {
    const photo = demoPhotos[0]
    useAppStore.setState({ enlargedPhotoId: photo.id })

    render(<EnlargedPhotoModal />)

    // 3-dot settings button
    const settingsBtn = screen.getByRole('button', { name: /more photo options/i })
    expect(settingsBtn).toBeInTheDocument()

    // Menu not visible initially
    expect(screen.queryByRole('menu')).toBeNull()

    // Click 3-dot setting button
    fireEvent.click(settingsBtn)

    // Menu appears with expected options
    const menu = screen.getByRole('menu', { name: /photo options menu/i })
    expect(menu).toBeInTheDocument()

    expect(screen.getByRole('menuitem', { name: /use this photo as a clue/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /slideshow/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /download/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /rotate left/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /add to album/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /add to documents/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /add to screenshots & recordings/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /archive/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /move to locked folder/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /photo details & metadata/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /copy photo id/i })).toBeInTheDocument()
  })

  it('toggles favorite star and supports rotation', () => {
    const photo = demoPhotos[0]
    useAppStore.setState({ enlargedPhotoId: photo.id })

    render(<EnlargedPhotoModal />)

    const favBtn = screen.getByRole('button', { name: /favorite/i })
    expect(favBtn).toBeInTheDocument()

    // Click favorite
    fireEvent.click(favBtn)
    expect(screen.getByText('Added to favorites')).toBeInTheDocument()

    // Rotate via Shift+R shortcut
    const img = screen.getByAltText(photo.description || photo.filename)
    expect(img.style.transform).toBe('rotate(0deg)')

    fireEvent.keyDown(window, { key: 'R', shiftKey: true })
    expect(img.style.transform).toBe('rotate(-90deg)')
  })

  it('triggers clue workflow from 3-dot setting menu', async () => {
    vi.useFakeTimers()
    const photo = demoPhotos[0]
    useAppStore.setState({ enlargedPhotoId: photo.id })

    render(<EnlargedPhotoModal />)

    // Open 3-dot setting menu
    const settingsBtn = screen.getByRole('button', { name: /more photo options/i })
    fireEvent.click(settingsBtn)

    // Tap "Use this photo as a clue"
    const clueItem = screen.getByRole('menuitem', { name: /use this photo as a clue/i })
    fireEvent.click(clueItem)

    // Modal closes and activeClueId is set
    expect(useAppStore.getState().enlargedPhotoId).toBeNull()
    expect(useAppStore.getState().activeClueId).toBe(photo.id)

    // Sheet opens after timer
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(useAppStore.getState().sheetOpen).toBe(true)

    vi.useRealTimers()
  })

  it('toggles photo info drawer from 3-dot setting menu or info button', () => {
    // Kashmir photo with objects and location
    const photo = demoPhotos.find((p) => p.eventId === 'kashmir-2024') || demoPhotos[0]
    useAppStore.setState({ enlargedPhotoId: photo.id })

    render(<EnlargedPhotoModal />)

    // Drawer is closed initially
    expect(screen.queryByRole('complementary', { name: /photo metadata drawer/i })).toBeNull()

    // Click info button in top right
    const infoBtn = screen.getByRole('button', { name: /photo info and details/i })
    fireEvent.click(infoBtn)

    // Drawer opens showing details
    const drawer = screen.getByRole('complementary', { name: /photo metadata drawer/i })
    expect(drawer).toBeInTheDocument()
    expect(screen.getByText('Photo Info')).toBeInTheDocument()
    if (photo.locationName) {
      expect(screen.getAllByText(photo.locationName).length).toBeGreaterThanOrEqual(1)
    }

    // Close drawer via close button inside
    const closeDrawerBtn = screen.getByRole('button', { name: /close info panel/i })
    fireEvent.click(closeDrawerBtn)
    expect(screen.queryByRole('complementary', { name: /photo metadata drawer/i })).toBeNull()
  })

  it('closes enlarged photo modal when clicking close button', () => {
    const photo = demoPhotos[0]
    useAppStore.setState({ enlargedPhotoId: photo.id })

    render(<EnlargedPhotoModal />)
    expect(useAppStore.getState().enlargedPhotoId).toBe(photo.id)

    const closeBtn = screen.getByRole('button', { name: /close enlarged view/i })
    fireEvent.click(closeBtn)
    expect(useAppStore.getState().enlargedPhotoId).toBeNull()
  })

  it('closes enlarged photo modal when pressing Escape', () => {
    const photo = demoPhotos[0]
    useAppStore.setState({ enlargedPhotoId: photo.id })

    render(<EnlargedPhotoModal />)
    expect(useAppStore.getState().enlargedPhotoId).toBe(photo.id)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useAppStore.getState().enlargedPhotoId).toBeNull()
  })

  it('navigates to next and previous photos using buttons and arrow keys', () => {
    const photo0 = demoPhotos[0]
    const photo1 = demoPhotos[1]
    useAppStore.setState({ enlargedPhotoId: photo0.id })

    render(<EnlargedPhotoModal />)

    // Next button
    const nextBtn = screen.getByRole('button', { name: /next photo/i })
    fireEvent.click(nextBtn)
    expect(useAppStore.getState().enlargedPhotoId).toBe(photo1.id)

    // ArrowLeft key
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(useAppStore.getState().enlargedPhotoId).toBe(photo0.id)

    // ArrowRight key
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(useAppStore.getState().enlargedPhotoId).toBe(photo1.id)
  })

  it('triggers enlargement when tapping photo card in PhotoCard', () => {
    const photo = demoPhotos[0]
    const handleSelect = vi.fn()
    const handleDeselect = vi.fn()
    const handleMenuOpen = vi.fn()

    render(
      <PhotoCard
        photo={photo}
        isSelected={false}
        onSelect={handleSelect}
        onDeselect={handleDeselect}
        onMenuOpen={handleMenuOpen}
      />
    )

    const card = screen.getByRole('button', { name: new RegExp(`Photo: ${photo.description}`, 'i') })
    fireEvent.click(card)

    // Both onSelect and enlargedPhotoId should be triggered
    expect(handleSelect).toHaveBeenCalledWith(photo.id)
    expect(useAppStore.getState().enlargedPhotoId).toBe(photo.id)
  })

  it('triggers enlargement when tapping photo result in ResultCard', () => {
    const photo = demoPhotos[0]
    const mockResult: RetrievalResult = {
      photo,
      score: 0.95,
      reasons: [{ type: 'visual', label: 'Visually similar pills' }],
    }
    const handleSelect = vi.fn()
    const handleDeselect = vi.fn()
    const handleMenuOpen = vi.fn()

    render(
      <ResultCard
        result={mockResult}
        isSelected={false}
        onSelect={handleSelect}
        onDeselect={handleDeselect}
        onMenuOpen={handleMenuOpen}
      />
    )

    const card = screen.getByRole('button', { name: new RegExp(`Photo result: ${photo.description}`, 'i') })
    fireEvent.click(card)

    expect(handleSelect).toHaveBeenCalledWith(photo.id)
    expect(useAppStore.getState().enlargedPhotoId).toBe(photo.id)
  })

  it('does not render clue button in bottom footer (clean Google Photos interface)', () => {
    const photo = demoPhotos[0]
    useAppStore.setState({ enlargedPhotoId: photo.id })

    render(<EnlargedPhotoModal />)

    const footer = screen.queryByRole('contentinfo') || document.querySelector('.gp-lightbox__footer')
    expect(footer).not.toBeNull()
    // No button inside footer
    expect(footer?.querySelector('button')).toBeNull()
  })
})
