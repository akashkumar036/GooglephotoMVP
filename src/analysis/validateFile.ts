/**
 * File validation module for user photo imports
 * Phase 11.2: File Validation
 */

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB limit

export const ACCEPTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
])

export const ACCEPTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface BatchValidationResult {
  validFiles: File[]
  rejectedFiles: { file: File; error: string }[]
}

/**
 * Validates a single image file for size and supported format.
 */
export function validateFile(file: File): ValidationResult {
  // Check file size (50MB maximum)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `File "${file.name}" exceeds the 50MB limit (${sizeMb}MB).`,
    }
  }

  // Check MIME type or filename extension
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const isMimeAccepted = file.type ? ACCEPTED_MIME_TYPES.has(file.type.toLowerCase()) : false
  const isExtAccepted = ACCEPTED_EXTENSIONS.has(ext)

  if (!isMimeAccepted && !isExtAccepted) {
    return {
      valid: false,
      error: `${file.name} — format not supported (unsupported format: ${file.type || ext || 'unknown'}). Please choose JPEG, PNG, WebP, or GIF.`,
    }
  }

  return { valid: true }
}

/**
 * Validates an array or FileList of files, separating valid files from rejected files.
 * Continues processing valid files even if some fail (Phase 11.2).
 */
export function validateFiles(files: FileList | File[]): BatchValidationResult {
  const fileArray = Array.from(files)
  const validFiles: File[] = []
  const rejectedFiles: { file: File; error: string }[] = []

  for (const file of fileArray) {
    const result = validateFile(file)
    if (result.valid) {
      validFiles.push(file)
    } else {
      rejectedFiles.push({ file, error: result.error || 'Invalid file' })
    }
  }

  return { validFiles, rejectedFiles }
}
