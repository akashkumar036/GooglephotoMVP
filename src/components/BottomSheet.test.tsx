import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BottomSheet } from './BottomSheet'

describe('BottomSheet Component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders content when isOpen is true', () => {
    render(
      <BottomSheet isOpen={true} onClose={() => {}}>
        <div>Sheet Content Test</div>
      </BottomSheet>
    )

    expect(screen.getByText('Sheet Content Test')).toBeDefined()
    expect(screen.getByTestId('bottom-sheet-container')).toBeDefined()
  })

  it('does not render content when isOpen is false', () => {
    render(
      <BottomSheet isOpen={false} onClose={() => {}}>
        <div>Sheet Content Hidden</div>
      </BottomSheet>
    )

    expect(screen.queryByText('Sheet Content Hidden')).toBeNull()
  })

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn()
    render(
      <BottomSheet isOpen={true} onClose={handleClose}>
        <div>Click outside test</div>
      </BottomSheet>
    )

    const backdrop = screen.getByTestId('bottom-sheet-backdrop')
    fireEvent.click(backdrop)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when sheet container is clicked', () => {
    const handleClose = vi.fn()
    render(
      <BottomSheet isOpen={true} onClose={handleClose}>
        <div data-testid="inner-content">Inside Sheet</div>
      </BottomSheet>
    )

    const innerContent = screen.getByTestId('inner-content')
    fireEvent.click(innerContent)
    expect(handleClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn()
    render(
      <BottomSheet isOpen={true} onClose={handleClose}>
        <div>Escape test</div>
      </BottomSheet>
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('triggers onClose when dragged down past threshold', () => {
    const handleClose = vi.fn()
    render(
      <BottomSheet isOpen={true} onClose={handleClose}>
        <div>Drag dismiss test</div>
      </BottomSheet>
    )

    const handle = screen.getByTestId('bottom-sheet-handle')

    // Simulate pointer drag downwards > 80px
    fireEvent.pointerDown(handle, { clientY: 100, button: 0 })
    fireEvent.pointerMove(handle, { clientY: 220 })
    fireEvent.pointerUp(handle, { clientY: 220 })

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('snaps back and does NOT trigger onClose when dragged down less than threshold', () => {
    const handleClose = vi.fn()
    render(
      <BottomSheet isOpen={true} onClose={handleClose}>
        <div>Snap back test</div>
      </BottomSheet>
    )

    const handle = screen.getByTestId('bottom-sheet-handle')

    // Simulate slight pointer drag downwards (30px < 80px threshold)
    fireEvent.pointerDown(handle, { clientY: 100, button: 0 })
    fireEvent.pointerMove(handle, { clientY: 130 })
    fireEvent.pointerUp(handle, { clientY: 130 })

    expect(handleClose).not.toHaveBeenCalled()
  })
})
