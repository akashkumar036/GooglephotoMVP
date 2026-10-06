import { demoPhotos } from '../data/demoPhotos'
import type { Photo } from '../types'

/**
 * Resolves a Photo object by its ID across all possible sources:
 * 1. Store photos map (if available)
 * 2. User uploaded photos array
 * 3. Demo photos dataset
 */
export function findPhotoById(
  id: string | null | undefined,
  userPhotos: Photo[] = [],
  photosMap?: Map<string, Photo>
): Photo | null {
  if (!id) return null

  if (photosMap && photosMap.has(id)) {
    return photosMap.get(id) || null
  }

  const userPhoto = userPhotos.find((p) => p.id === id)
  if (userPhoto) return userPhoto

  const demoPhoto = demoPhotos.find((p) => p.id === id)
  if (demoPhoto) return demoPhoto

  return null
}
