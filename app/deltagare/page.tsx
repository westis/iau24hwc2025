'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function DeltagarePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useLanguage()

  const [view, setView] = useState<'individual' | 'teams'>(() => {
    const v = searchParams.get('view')
    return v === 'teams' ? 'teams' : 'individual'
  })

  const [gender, setGender] = useState<'M' | 'W'>(() => {
    const g = searchParams.get('gender')
    return g === 'W' ? 'W' : 'M'
  })

  // Redirect to the appropriate existing page
  useEffect(() => {
    const targetPath = view === 'individual' ? '/runners' : '/teams'
    const params = new URLSearchParams()
    params.set('gender', gender)

    router.push(`${targetPath}?${params.toString()}`)
  }, [view, gender, router])

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
        <p className="text-muted-foreground">{t.common.loading}</p>
      </div>
    </main>
  )
}

function DeltagarePageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export default function DeltagarePage() {
  return (
    <Suspense fallback={<DeltagarePageFallback />}>
      <DeltagarePageContent />
    </Suspense>
  )
}
