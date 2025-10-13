'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { RunnersView } from '@/components/participants/RunnersView'
import { TeamsView } from '@/components/participants/TeamsView'

function DeltagarePageContent() {
  const searchParams = useSearchParams()
  const { t } = useLanguage()

  const [activeTab, setActiveTab] = useState<'individual' | 'teams'>(() => {
    const v = searchParams.get('view')
    return v === 'teams' ? 'teams' : 'individual'
  })

  const [gender, setGender] = useState<'M' | 'W'>(() => {
    const g = searchParams.get('gender')
    return g === 'W' ? 'W' : 'M'
  })

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{t.participants.title}</h1>
          <p className="text-muted-foreground">IAU 24h WC 2025</p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'individual' | 'teams')} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="individual">{t.participants.individual}</TabsTrigger>
            <TabsTrigger value="teams">{t.participants.teams}</TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="mt-0">
            <RunnersView initialGender={gender} showHeader={false} />
          </TabsContent>

          <TabsContent value="teams" className="mt-0">
            <TeamsView initialGender={gender} showHeader={false} />
          </TabsContent>
        </Tabs>
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
