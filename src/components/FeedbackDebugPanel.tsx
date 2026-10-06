import React, { useState } from 'react'
import { getFeedbackStats, clearAllFeedback } from '../engine/feedbackStorage'
import './FeedbackDebugPanel.css'

export interface FeedbackDebugPanelProps {
  isOpen?: boolean
  onToggle?: () => void
}

export const FeedbackDebugPanel: React.FC<FeedbackDebugPanelProps> = ({
  isOpen: controlledIsOpen,
}) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const [, setRefreshTrigger] = useState(0)

  const isExpanded = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen
  const stats = isExpanded
    ? getFeedbackStats()
    : { total: 0, yesCount: 0, notYetCount: 0, notSureCount: 0, successRate: 0, signalCounts: {} }

  const handleClear = () => {
    clearAllFeedback()
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="feedback-debug-panel" role="region" aria-label="Feedback debug inspector">
      <button
        type="button"
        className="feedback-debug-panel__toggle-btn"
        onClick={() => setInternalOpen(!internalOpen)}
        title="Toggle Memory Clue Feedback Debug Panel"
      >
        <span className="material-symbols-outlined">bug_report</span>
        <span>Feedback Stats ({stats.total})</span>
      </button>

      {isExpanded && (
        <div className="feedback-debug-panel__content">
          <div className="feedback-debug-panel__header">
            <h4 className="feedback-debug-panel__title">Feedback Metrics</h4>
            <button
              type="button"
              className="feedback-debug-panel__close-icon"
              onClick={() => setInternalOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="feedback-debug-panel__summary">
            <div className="feedback-debug-panel__metric">
              <span className="metric-value">{stats.total}</span>
              <span className="metric-label">Total</span>
            </div>
            <div className="feedback-debug-panel__metric">
              <span className="metric-value">{stats.successRate}%</span>
              <span className="metric-label">Success</span>
            </div>
            <div className="feedback-debug-panel__metric">
              <span className="metric-value">{stats.yesCount}</span>
              <span className="metric-label">Yes</span>
            </div>
            <div className="feedback-debug-panel__metric">
              <span className="metric-value">{stats.notYetCount + stats.notSureCount}</span>
              <span className="metric-label">Other</span>
            </div>
          </div>

          <div className="feedback-debug-panel__signals">
            <h5 className="signals-title">Helpful Signals Breakdown:</h5>
            {Object.keys(stats.signalCounts).length === 0 ? (
              <p className="no-signals">No signal tags submitted yet.</p>
            ) : (
              <ul className="signals-list">
                {Object.entries(stats.signalCounts).map(([sig, count]) => (
                  <li key={sig} className="signals-item">
                    <span className="signals-name">{sig}</span>
                    <span className="signals-count">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="feedback-debug-panel__footer">
            <button
              type="button"
              className="feedback-debug-panel__btn-clear"
              onClick={handleClear}
            >
              Clear Storage
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
