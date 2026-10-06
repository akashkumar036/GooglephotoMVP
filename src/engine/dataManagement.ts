import { clearAllPhotos, getPhotoCount } from '../storage/photoDb'
import { useAppStore } from '../store/appStore'

export const SESSION_ACK_KEY = 'memory_clue_session_acknowledged'

/**
 * Completely deletes all user-imported photos and associated metadata:
 * 1. Clears all Blobs, embeddings, and metadata from IndexedDB
 * 2. Clears user photos from Zustand store and in-memory photo map
 * 3. Resets active clue chaining and search results
 */
export async function clearAllUserData(): Promise<void> {
  // 1. Delete from IndexedDB (photos, embeddings, blobs stores)
  await clearAllPhotos()

  // 2. Reset Zustand store state
  const store = useAppStore.getState()
  store.clearUserPhotos()
  store.setSearchQuery('')
  store.setSearchResults([])

  // 3. Reset session acknowledgement flag
  if (typeof window !== 'undefined' && window.sessionStorage) {
    sessionStorage.removeItem(SESSION_ACK_KEY)
  }
}

/**
 * Returns number of stored user photos in IndexedDB.
 */
export async function getStoredUserPhotoCount(): Promise<number> {
  return await getPhotoCount()
}

/**
 * Returns whether the user has already acknowledged or dismissed
 * the previous session restore banner during this tab session.
 */
export function hasAcknowledgedSession(): boolean {
  if (typeof window === 'undefined' || !window.sessionStorage) return false
  return sessionStorage.getItem(SESSION_ACK_KEY) === 'true'
}

/**
 * Records that the user has acknowledged or dismissed the session restore prompt.
 */
export function setSessionAcknowledged(): void {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    sessionStorage.setItem(SESSION_ACK_KEY, 'true')
  }
}
