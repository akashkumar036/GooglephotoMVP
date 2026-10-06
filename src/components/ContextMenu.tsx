import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './ContextMenu.css'

interface ContextMenuProps {
  photoId: string
  anchorEl: HTMLElement
  onClose: () => void
  onUseAsClue: (photoId: string) => void
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  photoId,
  anchorEl,
  onClose,
  onUseAsClue,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({})

  // Compute position
  useEffect(() => {
    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect()
      
      let top = rect.top + window.scrollY
      let left = rect.left + window.scrollX
      
      // We want to open below and to the right of the anchor, 
      // but if it goes off screen we adjust.
      // Default: anchor top-right
      top += rect.height
      left += rect.width
      
      // Basic bounding (assuming menu is ~220px wide and 180px high)
      if (left + 220 > window.innerWidth) {
        left = window.innerWidth - 230
      }
      if (top + 180 > window.innerHeight) {
        top = rect.top + window.scrollY - 180
      }

      setStyle({
        top: `${Math.max(10, top)}px`,
        left: `${Math.max(10, left)}px`,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)
    
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [anchorEl])

  // Handle outside click & escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (menuRef.current && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault()
        const items = Array.from(menuRef.current.querySelectorAll<HTMLButtonElement>('button.gp-context-menu__item'))
        if (items.length === 0) return
        const activeIdx = items.indexOf(document.activeElement as HTMLButtonElement)
        let nextIdx = e.key === 'ArrowDown' ? activeIdx + 1 : activeIdx - 1
        if (nextIdx < 0) nextIdx = items.length - 1
        if (nextIdx >= items.length) nextIdx = 0
        items[nextIdx]?.focus()
      }
    }

    // Small delay to prevent immediate close from the click that opened it and focus first item
    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick)
      document.addEventListener('contextmenu', handleOutsideClick)
      if (menuRef.current) {
        const firstItem = menuRef.current.querySelector<HTMLButtonElement>('button.gp-context-menu__item')
        firstItem?.focus()
      }
    }, 10)
    
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleOutsideClick)
      document.removeEventListener('contextmenu', handleOutsideClick)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const menu = (
    <div
      className="gp-context-menu"
      ref={menuRef}
      style={style}
      role="menu"
      aria-label="Photo options"
    >
      <button className="gp-context-menu__item" role="menuitem" onClick={onClose}>
        <span className="material-symbols-outlined">share</span>
        <span>Share</span>
      </button>
      <button className="gp-context-menu__item" role="menuitem" onClick={onClose}>
        <span className="material-symbols-outlined">library_add</span>
        <span>Add to album</span>
      </button>
      <button className="gp-context-menu__item" role="menuitem" onClick={onClose}>
        <span className="material-symbols-outlined">download</span>
        <span>Download</span>
      </button>
      
      <div className="gp-context-menu__divider" />
      
      <button 
        className="gp-context-menu__item gp-context-menu__item--accent" 
        role="menuitem"
        onClick={() => {
          onUseAsClue(photoId)
        }}
      >
        <span className="material-symbols-outlined">magic_button</span>
        <span>Use this photo as a clue</span>
      </button>
    </div>
  )

  return createPortal(menu, document.body)
}
