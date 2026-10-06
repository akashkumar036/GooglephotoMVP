import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProcessingScreen } from './ProcessingScreen'
import type { ProcessingProgress } from '../types'

describe('ProcessingScreen Component (Phase 11.10)', () => {
  it('renders progress bar, stage label, and checklist', () => {
    const progress: ProcessingProgress = {
      total: 20,
      current: 8,
      stage: 'embedding',
      stageLabel: 'Generating AI visual embedding for photo 8 of 20...',
      percentage: 50,
    }

    render(<ProcessingScreen progress={progress} />)

    expect(screen.getByText('Preparing your photos')).toBeDefined()
    expect(screen.getByText('Generating AI visual embedding for photo 8 of 20...')).toBeDefined()
    expect(screen.getByText('Analyzed 8 of 20 photos')).toBeDefined()
    expect(screen.getByText(/Photos imported & validated/i)).toBeDefined()
    expect(screen.getByText(/Extracting visual neural embeddings/i)).toBeDefined()
  })
})
