import { describe, it, expect, beforeEach } from 'vitest'
import { savePhoto, getAllPhotos, getPhotoById, deletePhoto, clearAllPhotos } from './photoDb'
import { demoPhotos } from '../data/demoPhotos'

describe('IndexedDB Storage Layer (Phase 11.11)', () => {
  beforeEach(async () => {
    await clearAllPhotos()
  })

  it('saves and retrieves photos successfully', async () => {
    const testPhoto = demoPhotos[0]
    await savePhoto(testPhoto)

    const all = await getAllPhotos()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe(testPhoto.id)

    const fetched = await getPhotoById(testPhoto.id)
    expect(fetched).toBeDefined()
    expect(fetched?.filename).toBe(testPhoto.filename)
  })

  it('deletes photo and clears all photos', async () => {
    await savePhoto(demoPhotos[0])
    await savePhoto(demoPhotos[1])

    let all = await getAllPhotos()
    expect(all).toHaveLength(2)

    await deletePhoto(demoPhotos[0].id)
    all = await getAllPhotos()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe(demoPhotos[1].id)

    await clearAllPhotos()
    all = await getAllPhotos()
    expect(all).toHaveLength(0)
  })
})
