import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './BottomSheet.css'

export interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  ariaLabel?: string
  className?: string
}

const DRAG_DISMISS_THRESHOLD = 80 // Pixels to trigger dismissal on drag

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  ariaLabel = 'Bottom Sheet',
  className = '',
}) => {
  const [isRendered, setIsRendered] = useState(isOpen)
  const [isVisible, setIsVisible] = useState(false)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const dragStartYRef = useRef<number | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  // React pattern: adjust state during render when prop changes
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setIsRendered(true)
    } else {
      setIsVisible(false)
    }
  }

  // Handle open / close animation sequencing
  useEffect(() => {
    let animTimer: number
    let unmountTimer: number

    if (isOpen) {
      animTimer = window.setTimeout(() => {
        setIsVisible(true)
      }, 16)
    } else if (isRendered) {
      unmountTimer = window.setTimeout(() => {
        setIsRendered(false)
        setDragOffset(0)
      }, 300)
    }

    return () => {
      window.clearTimeout(animTimer)
      window.clearTimeout(unmountTimer)
    }
  }, [isOpen, isRendered])

  // Body scroll lock
  useEffect(() => {
    if (!isRendered) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isRendered])

  // Focus management: save previous focus, focus first interactive element on open, restore on close
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus?.()
      previousFocusRef.current = null
    }
  }, [isOpen])

  useEffect(() => {
    if (!isVisible || !sheetRef.current) return

    // Focus first focusable element inside sheet after entrance animation starts
    const focusTimer = window.setTimeout(() => {
      if (sheetRef.current) {
        const focusable = sheetRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        focusable?.focus()
      }
    }, 50)

    return () => window.clearTimeout(focusTimer)
  }, [isVisible])

  // Escape key and Tab focus trap handlers
  useEffect(() => {
    if (!isRendered || !sheetRef.current) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab' && sheetRef.current) {
        const focusables = Array.from(
          sheetRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute('disabled'))

        if (focusables.length === 0) return

        const firstElement = focusables[0]
        const lastElement = focusables[focusables.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRendered, onClose])

  // Drag interaction handlers (Touch & Pointer)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only primary mouse button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return
    dragStartYRef.current = e.clientY
    setIsDragging(true)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || dragStartYRef.current === null) return
      const deltaY = e.clientY - dragStartYRef.current
      // Only permit downward drag
      if (deltaY > 0) {
        setDragOffset(deltaY)
      } else {
        // Subtle resistance when dragging up
        setDragOffset(deltaY * 0.2)
      }
    },
    [isDragging]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return
      setIsDragging(false)
      ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)

      if (dragOffset > DRAG_DISMISS_THRESHOLD) {
        onClose()
      } else {
        setDragOffset(0)
      }
      dragStartYRef.current = null
    },
    [isDragging, dragOffset, onClose]
  )

  const handlePointerCancel = useCallback(() => {
    setIsDragging(false)
    setDragOffset(0)
    dragStartYRef.current = null
  }, [])

  // Backdrop click handler
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isRendered) {
    return null
  }

  const sheetStyle: React.CSSProperties = {
    transform: isDragging
      ? `translateY(${Math.max(0, dragOffset)}px)`
      : isVisible
      ? 'translateY(0)'
      : 'translateY(100%)',
    transition: isDragging ? 'none' : 'transform 300ms ease',
  }

  return createPortal(
    <div
      className={`gp-bottom-sheet__overlay ${isVisible ? 'gp-bottom-sheet__overlay--visible' : ''}`}
      onClick={handleBackdropClick}
      data-testid="bottom-sheet-backdrop"
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`gp-bottom-sheet ${className}`}
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
        data-testid="bottom-sheet-container"
      >
        {/* Drag handle area */}
        <div
          className="gp-bottom-sheet__handle-wrapper"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          data-testid="bottom-sheet-handle"
        >
          <div className="gp-bottom-sheet__handle" />
        </div>

        {/* Sheet content */}
        <div className="gp-bottom-sheet__content">{children}</div>
      </div>
    </div>,
    document.body
  )
}
