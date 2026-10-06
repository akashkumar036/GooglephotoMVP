import { openDB, type IDBPDatabase } from 'idb'
import type { Photo } from '../types'

const DB_NAME = 'MemoryClueDB'
const DB_VERSION = 1

export interface PhotoRecord {
  photo: Photo
  blob?: Blob
  embedding?: number[]
}

let dbPromise: Promise<IDBPDatabase> | null = null

// Fallback in-memory map for environments without IndexedDB (e.g. Node/jsdom test runner)
const memoryStore = new Map<string, PhotoRecord>()

function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

export async function getDb(): Promise<IDBPDatabase | null> {
  if (!isIndexedDBAvailable()) return null

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('embeddings')) {
          db.createObjectStore('embeddings', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export async function savePhoto(photo: Photo, blob?: Blob, embedding?: number[]): Promise<void> {
  const db = await getDb()
  if (!db) {
    memoryStore.set(photo.id, { photo, blob, embedding: embedding || photo.embedding || undefined })
    return
  }

  const tx = db.transaction(['photos', 'embeddings', 'blobs'], 'readwrite')
  await tx.objectStore('photos').put(photo)

  if (embedding || photo.embedding) {
    await tx.objectStore('embeddings').put({
      id: photo.id,
      vector: embedding || photo.embedding,
    })
  }

  if (blob) {
    await tx.objectStore('blobs').put({
      id: photo.id,
      blob,
    })
  }

  await tx.done
}

export async function savePhotos(photos: Photo[], blobs?: Map<string, Blob>): Promise<void> {
  for (const photo of photos) {
    const blob = blobs?.get(photo.id)
    await savePhoto(photo, blob)
  }
}

function hydratePhotoDates(photo: Photo): Photo {
  return {
    ...photo,
    dateTime: photo.dateTime ? new Date(photo.dateTime) : null,
  }
}

export async function getAllPhotos(): Promise<Photo[]> {
  const db = await getDb()
  if (!db) {
    return Array.from(memoryStore.values()).map((r) => hydratePhotoDates(r.photo))
  }

  const tx = db.transaction(['photos'], 'readonly')
  const photos = await tx.objectStore('photos').getAll()
  return (photos as Photo[]).map(hydratePhotoDates)
}

export async function getPhotoById(id: string): Promise<Photo | undefined> {
  const db = await getDb()
  if (!db) {
    const p = memoryStore.get(id)?.photo
    return p ? hydratePhotoDates(p) : undefined
  }

  const tx = db.transaction(['photos'], 'readonly')
  const photo = await tx.objectStore('photos').get(id)
  return photo ? hydratePhotoDates(photo as Photo) : undefined
}

export async function getPhotoBlob(id: string): Promise<Blob | undefined> {
  const db = await getDb()
  if (!db) {
    return memoryStore.get(id)?.blob
  }

  const tx = db.transaction(['blobs'], 'readonly')
  const record = (await tx.objectStore('blobs').get(id)) as { id: string; blob: Blob } | undefined
  return record?.blob
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDb()
  if (!db) {
    memoryStore.delete(id)
    return
  }

  const tx = db.transaction(['photos', 'embeddings', 'blobs'], 'readwrite')
  await tx.objectStore('photos').delete(id)
  await tx.objectStore('embeddings').delete(id)
  await tx.objectStore('blobs').delete(id)
  await tx.done
}

export async function clearAllPhotos(): Promise<void> {
  const db = await getDb()
  if (!db) {
    memoryStore.clear()
    return
  }

  const tx = db.transaction(['photos', 'embeddings', 'blobs'], 'readwrite')
  await tx.objectStore('photos').clear()
  await tx.objectStore('embeddings').clear()
  await tx.objectStore('blobs').clear()
  await tx.done
}

export async function getPhotoCount(): Promise<number> {
  const db = await getDb()
  if (!db) {
    return memoryStore.size
  }

  const tx = db.transaction(['photos'], 'readonly')
  const count = await tx.objectStore('photos').count()
  return count
}
