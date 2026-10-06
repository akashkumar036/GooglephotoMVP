import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClueBreadcrumb } from './ClueBreadcrumb'
import { useAppStore } from '../store/appStore'
import { demoPhotos } from '../data/demoPhotos'
import type { ClueChain } from '../types'

describe('ClueBreadcrumb Component (Phase 10)', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeMode: 'demo',
      userPhotos: [],
      photos: new Map(demoPhotos.map((p) => [p.id, p])),
    })
  })

  it('does not render when chain is null or depth <= 1', () => {
    const { container, rerender } = render(
      <ClueBreadcrumb
        chain={null}
        onStepClick={vi.fn()}
        onStartOver={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()

    const singleStepChain: ClueChain = {
      id: 'chain-1',
      steps: [
        {
          stepIndex: 0,
          cluePhotoId: demoPhotos[0].id,
          mode: 'similar',
          resultIds: [],
          timestamp: new Date(),
          label: 'medicine-2023',
        },
      ],
    }

    rerender(
      <ClueBreadcrumb
        chain={singleStepChain}
        onStepClick={vi.fn()}
        onStartOver={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders breadcrumb with correct step labels when chain depth > 1', () => {
    const multiStepChain: ClueChain = {
      id: 'chain-2',
      steps: [
        {
          stepIndex: 0,
          cluePhotoId: demoPhotos[0].id,
          mode: 'similar',
          resultIds: ['demo-202'],
          timestamp: new Date(),
          label: 'medicine-2023',
        },
        {
          stepIndex: 1,
          cluePhotoId: demoPhotos[1].id,
          mode: 'memory',
          resultIds: ['demo-203'],
          timestamp: new Date(),
          label: 'medicine-2025',
        },
      ],
    }

    render(
      <ClueBreadcrumb
        chain={multiStepChain}
        onStepClick={vi.fn()}
        onStartOver={vi.fn()}
      />
    )

    // Formats: Search -> [medicine-2023] Similar -> [medicine-2025] Memory -> Results
    expect(screen.getByText('Search')).toBeDefined()
    expect(screen.getByText(/\[medicine-2023\]/i)).toBeDefined()
    expect(screen.getByText('Similar')).toBeDefined()
    expect(screen.getByText(/\[medicine-2025\]/i)).toBeDefined()
    expect(screen.getByText('Memory')).toBeDefined()
    expect(screen.getByText('Results')).toBeDefined()
    expect(screen.getByRole('button', { name: /start over/i })).toBeDefined()
  })

  it('triggers onStepClick when clicking a previous step', () => {
    const handleStepClick = vi.fn()
    const multiStepChain: ClueChain = {
      id: 'chain-2',
      steps: [
        {
          stepIndex: 0,
          cluePhotoId: demoPhotos[0].id,
          mode: 'similar',
          resultIds: [],
          timestamp: new Date(),
          label: 'medicine-2023',
        },
        {
          stepIndex: 1,
          cluePhotoId: demoPhotos[1].id,
          mode: 'memory',
          resultIds: [],
          timestamp: new Date(),
          label: 'medicine-2025',
        },
      ],
    }

    render(
      <ClueBreadcrumb
        chain={multiStepChain}
        onStepClick={handleStepClick}
        onStartOver={vi.fn()}
      />
    )

    const step0Btn = screen.getByTitle(/Step 1: medicine-2023/i)
    fireEvent.click(step0Btn)
    expect(handleStepClick).toHaveBeenCalledWith(0)
  })

  it('triggers onStartOver when clicking "Start over"', () => {
    const handleStartOver = vi.fn()
    const multiStepChain: ClueChain = {
      id: 'chain-2',
      steps: [
        {
          stepIndex: 0,
          cluePhotoId: demoPhotos[0].id,
          mode: 'similar',
          resultIds: [],
          timestamp: new Date(),
          label: 'medicine-2023',
        },
        {
          stepIndex: 1,
          cluePhotoId: demoPhotos[1].id,
          mode: 'memory',
          resultIds: [],
          timestamp: new Date(),
          label: 'medicine-2025',
        },
      ],
    }

    render(
      <ClueBreadcrumb
        chain={multiStepChain}
        onStepClick={vi.fn()}
        onStartOver={handleStartOver}
      />
    )

    const startOverBtn = screen.getByRole('button', { name: /start over/i })
    fireEvent.click(startOverBtn)
    expect(handleStartOver).toHaveBeenCalled()
  })
})
