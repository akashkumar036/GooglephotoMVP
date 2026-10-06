import { describe, it, expect } from 'vitest'
import { clusterPhotos } from './clusterPhotos'
import type { Photo } from '../types'

function makeMockPhoto(partial: Partial<Photo>): Photo {
  return {
    id: partial.id || `photo-${Math.random()}`,
    source: 'user',
    imageUrl: '',
    thumbnailUrl: '',
    dateTime: partial.dateTime !== undefined ? partial.dateTime : new Date('2024-03-10T12:00:00Z'),
    datePrecision: 'exact',
    latitude: partial.latitude !== undefined ? partial.latitude : 15.2993,
    longitude: partial.longitude !== undefined ? partial.longitude : 74.124,
    locationName: partial.locationName !== undefined ? partial.locationName : 'Goa, India',
    objects: [],
    labels: [],
    ocrText: null,
    description: '',
    people: [],
    embedding: null,
    eventId: null,
    eventName: null,
    tripId: null,
    neighborIds: [],
    filename: partial.filename || 'img.jpg',
    width: 800,
    height: 600,
    fileSize: 1024,
  }
}

describe('Photo Clustering (Phase 11.8)', () => {
  it('groups photos on same day within 2 hours into same eventId', () => {
    const photo1 = makeMockPhoto({
      id: 'p1',
      dateTime: new Date('2024-03-10T10:00:00Z'),
    })
    const photo2 = makeMockPhoto({
      id: 'p2',
      dateTime: new Date('2024-03-10T11:15:00Z'), // 1h 15m later (within 2h)
    })
    const photo3 = makeMockPhoto({
      id: 'p3',
      dateTime: new Date('2024-03-10T16:00:00Z'), // 6h later (separate event)
    })

    const clustered = clusterPhotos([photo1, photo2, photo3])

    const c1 = clustered.find((p) => p.id === 'p1')!
    const c2 = clustered.find((p) => p.id === 'p2')!
    const c3 = clustered.find((p) => p.id === 'p3')!

    expect(c1.eventId).toBe(c2.eventId)
    expect(c1.eventId).not.toBe(c3.eventId)
  })

  it('assigns neighborIds for photos taken within ±30 minutes', () => {
    const photoA = makeMockPhoto({
      id: 'pA',
      dateTime: new Date('2024-03-10T14:00:00Z'),
    })
    const photoB = makeMockPhoto({
      id: 'pB',
      dateTime: new Date('2024-03-10T14:20:00Z'), // 20m later (within 30m)
    })
    const photoC = makeMockPhoto({
      id: 'pC',
      dateTime: new Date('2024-03-10T15:00:00Z'), // 60m later (outside 30m)
    })

    const clustered = clusterPhotos([photoA, photoB, photoC])

    const cA = clustered.find((p) => p.id === 'pA')!
    expect(cA.neighborIds).toContain('pB')
    expect(cA.neighborIds).not.toContain('pC')
  })

  it('assigns tripId when photos at same location span across multiple days', () => {
    const day1Photo = makeMockPhoto({
      id: 'pDay1',
      dateTime: new Date('2024-03-10T10:00:00Z'),
      locationName: 'Goa',
    })
    const day2Photo = makeMockPhoto({
      id: 'pDay2',
      dateTime: new Date('2024-03-12T11:00:00Z'),
      locationName: 'Goa',
    })

    const clustered = clusterPhotos([day1Photo, day2Photo])

    expect(clustered[0].tripId).toBe('trip-goa')
    expect(clustered[1].tripId).toBe('trip-goa')
  })
})
