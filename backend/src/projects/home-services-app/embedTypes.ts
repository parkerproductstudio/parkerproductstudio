export type EmbedCompany = {
  id: string
  slug: string
  name: string
  allowed_origins: string[]
}

export type SessionRow = {
  id: string
  company_id: string
  status: string
  created_at: string
  updated_at: string
}

/** Optional columns from `004_home_services_session_contact.sql`. */
export type SessionContactFields = {
  customer_name?: string | null
  customer_phone?: string | null
  customer_email?: string | null
  customer_address?: string | null
  contact_collected_at?: string | null
  job_summary?: string | null
  supplies?: unknown
}

export type MessageRow = {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  image_paths: string[]
  created_at: string
}
