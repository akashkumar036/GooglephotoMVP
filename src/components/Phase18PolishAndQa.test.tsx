import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BottomSheet } from './BottomSheet'
import { ContextMenu } from './ContextMenu'
import { ResultCard } from './ResultCard'
import { ResultsGrid } from './ResultsGrid'
import { ClueChoiceSheet } from './ClueChoiceSheet'
import { demoPhotos } from '../data/demoPhotos'
import { isMobileNetLoaded } from '../analysis/generateEmbedding'
import { useAppStore } from '../store/appStore'
import { MemoryRouter } from 'react-router-dom'
import type { RetrievalResult } from '../types'

describe('Phase 18 — Polish, Responsiveness, Accessibility & QA', () => {
  beforeEach(() => {
    useAppStore.setState({
      sheetOpen: false,
      activeClueId: null,
      selectedMode: null,
    })
  })

  // =========================================================================
  // 18.1 Animations
  // =========================================================================
  describe('18.1 Animations', () => {
    it('applies staggered card entrance delay (50ms per card) in ResultsGrid', () => {
      const mockResults: RetrievalResult[] = [
        { photo: demoPhotos[0], score: 0.95, reasons: [{ label: 'Visual match', type: 'visual' }] },
        { photo: demoPhotos[1], score: 0.88, reasons: [{ label: 'Visual match', type: 'visual' }] },
        { photo: demoPhotos[2], score: 0.82, reasons: [{ label: 'Visual match', type: 'visual' }] },
      ]

      const { container } = render(
        <ResultsGrid
          results={mockResults}
          mode="similar"
          selectedPhotoId={null}
          onSelect={vi.fn()}
          onDeselect={vi.fn()}
          onMenuOpen={vi.fn()}
        />
      )

      const cells = container.querySelectorAll('.results-grid__cell')
      expect(cells.length).toBe(3)
      expect((cells[0] as HTMLElement).style.animationDelay).toBe('0ms')
      expect((cells[1] as HTMLElement).style.animationDelay).toBe('50ms')
      expect((cells[2] as HTMLElement).style.animationDelay).toBe('100ms')
    })

    it('renders reason chip with pending state initially and loaded state after image loads', () => {
      const result: RetrievalResult = {
        photo: demoPhotos[0],
        score: 0.9,
        reasons: [{ label: 'Similar appearance', type: 'visual' }],
      }

      render(
        <ResultCard
          result={result}
          mode="similar"
          isSelected={false}
          onSelect={vi.fn()}
          onDeselect={vi.fn()}
          onMenuOpen={vi.fn()}
        />
      )

      const chip = screen.getByLabelText('Reason: Similar appearance')
      expect(chip.className).toContain('result-card__chip--pending')

      const img = screen.getByRole('img')
      fireEvent.load(img)

      expect(chip.className).toContain('result-card__chip--loaded')
    })
  })

  // =========================================================================
  // 18.3 Accessibility & Focus Management
  // =========================================================================
  describe('18.3 Accessibility & Focus Management', () => {
    it('focuses first interactive element inside BottomSheet when opened and traps Tab focus', async () => {
      const handleClose = vi.fn()

      const { rerender } = render(
        <BottomSheet isOpen={false} onClose={handleClose} ariaLabel="Test Sheet">
          <button id="btn-1">Option 1</button>
          <button id="btn-2">Option 2</button>
        </BottomSheet>
      )

      // Open sheet
      rerender(
        <BottomSheet isOpen={true} onClose={handleClose} ariaLabel="Test Sheet">
          <button id="btn-1">Option 1</button>
          <button id="btn-2">Option 2</button>
        </BottomSheet>
      )

      await waitFor(() => {
        const btn1 = screen.getByRole('button', { name: 'Option 1' })
        expect(document.activeElement).toBe(btn1)
      })

      // Test Tab trapping from last to first
      const btn2 = screen.getByRole('button', { name: 'Option 2' })
      btn2.focus()
      expect(document.activeElement).toBe(btn2)

      fireEvent.keyDown(window, { key: 'Tab', shiftKey: false })
      const btn1 = screen.getByRole('button', { name: 'Option 1' })
      expect(document.activeElement).toBe(btn1)

      // Test Escape closes sheet
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(handleClose).toHaveBeenCalled()
    })

    it('supports ArrowDown and ArrowUp navigation inside ContextMenu and closes on Escape', async () => {
      const handleClose = vi.fn()
      const handleUseAsClue = vi.fn()
      const dummyAnchor = document.createElement('div')
      document.body.appendChild(dummyAnchor)

      render(
        <ContextMenu
          photoId="photo-1"
          anchorEl={dummyAnchor}
          onClose={handleClose}
          onUseAsClue={handleUseAsClue}
        />
      )

      const menu = screen.getByRole('menu', { name: 'Photo options' })
      expect(menu).toBeDefined()

      // Arrow navigation
      const items = screen.getAllByRole('menuitem')
      expect(items.length).toBeGreaterThan(1)

      // Arrow down moves focus
      items[0].focus()
      fireEvent.keyDown(window, { key: 'ArrowDown' })
      expect(document.activeElement).toBe(items[1])

      // Arrow up moves focus back
      fireEvent.keyDown(window, { key: 'ArrowUp' })
      expect(document.activeElement).toBe(items[0])

      // Escape closes menu
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(handleClose).toHaveBeenCalled()

      document.body.removeChild(dummyAnchor)
    })

    it('provides descriptive aria-labels for ClueChoiceSheet retrieval option cards', () => {
      useAppStore.setState({
        sheetOpen: true,
        activeClueId: demoPhotos[0].id,
      })

      render(
        <MemoryRouter>
          <ClueChoiceSheet />
        </MemoryRouter>
      )

      const similarBtn = screen.getByRole('listitem', {
        name: /Search similar to this photo: Find photos that look like this/i,
      })
      expect(similarBtn).toBeDefined()

      const memoryBtn = screen.getByRole('listitem', {
        name: /Search around this memory: Find photos connected to this moment/i,
      })
      expect(memoryBtn).toBeDefined()

      const bestBtn = screen.getByRole('listitem', {
        name: /Let Photos find the best match: Use the clues most likely/i,
      })
      expect(bestBtn).toBeDefined()
    })
  })

  // =========================================================================
  // 18.4 Performance
  // =========================================================================
  describe('18.4 Performance', () => {
    it('does not load MobileNet model eagerly at application startup', () => {
      // MobileNet must remain unloaded until user explicitly imports photos
      expect(isMobileNetLoaded()).toBe(false)
    })

    it('ensures result photos use loading="lazy" attribute', () => {
      const result: RetrievalResult = {
        photo: demoPhotos[0],
        score: 0.95,
        reasons: [{ label: 'Visual match', type: 'visual' }],
      }

      render(
        <ResultCard
          result={result}
          mode="similar"
          isSelected={false}
          onSelect={vi.fn()}
          onDeselect={vi.fn()}
          onMenuOpen={vi.fn()}
        />
      )

      const img = screen.getByRole('img')
      expect(img.getAttribute('loading')).toBe('lazy')
    })
  })
})
