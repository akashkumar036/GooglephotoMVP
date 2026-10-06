import React, { useState } from 'react'
import type { RetrievalMode } from '../types'
import { saveFeedback } from '../engine/feedbackStorage'
import './FeedbackPrompt.css'

export interface FeedbackPromptProps {
  mode: RetrievalMode
  chainDepth?: number
  onClose: () => void
  onTryAnotherClue?: () => void
  onChangeApproach?: () => void
  onStartNewSearch?: () => void
}

const HELPFUL_SIGNAL_OPTIONS = [
  'Similar appearance',
  'Same place',
  'Same event',
  'Same people',
  'Nearby in time',
  'Another clue photo',
  'Best Match',
]

type FeedbackStep = 'initial' | 'followup_yes' | 'followup_not_yet' | 'completed'

export const FeedbackPrompt: React.FC<FeedbackPromptProps> = ({
  mode,
  chainDepth = 1,
  onClose,
  onTryAnotherClue,
  onChangeApproach,
  onStartNewSearch,
}) => {
  const [step, setStep] = useState<FeedbackStep>('initial')
  const [successResponse, setSuccessResponse] = useState<'yes' | 'not_yet' | 'not_sure'>('yes')
  const [selectedSignals, setSelectedSignals] = useState<string[]>([])

  const handleInitialChoice = (choice: 'yes' | 'not_yet' | 'not_sure') => {
    setSuccessResponse(choice)
    if (choice === 'yes') {
      setStep('followup_yes')
    } else {
      // Save the not_yet / not_sure response immediately
      saveFeedback({
        mode,
        chainDepth,
        success: choice,
        helpfulSignals: [],
      })
      setStep('followup_not_yet')
    }
  }

  const toggleSignal = (signal: string) => {
    setSelectedSignals((prev) =>
      prev.includes(signal) ? prev.filter((s) => s !== signal) : [...prev, signal]
    )
  }

  const handleDoneYes = () => {
    saveFeedback({
      mode,
      chainDepth,
      success: successResponse,
      helpfulSignals: selectedSignals,
    })
    setStep('completed')
    setTimeout(() => {
      onClose()
    }, 1800)
  }

  return (
    <div
      className="feedback-prompt"
      role="region"
      aria-label="Search feedback prompt"
    >
      <button
        type="button"
        className="feedback-prompt__close-btn"
        onClick={onClose}
        aria-label="Dismiss feedback prompt"
      >
        <span className="material-symbols-outlined">close</span>
      </button>

      {/* Step 1: Initial question */}
      {step === 'initial' && (
        <div className="feedback-prompt__step feedback-prompt__step--initial">
          <span className="feedback-prompt__question">
            Did you find the photo you were looking for?
          </span>
          <div className="feedback-prompt__btn-group">
            <button
              type="button"
              className="feedback-prompt__btn feedback-prompt__btn--yes"
              onClick={() => handleInitialChoice('yes')}
            >
              <span className="material-symbols-outlined">check</span>
              <span>Yes ✓</span>
            </button>
            <button
              type="button"
              className="feedback-prompt__btn feedback-prompt__btn--not-yet"
              onClick={() => handleInitialChoice('not_yet')}
            >
              Not yet
            </button>
            <button
              type="button"
              className="feedback-prompt__btn feedback-prompt__btn--not-sure"
              onClick={() => handleInitialChoice('not_sure')}
            >
              I'm not sure
            </button>
          </div>
        </div>
      )}

      {/* Step 2A: Follow-up on Yes */}
      {step === 'followup_yes' && (
        <div className="feedback-prompt__step feedback-prompt__step--yes">
          <span className="feedback-prompt__question">What helped you find it?</span>
          <div className="feedback-prompt__signals-grid">
            {HELPFUL_SIGNAL_OPTIONS.map((signal) => {
              const isChecked = selectedSignals.includes(signal)
              return (
                <label
                  key={signal}
                  className={`feedback-prompt__checkbox-chip${isChecked ? ' feedback-prompt__checkbox-chip--selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSignal(signal)}
                    className="feedback-prompt__checkbox-input"
                  />
                  <span className="material-symbols-outlined feedback-prompt__check-icon">
                    {isChecked ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  <span>{signal}</span>
                </label>
              )
            })}
          </div>
          <div className="feedback-prompt__actions">
            <button
              type="button"
              className="feedback-prompt__btn feedback-prompt__btn--primary"
              onClick={handleDoneYes}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Step 2B: Follow-up on Not Yet / Not Sure */}
      {step === 'followup_not_yet' && (
        <div className="feedback-prompt__step feedback-prompt__step--not-yet">
          <span className="feedback-prompt__question">Keep going:</span>
          <div className="feedback-prompt__btn-group">
            {onTryAnotherClue && (
              <button
                type="button"
                className="feedback-prompt__btn feedback-prompt__btn--action"
                onClick={() => {
                  onClose()
                  onTryAnotherClue()
                }}
              >
                <span className="material-symbols-outlined">lightbulb</span>
                <span>Try another clue</span>
              </button>
            )}
            {onChangeApproach && (
              <button
                type="button"
                className="feedback-prompt__btn feedback-prompt__btn--action"
                onClick={() => {
                  onClose()
                  onChangeApproach()
                }}
              >
                <span className="material-symbols-outlined">tune</span>
                <span>Change search approach</span>
              </button>
            )}
            {onStartNewSearch && (
              <button
                type="button"
                className="feedback-prompt__btn feedback-prompt__btn--action"
                onClick={() => {
                  onClose()
                  onStartNewSearch()
                }}
              >
                <span className="material-symbols-outlined">search</span>
                <span>Start new search</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Thank you acknowledgement */}
      {step === 'completed' && (
        <div className="feedback-prompt__step feedback-prompt__step--completed">
          <span className="material-symbols-outlined feedback-prompt__thanks-icon">
            check_circle
          </span>
          <span className="feedback-prompt__thanks-text">Thanks for your feedback!</span>
        </div>
      )}
    </div>
  )
}
