import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MyPhotosPage } from './MyPhotosPage'
import { useAppStore } from '../store/appStore'
import { demoPhotos } from '../data/demoPhotos'
import { savePhoto, clearAllPhotos } from '../storage/photoDb'
import { SESSION_ACK_KEY } from '../engine/dataManagement'
import type { Photo } from '../types'

describe('MyPhotosPage (Phase 11 & Phase 14)', () => {
  beforeEach(async () => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.clear()
    }
    await clearAllPhotos()

    useAppStore.setState({
      activeMode: 'my-photos',
      userPhotos: [],
      photos: new Map(),
      isProcessing: false,
      processingProgress: {
        total: 0,
        current: 0,
        stage: 'idle',
        stageLabel: 'Ready',
        percentage: 0,
      },
    })
  })

  it('renders ImportScreen and persistent privacy badge with tooltip when no photos have been imported yet (14.1)', () => {
    render(
      <MemoryRouter>
        <MyPhotosPage />
      </MemoryRouter>
    )

    expect(screen.getByText('My Photos')).toBeDefined()
    expect(screen.getByText('Photos stored locally')).toBeDefined()
    expect(screen.getAllByText('Your photos are only used for this prototype session').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Import Your Photos')).toBeDefined()
    expect(screen.getByRole('button', { name: /select photos|add photos/i })).toBeDefined()
  })

  it('renders ProcessingScreen when isProcessing is active', () => {
    useAppStore.setState({
      isProcessing: true,
      processingProgress: {
        total: 25,
        current: 12,
        stage: 'detecting',
        stageLabel: 'Detecting objects and scenes...',
        percentage: 60,
      },
    })

    render(
      <MemoryRouter>
        <MyPhotosPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Preparing your photos')).toBeDefined()
    expect(screen.getByText('Detecting objects and scenes...')).toBeDefined()
    expect(screen.getByText('Analyzed 12 of 25 photos')).toBeDefined()
  })

  it('renders photo grid and Clear my photos button when userPhotos are present (14.2)', () => {
    useAppStore.setState({
      userPhotos: [demoPhotos[0], demoPhotos[1]],
      isProcessing: false,
    })

    render(
      <MemoryRouter>
        <MyPhotosPage />
      </MemoryRouter>
    )

    expect(screen.getByText('2 photos')).toBeDefined()
    expect(screen.getByRole('list', { name: 'Photo grid' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Clear my photos' })).toBeDefined()
  })

  it('opens confirmation dialog on "Clear my photos" click and dismisses on Cancel (14.2)', async () => {
    useAppStore.setState({
      userPhotos: [demoPhotos[0]],
      isProcessing: false,
    })

    render(
      <MemoryRouter>
        <MyPhotosPage />
      </MemoryRouter>
    )

    const clearBtn = screen.getByRole('button', { name: 'Clear my photos' })
    fireEvent.click(clearBtn)

    // Modal should be visible
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByText('Clear all photos?')).toBeDefined()
    expect(
      screen.getByText('This will remove all your imported photos and associated data from this device.')
    ).toBeDefined()

    // Click Cancel
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelBtn)

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(useAppStore.getState().userPhotos.length).toBe(1)
  })

  it('purges all user data, returns to import screen, and shows toast on confirm clear (14.2)', async () => {
    const userPhoto: Photo = { ...demoPhotos[0], id: 'user-sample-1', source: 'user' }
    await savePhoto(userPhoto)

    const map = new Map<string, Photo>()
    map.set(userPhoto.id, userPhoto)
    useAppStore.setState({
      userPhotos: [userPhoto],
      photos: map,
      isProcessing: false,
    })

    render(
      <MemoryRouter>
        <MyPhotosPage />
      </MemoryRouter>
    )

    const clearBtn = screen.getByRole('button', { name: 'Clear my photos' })
    fireEvent.click(clearBtn)

    const confirmBtn = screen.getByRole('button', { name: 'Clear photos' })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(screen.getByText('Your photos have been removed')).toBeDefined()
      expect(useAppStore.getState().userPhotos.length).toBe(0)
      expect(screen.getByText('Import Your Photos')).toBeDefined()
    })
  })

  it('shows session restore notice when photos exist from previous session and allows Continue (14.3)', async () => {
    const userPhoto1: Photo = { ...demoPhotos[0], id: 'user-prev-1', source: 'user' }
    const userPhoto2: Photo = { ...demoPhotos[1], id: 'user-prev-2', source: 'user' }
    await savePhoto(userPhoto1)
    await savePhoto(userPhoto2)

    render(
      <MemoryRouter>
        <MyPhotosPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/You have 2 photos from your last session/i)).toBeDefined()
    })

    const continueBtn = screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(continueBtn)

    expect(screen.queryByText(/You have 2 photos from your last session/i)).toBeNull()
    expect(sessionStorage.getItem(SESSION_ACK_KEY)).toBe('true')
  })

  it('allows clearing and starting fresh directly from session restore notice (14.3)', async () => {
    const userPhoto: Photo = { ...demoPhotos[0], id: 'user-prev-3', source: 'user' }
    await savePhoto(userPhoto)

    render(
      <MemoryRouter>
        <MyPhotosPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/You have 1 photo from your last session/i)).toBeDefined()
    })

    const clearAndFreshBtn = screen.getByRole('button', { name: 'Clear and start fresh' })
    fireEvent.click(clearAndFreshBtn)

    await waitFor(() => {
      expect(screen.queryByText(/You have 1 photo from your last session/i)).toBeNull()
      expect(screen.getByText('Your photos have been removed')).toBeDefined()
      expect(useAppStore.getState().userPhotos.length).toBe(0)
    })
  })
})
