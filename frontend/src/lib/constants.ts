export const SOURCES = [
  { value: 'GEF', label: 'Global Environment Facility' },
  { value: 'GCF', label: 'Green Climate Fund' },
  { value: 'OECD', label: 'OECD' },
  { value: 'WORLD_BANK', label: 'World Bank' },
] as const

export const FUNDING_TYPES = [
  { value: 'grant', label: 'Grant' },
  { value: 'concessional', label: 'Concessional' },
  { value: 'blended', label: 'Blended' },
] as const

export const APPLICATION_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  { value: 'shortlisted', label: 'Shortlisted', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'approved', label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
] as const

export const MAX_FILE_SIZE = 5 * 1024 * 1024
export const MAX_TOTAL_FILE_SIZE = 20 * 1024 * 1024
export const ALLOWED_FILE_TYPES = ['application/pdf']

export const AMOUNT_STEP = 1000

export const MAURITANIA_WILAYAS = [
  'Hodh Ech Chargui',
  'Hodh El Gharbi',
  'Assaba',
  'Gorgol',
  'Brakna',
  'Trarza',
  'Adrar',
  'Dakhlet Nouadhibou',
  'Tagant',
  'Guidimaka',
  'Tiris Zemmour',
  'Inchiri',
  'Nouakchott Ouest',
  'Nouakchott Nord',
  'Nouakchott Sud',
] as const

export const SECTORS = [
  { value: 'energy', label: 'Energy & Renewables' },
  { value: 'water', label: 'Water & Sanitation' },
  { value: 'agriculture', label: 'Agriculture & Food' },
  { value: 'environment', label: 'Environment & Climate' },
  { value: 'health', label: 'Health' },
  { value: 'infrastructure', label: 'Infrastructure & Transport' },
  { value: 'education', label: 'Education & Training' },
  { value: 'technology', label: 'Technology & Innovation' },
  { value: 'fisheries', label: 'Fisheries & Maritime' },
  { value: 'general', label: 'General' },
] as const

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
  { value: 'micro', label: 'Micro (1-10 employees)' },
  { value: 'small', label: 'Small (11-50 employees)' },
  { value: 'medium', label: 'Medium (51-250 employees)' },
  { value: 'large', label: 'Large (250+ employees)' },
] as const