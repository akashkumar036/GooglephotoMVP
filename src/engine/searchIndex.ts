import type { Photo } from '../types'
import { resolvePhotos, type DatasetType } from './dataset'

export interface SearchIndex {
  photos: Photo[]
}

export interface ScoredPhoto {
  photo: Photo
  score: number
}

// Weights for term frequency scoring
const FIELD_WEIGHTS = {
  description: 1.5,
  objects: 1.3,
  labels: 1.2,
  locationName: 1.1,
  eventName: 1.1,
  ocrText: 1.0,
  filename: 1.0,
}

// Simple inverted index builder (in Phase 3 we're doing a lightweight in-memory scoring rather than a full pre-built index structure for simplicity since N=50)
export function buildIndex(photos: Photo[]): SearchIndex {
  return { photos }
}

export function searchIndex(index: SearchIndex, query: string): ScoredPhoto[] {
  const q = query.toLowerCase().trim()
  if (!q) return index.photos.map((photo) => ({ photo, score: 1 }))
  
  const terms = q.split(/\s+/)
  
  const scored = index.photos.map((photo) => {
    let score = 0
    
    // We check each term against the text fields
    for (const term of terms) {
      if (photo.description?.toLowerCase().includes(term)) score += FIELD_WEIGHTS.description
      if (photo.locationName?.toLowerCase().includes(term)) score += FIELD_WEIGHTS.locationName
      if (photo.eventName?.toLowerCase().includes(term)) score += FIELD_WEIGHTS.eventName
      if (photo.ocrText?.toLowerCase().includes(term)) score += FIELD_WEIGHTS.ocrText
      if (photo.filename?.toLowerCase().includes(term)) score += FIELD_WEIGHTS.filename
      
      // Arrays with null-safe fallbacks
      if ((photo.objects || []).some(o => o.toLowerCase().includes(term))) score += FIELD_WEIGHTS.objects
      if ((photo.labels || []).some(l => l.toLowerCase().includes(term))) score += FIELD_WEIGHTS.labels
    }
    
    return { photo, score }
  })
  
  // Filter out zero scores and sort descending
  return scored
    .filter((res) => res.score > 0)
    .sort((a, b) => b.score - a.score)
}

/**
 * Searches a dataset ('user', 'demo', or explicit Photo[] array) by keyword query.
 * Returns array of matching photos sorted by relevance score, with score attached.
 */
export function searchPhotos(
  query: string,
  dataset: DatasetType = 'user'
): (Photo & { score: number })[] {
  const photos = resolvePhotos(dataset)
  const index = buildIndex(photos)
  const scored = searchIndex(index, query)
  return scored.map((s) => Object.assign(s.photo, { score: s.score }))
}

/**
 * Searches a dataset returning full ScoredPhoto objects ({ photo, score }).
 */
export function searchPhotosScored(
  query: string,
  dataset: DatasetType = 'user'
): ScoredPhoto[] {
  const photos = resolvePhotos(dataset)
  const index = buildIndex(photos)
  return searchIndex(index, query)
}

/**
 * Async wrapper for searchPhotos fulfilling architecture.md interface:
 * searchPhotos(query: string, dataset: 'demo' | 'user'): Promise<Photo[]>
 */
export async function searchPhotosAsync(
  query: string,
  dataset: DatasetType = 'user'
): Promise<Photo[]> {
  return searchPhotos(query, dataset)
}

