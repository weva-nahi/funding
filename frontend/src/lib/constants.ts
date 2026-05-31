export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export const SOURCES = [
  { value: 'GEF', label: 'Global Environment Facility' },
  { value: 'GCF', label: 'Green Climate Fund' },
  { value: 'OECD', label: 'OECD' },
  { value: 'CLIMATE_FUND', label: 'Climate Fund' },
  { value: 'WORLD_BANK', label: 'World Bank' },
  { value: 'AFD', label: 'AFD' },
  { value: 'EU', label: 'European Union' },
] as const

export const FUNDING_TYPES = [
  { value: 'grant', label: 'Grant' },
  { value: 'loan', label: 'Loan' },
  { value: 'concessional', label: 'Concessional' },
  { value: 'blended', label: 'Blended' },
] as const

export const APPLICATION_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  { value: 'in_review', label: 'In Review', color: 'bg-blue-100 text-blue-700' },
  { value: 'approved', label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-gray-100 text-gray-500' },
] as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
