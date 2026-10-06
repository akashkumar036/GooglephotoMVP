import { describe, it, expect } from 'vitest'
import { buildIndex, searchIndex } from './searchIndex'
import { demoPhotos } from '../data/demoPhotos'

describe('Search Engine', () => {
  const index = buildIndex(demoPhotos)

  it('finds medicine photos', () => {
    const results = searchIndex(index, 'medicine')
    expect(results.length).toBeGreaterThan(0)
    
    // Check that we got med-2023 or med-2025 photos
    for (const res of results) {
      expect(res.photo.eventId).toMatch(/med-202(3|5)/)
    }
  })

  it('finds goa photos', () => {
    const results = searchIndex(index, 'goa')
    expect(results.length).toBeGreaterThan(0)
    
    for (const res of results) {
      expect(res.photo.locationName).toContain('Goa')
    }
  })

  it('finds birthday photos', () => {
    const results = searchIndex(index, 'birthday')
    expect(results.length).toBeGreaterThan(0)
    
    for (const res of results) {
      expect(res.photo.eventId).toBe('birthday-2024')
    }
  })

  it('scores correctly (description matches rank higher than filename)', () => {
    const results = searchIndex(index, 'birthday')
    
    // Top score should be >= 1.5 because "birthday" is in the description (label)
    expect(results[0].score).toBeGreaterThanOrEqual(1.5)
  })
})
