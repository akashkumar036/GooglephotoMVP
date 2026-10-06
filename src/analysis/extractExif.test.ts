import { describe, it, expect } from 'vitest'
import { extractExif } from './extractExif'

describe('EXIF Extraction (Phase 11.3)', () => {
  it('falls back to file.lastModified when image has no EXIF date', async () => {
    const fixedTime = new Date('2024-06-15T14:30:00Z').getTime()
    const mockFile = new File(['mock-image-bytes'], 'family-dinner.jpg', {
      type: 'image/jpeg',
      lastModified: fixedTime,
    })

    const exifData = await extractExif(mockFile)

    expect(exifData).toBeDefined()
    expect(exifData.dateTime.getTime()).toBe(fixedTime)
    expect(exifData.datePrecision).toBe('approximate')
    expect(exifData.latitude).toBeNull()
    expect(exifData.longitude).toBeNull()
  })

  it('handles invalid or non-image blobs gracefully without throwing', async () => {
    const corruptedBlob = new Blob(['corrupted data'], { type: 'image/jpeg' })
    const result = await extractExif(corruptedBlob)

    expect(result).toBeDefined()
    expect(result.dateTime).toBeInstanceOf(Date)
    expect(result.latitude).toBeNull()
    expect(result.longitude).toBeNull()
  })
})
