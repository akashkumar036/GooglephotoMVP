import type { Photo } from '../types'
import { haversineDistanceKm } from '../engine/retrieveMemory'

/**
 * Event and trip clustering for newly imported photos
 * Phase 11.8: Event Clustering
 *
 * Rules:
 * - Group by temporal proximity: same day + within 2 hours -> same event
 * - Group by location: within 2km on same day -> same location cluster
 * - Multi-day same location -> trip cluster
 * - Assign eventId, eventName, tripId, neighborIds (photos within ±30 min)
 */

export function clusterPhotos(photos: Photo[]): Photo[] {
  if (photos.length === 0) return []

  // Sort photos chronologically
  const sorted = [...photos].sort((a, b) => {
    const timeA = a.dateTime ? new Date(a.dateTime).getTime() : 0
    const timeB = b.dateTime ? new Date(b.dateTime).getTime() : 0
    return timeA - timeB
  })

  // 1. Assign neighborIds (taken within ±30 minutes = 1,800,000 ms)
  const THIRTY_MINUTES_MS = 30 * 60 * 1000
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]
    if (!current.dateTime) {
      current.neighborIds = []
      continue
    }
    const currentMs = new Date(current.dateTime).getTime()
    current.neighborIds = sorted
      .filter((other) => {
        if (other.id === current.id || !other.dateTime) return false
        const otherMs = new Date(other.dateTime).getTime()
        return Math.abs(currentMs - otherMs) <= THIRTY_MINUTES_MS
      })
      .map((other) => other.id)
  }

  // 2. Temporal & Location clustering into events (within 2 hours, within 2km, same calendar day)
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000
  let currentEventIndex = 1
  const assignedEvents = new Map<string, { eventId: string; eventName: string }>()

  for (let i = 0; i < sorted.length; i++) {
    const photo = sorted[i]
    if (assignedEvents.has(photo.id)) continue

    const photoTime = photo.dateTime ? new Date(photo.dateTime).getTime() : 0
    const dateStr = photo.dateTime
      ? new Date(photo.dateTime).toISOString().slice(0, 10)
      : 'undated'

    const eventId = `event-${dateStr}-${currentEventIndex}`
    const eventName = photo.locationName
      ? `${photo.locationName} (${dateStr})`
      : `Event ${dateStr}`

    assignedEvents.set(photo.id, { eventId, eventName })

    // Find all unassigned photos that belong to this event
    for (let j = i + 1; j < sorted.length; j++) {
      const candidate = sorted[j]
      if (assignedEvents.has(candidate.id)) continue

      const candidateTime = candidate.dateTime ? new Date(candidate.dateTime).getTime() : 0
      const candidateDateStr = candidate.dateTime
        ? new Date(candidate.dateTime).toISOString().slice(0, 10)
        : 'undated'

      // Check same calendar day
      const sameDay = dateStr === candidateDateStr

      // Check within 2 hours
      const withinTwoHours = Math.abs(candidateTime - photoTime) <= TWO_HOURS_MS

      // Check location proximity if coordinates exist
      let withinTwoKm = true
      if (
        photo.latitude !== null &&
        photo.longitude !== null &&
        candidate.latitude !== null &&
        candidate.longitude !== null
      ) {
        const km = haversineDistanceKm(
          photo.latitude,
          photo.longitude,
          candidate.latitude,
          candidate.longitude
        )
        withinTwoKm = km <= 2.0
      }

      if (sameDay && withinTwoHours && withinTwoKm) {
        assignedEvents.set(candidate.id, { eventId, eventName })
      }
    }

    currentEventIndex++
  }

  // 3. Multi-day same location clustering into trips
  // If photos at same location (or locationName) span across multiple calendar days
  const locationDayMap = new Map<string, Set<string>>()
  for (const photo of sorted) {
    if (photo.locationName && photo.dateTime) {
      const locKey = photo.locationName.toLowerCase().trim()
      const day = new Date(photo.dateTime).toISOString().slice(0, 10)
      if (!locationDayMap.has(locKey)) {
        locationDayMap.set(locKey, new Set())
      }
      locationDayMap.get(locKey)!.add(day)
    }
  }

  const multiDayLocations = new Set<string>()
  locationDayMap.forEach((days, locKey) => {
    if (days.size >= 2) {
      multiDayLocations.add(locKey)
    }
  })

  // Apply clusters to photos
  return sorted.map((p) => {
    const event = assignedEvents.get(p.id)
    const locKey = p.locationName ? p.locationName.toLowerCase().trim() : ''
    const isTrip = locKey ? multiDayLocations.has(locKey) : false
    const tripId = isTrip ? `trip-${locKey.replace(/\s+/g, '-')}` : null

    return {
      ...p,
      eventId: event?.eventId || null,
      eventName: event?.eventName || null,
      tripId,
    }
  })
}
