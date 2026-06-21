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
  { value: 'shortlisted', label: 'Shortlisted', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'approved', label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-gray-100 text-gray-500' },
] as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]

export const AMOUNT_STEP = 1000

export const MAURITANIA_CITIES = [
  'Nouakchott',
  'Nouadhibou',
  'Rosso',
  'Kaédi',
  'Zouérat',
  'Atar',
  'Néma',
  'Sélibaby',
  'Aleg',
  'Akjoujt',
  'Boutilimit',
  'Kiffa',
  'Aioun',
  'Tidjikja',
  'Chinguetti',
  'Tichit',
  'Boghé',
  'Magta-Lahjar',
] as const

// Sector dropdown options — used by the opportunity filter and the
// opportunity create/edit form, replacing the free-text "e.g. energy,
// water" input that didn't constrain values consistently. Matches the
// sector vocabulary already used by the scraper's classify_sector()
// heuristic in common/utils (backend), so filtering by sector here
// actually matches what's stored.
export const SECTORS = [
  { value: 'energy', label: 'Energy' },
  { value: 'water', label: 'Water & Sanitation' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'environment', label: 'Environment & Climate' },
  { value: 'health', label: 'Health' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'education', label: 'Education' },
  { value: 'general', label: 'General' },
] as const

// Industry options for the professional registration form (Batch coming
// next reuses this), kept here since it's a shared dropdown-source pattern.
export const INDUSTRIES = [
  'Agriculture & Agribusiness',
  'Renewable Energy',
  'Water & Sanitation',
  'Construction & Infrastructure',
  'Fisheries & Maritime',
  'Mining & Extractives',
  'Technology & Digital Services',
  'Tourism & Hospitality',
  'Healthcare',
  'Education & Training',
  'Transport & Logistics',
  'Finance & Insurance',
  'Manufacturing',
  'Other',
] as const

export const COMPANY_SIZES = [
  { value: 'micro', label: 'Micro (1–10 employees)' },
  { value: 'small', label: 'Small (11–50 employees)' },
  { value: 'medium', label: 'Medium (51–250 employees)' },
  { value: 'large', label: 'Large (250+ employees)' },
] as const