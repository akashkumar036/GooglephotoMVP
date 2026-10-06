import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './appStore'

describe('AppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeMode: null,
      photos: new Map(),
      userPhotos: [],
      searchQuery: '',
      searchResults: [],
      activeClueId: null,
      selectedMode: null,
      clueResults: [],
      clueChain: null,
      selectedPhotoId: null,
      menuOpen: false,
      sheetOpen: false,
      feedbackState: null,
    })
  })

  it('initializes with default empty/null state', () => {
    const state = useAppStore.getState()
    expect(state.activeMode).toBeNull()
    expect(state.activeClueId).toBeNull()
    expect(state.clueChain).toBeNull()
    expect(state.photos.size).toBe(0)
  })

  it('updates active mode correctly', () => {
    useAppStore.getState().setActiveMode('demo')
    expect(useAppStore.getState().activeMode).toBe('demo')

    useAppStore.getState().setActiveMode('my-photos')
    expect(useAppStore.getState().activeMode).toBe('my-photos')
  })

  it('handles clue chain addition and reset', () => {
    const step = {
      stepIndex: 0,
      cluePhotoId: 'photo-1',
      mode: 'similar' as const,
      resultIds: ['photo-2', 'photo-3'],
      timestamp: new Date(),
      label: 'Medicine 2023',
    }

    useAppStore.getState().addClueStep(step)
    const chain = useAppStore.getState().clueChain
    expect(chain).not.toBeNull()
    expect(chain?.steps).toHaveLength(1)
    expect(chain?.steps[0].cluePhotoId).toBe('photo-1')

    useAppStore.getState().resetClueChain()
    expect(useAppStore.getState().clueChain).toBeNull()
  })

  it('clears user photos on clearUserPhotos action', () => {
    useAppStore.setState({
      userPhotos: [
        {
          id: 'u-1',
          source: 'user',
          imageUrl: 'blob:test',
          thumbnailUrl: 'blob:test',
          dateTime: null,
          datePrecision: 'unknown',
          latitude: null,
          longitude: null,
          locationName: null,
          objects: [],
          labels: [],
          ocrText: null,
          description: 'user photo',
          people: [],
          embedding: null,
          eventId: null,
          eventName: null,
          tripId: null,
          neighborIds: [],
          filename: 'test.jpg',
          width: 800,
          height: 600,
          fileSize: 1024,
        },
      ],
    })

    expect(useAppStore.getState().userPhotos).toHaveLength(1)
    useAppStore.getState().clearUserPhotos()
    expect(useAppStore.getState().userPhotos).toHaveLength(0)
  })

  it('updates enlargedPhotoId on setEnlargedPhotoId', () => {
    expect(useAppStore.getState().enlargedPhotoId).toBeNull()
    useAppStore.getState().setEnlargedPhotoId('demo-701')
    expect(useAppStore.getState().enlargedPhotoId).toBe('demo-701')
    useAppStore.getState().setEnlargedPhotoId(null)
    expect(useAppStore.getState().enlargedPhotoId).toBeNull()
  })
})
