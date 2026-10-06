import React, { useEffect } from 'react'
import './Toast.css'

export interface ToastProps {
  message: string
  isOpen: boolean
  onClose: () => void
  duration?: number
  icon?: string
}

export const Toast: React.FC<ToastProps> = ({
  message,
  isOpen,
  onClose,
  duration = 3500,
  icon = 'check_circle',
}) => {
  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [isOpen, duration, onClose])

  if (!isOpen) return null

  return (
    <div
      className="toast-container"
      role="status"
      aria-live="polite"
    >
      <div className="toast-snackbar">
        {icon && <span className="material-symbols-outlined toast-icon">{icon}</span>}
        <span className="toast-message">{message}</span>
        <button
          type="button"
          className="toast-dismiss-btn"
          onClick={onClose}
          aria-label="Dismiss message"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  )
}
