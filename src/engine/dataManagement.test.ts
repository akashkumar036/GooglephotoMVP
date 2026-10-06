import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearAllUserData,
  getStoredUserPhotoCount,
  hasAcknowledgedSession,
  setSessionAcknowledged,
  SESSION_ACK_KEY,
} from './dataManagement'
import { savePhoto, getAllPhotos } from '../storage/photoDb'
import { useAppStore } from '../store/appStore'
import { demoPhotos } from '../data/demoPhotos'
import type { Photo } from '../types'

describe('Phase 14: Data Management (clearAllUserData & Session)', () => {
  const sampleUserPhoto: Photo = {
    ...demoPhotos[0],
    id: 'user-photo-101',
    source: 'user',
    filename: 'test-user-pic.jpg',
  }

  beforeEach(async () => {
    // Reset session storage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.clear()
    }

    // Set sample state in Zustand
    const map = new Map<string, Photo>()
    map.set(sampleUserPhoto.id, sampleUserPhoto)
    useAppStore.setState({
      userPhotos: [sampleUserPhoto],
      photos: map,
      searchQuery: 'test query',
      searchResults: [sampleUserPhoto.id],
      activeClueId: 'user-photo-101',
      selectedPhotoId: 'user-photo-101',
    })

    // Save photo to DB
    await savePhoto(sampleUserPhoto)
  })

  it('reports stored photo count accurately', async () => {
    const count = await getStoredUserPhotoCount()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  it('manages session acknowledgement flag in sessionStorage', () => {
    expect(hasAcknowledgedSession()).toBe(false)

    setSessionAcknowledged()
    expect(hasAcknowledgedSession()).toBe(true)
    expect(sessionStorage.getItem(SESSION_ACK_KEY)).toBe('true')
  })

  it('completely removes all user photos from DB, Zustand store, and resets search/clue states', async () => {
    // Before clear
    const beforePhotos = await getAllPhotos()
    expect(beforePhotos.some((p) => p.id === sampleUserPhoto.id)).toBe(true)
    expect(useAppStore.getState().userPhotos.length).toBe(1)
    expect(useAppStore.getState().photos.has(sampleUserPhoto.id)).toBe(true)

    // Execute clear
    await clearAllUserData()

    // After clear: DB should be empty
    const afterPhotos = await getAllPhotos()
    expect(afterPhotos.some((p) => p.id === sampleUserPhoto.id)).toBe(false)

    // Store state should be purged
    const state = useAppStore.getState()
    expect(state.userPhotos).toEqual([])
    expect(state.photos.has(sampleUserPhoto.id)).toBe(false)
    expect(state.searchQuery).toBe('')
    expect(state.searchResults).toEqual([])
    expect(state.activeClueId).toBeNull()
    expect(state.selectedPhotoId).toBeNull()

    // Session ack key should be reset
    expect(hasAcknowledgedSession()).toBe(false)
  })
})
