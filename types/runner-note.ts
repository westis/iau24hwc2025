// types/runner-note.ts
import type { NewsItem } from './news'

export interface RunnerNote {
  id: number
  runnerId: number
  noteText: string | null
  newsId: number | null
  newsItem?: NewsItem  // Populated when fetching with linked news
  createdAt: string
  updatedAt: string
}

export interface RunnerNoteCreate {
  runnerId: number
  noteText?: string
  newsId?: number
}

export interface RunnerNoteUpdate {
  noteText?: string
  newsId?: number
}
