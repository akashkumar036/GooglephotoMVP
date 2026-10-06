import { describe, it, expect } from 'vitest'
import { demoPhotos } from './demoPhotos'

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

describe('Demo Dataset', () => {
  it('loads demo photos (174 photos total, >= 15 in key categories)', () => {
    expect(demoPhotos.length).toBeGreaterThanOrEqual(50)
    expect(demoPhotos.length).toBe(174)

    const medicines = demoPhotos.filter((p) => p.labels.includes('Medicine'))
    expect(medicines.length).toBeGreaterThanOrEqual(15)

    const foods = demoPhotos.filter((p) => p.labels.includes('Food'))
    expect(foods.length).toBeGreaterThanOrEqual(20)

    const buildings = demoPhotos.filter((p) => p.labels.includes('Building'))
    expect(buildings.length).toBeGreaterThanOrEqual(15)

    const animals = demoPhotos.filter((p) => p.labels.includes('Animals'))
    expect(animals.length).toBeGreaterThanOrEqual(20)

    const plants = demoPhotos.filter((p) => p.labels.includes('Plants'))
    expect(plants.length).toBeGreaterThanOrEqual(20)
  })

  it('has neighbors mapped correctly (within 30 mins)', () => {
    // med-2023 photos are at 09:00, 09:05, 09:10, 09:15, 09:20
    const med2023 = demoPhotos.filter(p => p.eventId === 'med-2023')
    expect(med2023.length).toBe(8)
    
    // First photo at 09:00 should have the other 4 as neighbors (they are all within 20 mins)
    expect(med2023[0].neighborIds).toEqual(
      expect.arrayContaining([med2023[1].id, med2023[2].id, med2023[3].id, med2023[4].id])
    )
  })

  it('cross-year medicine photos have high embedding cosine similarity (> 0.85)', () => {
    const med2023 = demoPhotos.filter(p => p.eventId === 'med-2023')
    const med2025 = demoPhotos.filter(p => p.eventId === 'med-2025')
    
    expect(med2023.length).toBe(8)
    expect(med2025.length).toBe(8)
    
    const emb1 = med2023[0].embedding!
    const emb2 = med2025[0].embedding!
    
    const similarity = cosineSimilarity(emb1, emb2)
    expect(similarity).toBeGreaterThan(0.85)
  })

  it('unrelated events have lower cosine similarity (< 0.2)', () => {
    const med2023 = demoPhotos.filter(p => p.eventId === 'med-2023')[0]
    const goa2024 = demoPhotos.filter(p => p.eventId === 'goa-2024')[0]
    
    const similarity = cosineSimilarity(med2023.embedding!, goa2024.embedding!)
    expect(similarity).toBeLessThan(0.2)
  })
})
