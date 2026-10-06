import exifr from 'exifr'
import type { DatePrecision } from '../types'

export interface ExtractedExifData {
  dateTime: Date
  datePrecision: DatePrecision
  latitude: number | null
  longitude: number | null
  make: string | null
  model: string | null
}

/**
 * Extracts EXIF metadata from an image file using exifr.
 * Falls back to file.lastModified if no EXIF timestamp is present.
 * Sets GPS coordinates to null if unavailable.
 */
export async function extractExif(file: File | Blob): Promise<ExtractedExifData> {
  const fallbackDate =
    file instanceof File && file.lastModified
      ? new Date(file.lastModified)
      : new Date()

  try {
    const output = await exifr.parse(file, [
      'DateTimeOriginal',
      'CreateDate',
      'ModifyDate',
      'GPSLatitude',
      'GPSLongitude',
      'latitude',
      'longitude',
      'Make',
      'Model',
    ])

    if (!output) {
      return {
        dateTime: fallbackDate,
        datePrecision: 'approximate',
        latitude: null,
        longitude: null,
        make: null,
        model: null,
      }
    }

    // Resolve date
    const parsedDate = output.DateTimeOriginal || output.CreateDate || output.ModifyDate
    let dateTime = fallbackDate
    let datePrecision: DatePrecision = 'approximate'

    if (parsedDate instanceof Date && !isNaN(parsedDate.getTime())) {
      dateTime = parsedDate
      datePrecision = 'exact'
    } else if (typeof parsedDate === 'string') {
      const d = new Date(parsedDate)
      if (!isNaN(d.getTime())) {
        dateTime = d
        datePrecision = 'exact'
      }
    }

    // Resolve GPS coordinates
    const lat = typeof output.latitude === 'number' ? output.latitude : typeof output.GPSLatitude === 'number' ? output.GPSLatitude : null
    const lng = typeof output.longitude === 'number' ? output.longitude : typeof output.GPSLongitude === 'number' ? output.GPSLongitude : null

    return {
      dateTime,
      datePrecision,
      latitude: lat,
      longitude: lng,
      make: output.Make ? String(output.Make).trim() : null,
      model: output.Model ? String(output.Model).trim() : null,
    }
  } catch {
    // If exifr parsing fails (e.g. non-JPEG or corrupted header), safely fallback
    const hasLastModified = file instanceof File && Boolean(file.lastModified)
    return {
      dateTime: fallbackDate,
      datePrecision: hasLastModified ? 'approximate' : 'unknown',
      latitude: null,
      longitude: null,
      make: null,
      model: null,
    }
  }
}
