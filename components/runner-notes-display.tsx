'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'
import { Info } from 'lucide-react'
import Link from 'next/link'
import type { RunnerNote } from '@/types/runner-note'

interface RunnerNotesDisplayProps {
  notes: RunnerNote[]
  compact?: boolean
}

export function RunnerNotesDisplay({ notes, compact = false }: RunnerNotesDisplayProps) {
  const { t } = useLanguage()

  if (!notes || notes.length === 0) {
    return null
  }

  if (compact) {
    // Compact view for list pages - just show an info icon with count
    return (
      <div className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
        <Info className="h-3 w-3" />
        <span>{notes.length}</span>
      </div>
    )
  }

  // Full view for detail pages
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Info className="h-4 w-4" />
        {t.runners.notes}
      </h3>
      {notes.map((note) => (
        <div key={note.id} className="text-sm bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
          {note.noteText && (
            <p className="text-foreground">{note.noteText}</p>
          )}
          {note.newsItem && (
            <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
              <Link
                href={`/news/${note.newsItem.id}`}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span className="text-xs font-medium">{t.runners.linkedNews}:</span>
                <span className="text-xs">{note.newsItem.title}</span>
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
