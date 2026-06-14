export type ApplicationStatus = 'draft' | 'pending' | 'in_review' | 'approved' | 'rejected' | 'withdrawn'
export type OpportunityStatus = 'draft' | 'published' | 'archived'

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Profile {
  first_name: string
  last_name: string
  company: string
  avatar: string | null
  sector: string
}

export interface User {
  id: number
  email: string
  role: 'admin' | 'client'
  is_active: boolean
  is_email_verified: boolean
  last_login?: string | null
  created_at?: string
  profile?: Profile
}

export interface Opportunity {
  id: number
  title: string
  source: string
  description?: string
  country?: string
  amount?: number | null
  currency: string
  deadline?: string | null
  eligibility_criteria?: string
  required_documents?: string
  funding_type?: string
  sector?: string
  completeness_score: number
  status: OpportunityStatus
  url?: string
  is_expired?: boolean
  created_at: string
  updated_at?: string
}

export interface StatusHistoryEntry {
  id: number
  from_status: string
  to_status: string
  changed_by_email: string | null
  comment: string
  created_at: string
}

export interface Application {
  id: number
  status: ApplicationStatus
  opportunity_title: string
  opportunity_source?: string
  opportunity_id?: number
  opportunity_deadline?: string | null
  user_email: string
  motivation_letter?: string
  admin_comment?: string
  rejection_reason?: string
  version: number
  status_history?: StatusHistoryEntry[]
  created_at: string
  updated_at?: string
}

export interface ApplicationDocument {
  id: number
  original_filename: string
  file_type: string
  file_size: number
  validation_status: string
  created_at: string
}

export interface NotificationItem {
  id: number
  message: string
  notification_type: string
  category: string
  priority: string
  is_read: boolean
  is_archived: boolean
  link: string
  created_at: string
}

export interface ConsultingRequest {
  id: number
  user_email: string
  company: string
  description: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected'
  admin_response: string
  responded_at: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: number
  user_email: string | null
  action: string
  model_name: string
  record_id: number | null
  ip_address: string | null
  timestamp: string
}

export interface ScrapingAlert {
  id: number
  opportunity: Opportunity
  priority: 'urgent' | 'high' | 'medium' | 'low'
  status: 'new' | 'published' | 'archived' | 'ignored'
  created_at: string
}

export interface ScrapingJob {
  id: number
  source: string
  pages_scraped: number
  projects_found: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export interface DashboardStats {
  total_applications: number
  pending_applications: number
  approved_this_month: number
  rejected_this_month: number
  active_clients: number
}