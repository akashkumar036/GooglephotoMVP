import React from 'react'
import './SessionRestoreNotice.css'

export interface SessionRestoreNoticeProps {
  photoCount: number
  onContinue: () => void
  onClearAndStartFresh: () => void
}

export const SessionRestoreNotice: React.FC<SessionRestoreNoticeProps> = ({
  photoCount,
  onContinue,
  onClearAndStartFresh,
}) => {
  return (
    <div
      className="session-restore-notice"
      role="region"
      aria-label="Previous session photos notice"
    >
      <div className="session-restore-notice__content">
        <span className="material-symbols-outlined session-restore-notice__icon">
          history
        </span>
        <span className="session-restore-notice__text">
          You have {photoCount} {photoCount === 1 ? 'photo' : 'photos'} from your last session.
        </span>
      </div>

      <div className="session-restore-notice__actions">
        <button
          type="button"
          className="session-restore-notice__btn session-restore-notice__btn--continue"
          onClick={onContinue}
        >
          Continue
        </button>
        <button
          type="button"
          className="session-restore-notice__btn session-restore-notice__btn--clear"
          onClick={onClearAndStartFresh}
        >
          Clear and start fresh
        </button>
      </div>
    </div>
  )
}
