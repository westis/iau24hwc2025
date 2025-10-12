export interface NewsItem {
  id: number
  title: string
  content: string
  published: boolean
  created_at: string
  updated_at: string
  linkedRunnerIds?: number[]  // Runner IDs linked to this news
}

export interface NewsItemCreate {
  title: string
  content: string
  published?: boolean
  runnerIds?: number[]  // Runner IDs to link to this news
}

export interface NewsItemUpdate {
  title?: string
  content?: string
  published?: boolean
  runnerIds?: number[]  // Runner IDs to link to this news
}
