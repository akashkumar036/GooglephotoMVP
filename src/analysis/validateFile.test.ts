import { describe, it, expect } from 'vitest'
import { validateFile, validateFiles, MAX_FILE_SIZE_BYTES } from './validateFile'

describe('File Validation (Phase 11.2)', () => {
  it('accepts valid JPEG, PNG, WEBP, and GIF files', () => {
    const jpegFile = new File(['fake-content'], 'vacation.jpg', { type: 'image/jpeg' })
    const pngFile = new File(['fake-content'], 'screenshot.png', { type: 'image/png' })
    const webpFile = new File(['fake-content'], 'nature.webp', { type: 'image/webp' })
    const gifFile = new File(['fake-content'], 'animation.gif', { type: 'image/gif' })

    expect(validateFile(jpegFile).valid).toBe(true)
    expect(validateFile(pngFile).valid).toBe(true)
    expect(validateFile(webpFile).valid).toBe(true)
    expect(validateFile(gifFile).valid).toBe(true)
  })

  it('rejects files exceeding 50MB with descriptive error', () => {
    // Construct a mock file object with size property > 50MB
    const oversizedFile = new File(['tiny'], 'huge.jpg', { type: 'image/jpeg' })
    Object.defineProperty(oversizedFile, 'size', {
      value: MAX_FILE_SIZE_BYTES + 1024 * 1024,
    })

    const result = validateFile(oversizedFile)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/exceeds the 50MB limit/i)
  })

  it('rejects unsupported file formats gracefully', () => {
    const pdfFile = new File(['fake-pdf'], 'document.pdf', { type: 'application/pdf' })
    const exeFile = new File(['fake-exe'], 'program.exe', { type: 'application/octet-stream' })

    expect(validateFile(pdfFile).valid).toBe(false)
    expect(validateFile(pdfFile).error).toMatch(/unsupported format/i)

    expect(validateFile(exeFile).valid).toBe(false)
    expect(validateFile(exeFile).error).toMatch(/unsupported format/i)
  })

  it('validates batches and continues processing valid files even if some fail', () => {
    const goodFile1 = new File(['img'], 'photo1.jpg', { type: 'image/jpeg' })
    const badFile = new File(['doc'], 'notes.txt', { type: 'text/plain' })
    const goodFile2 = new File(['img'], 'photo2.png', { type: 'image/png' })

    const batchResult = validateFiles([goodFile1, badFile, goodFile2])

    expect(batchResult.validFiles).toHaveLength(2)
    expect(batchResult.validFiles[0].name).toBe('photo1.jpg')
    expect(batchResult.validFiles[1].name).toBe('photo2.png')

    expect(batchResult.rejectedFiles).toHaveLength(1)
    expect(batchResult.rejectedFiles[0].file.name).toBe('notes.txt')
  })
})
