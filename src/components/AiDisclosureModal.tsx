import React from 'react'
import './AiDisclosureModal.css'

export interface AiDisclosureModalProps {
  isOpen: boolean
  onAccept: () => void
  onDecline: () => void
}

export const AiDisclosureModal: React.FC<AiDisclosureModalProps> = ({
  isOpen,
  onAccept,
  onDecline,
}) => {
  if (!isOpen) return null

  return (
    <div className="ai-disclosure-backdrop" role="dialog" aria-modal="true" aria-labelledby="ai-disclosure-title">
      <div className="ai-disclosure-card">
        <div className="ai-disclosure-header">
          <div className="ai-disclosure-icon-wrap">
            <span className="material-symbols-outlined ai-disclosure-icon">auto_awesome</span>
          </div>
          <h2 id="ai-disclosure-title" className="ai-disclosure-title">
            Best Match with Google AI
          </h2>
        </div>

        <p className="ai-disclosure-body">
          To find the best match, Google AI will analyze descriptions of your photos (not the images themselves).
        </p>

        <div className="ai-disclosure-actions">
          <button
            type="button"
            className="ai-disclosure-btn ai-disclosure-btn--secondary"
            onClick={onDecline}
          >
            Use local search instead
          </button>
          <button
            type="button"
            className="ai-disclosure-btn ai-disclosure-btn--primary"
            onClick={onAccept}
            autoFocus
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
