export interface NewsItem {
  id: number
  title: string
  content: string
  published: boolean
  created_at: string
  updated_at: string
}

export interface NewsItemCreate {
  title: string
  content: string
  published?: boolean
}

export interface NewsItemUpdate {
  title?: string
  content?: string
  published?: boolean
}
