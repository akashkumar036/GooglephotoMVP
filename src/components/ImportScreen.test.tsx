import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImportScreen } from './ImportScreen'

describe('ImportScreen Component (Phase 11.1)', () => {
  it('renders drop zone and privacy disclosure text', () => {
    render(<ImportScreen onStartProcessing={vi.fn()} />)

    expect(screen.getByText('Import Your Photos')).toBeDefined()
    expect(screen.getByRole('button', { name: /select photos|add photos/i })).toBeDefined()
    expect(screen.getByText(/Your photos stay on this device/i)).toBeDefined()
    expect(screen.getByText(/Only text descriptions are sent to Google AI/i)).toBeDefined()
  })

  it('allows file selection and displays count with Continue button', () => {
    const handleStart = vi.fn()
    render(<ImportScreen onStartProcessing={handleStart} />)

    const fileInput = screen.getByTestId('photo-file-input')
    const testFile1 = new File(['1'], 'flower.jpg', { type: 'image/jpeg' })
    const testFile2 = new File(['2'], 'sunset.png', { type: 'image/png' })

    fireEvent.change(fileInput, { target: { files: [testFile1, testFile2] } })

    // Bar should display "2 photos selected"
    expect(screen.getByText('2 photos selected')).toBeDefined()

    const continueBtn = screen.getByRole('button', { name: /continue/i })
    expect(continueBtn).toBeDefined()

    fireEvent.click(continueBtn)
    expect(handleStart).toHaveBeenCalledWith([testFile1, testFile2])
  })
})
