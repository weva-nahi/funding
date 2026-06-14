import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@/lib/constants'

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum of 10MB.` }
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: `File type "${file.type}" is not allowed. Accepted: PDF, JPEG, PNG, Word documents.` }
  }
  return { valid: true }
}