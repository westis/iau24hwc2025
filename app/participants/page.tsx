'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Edit3 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useAuth } from '@/lib/auth/auth-context'
import { RunnersView } from '@/components/participants/RunnersView'
import { TeamsView } from '@/components/participants/TeamsView'

function ParticipantsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const { isAdmin } = useAuth()

  const [activeTab, setActiveTab] = useState<'individual' | 'teams'>(() => {
    const v = searchParams.get('view')
    return v === 'teams' ? 'teams' : 'individual'
  })

  const [gender, setGender] = useState<'M' | 'W'>(() => {
    const g = searchParams.get('gender')
    return g === 'W' ? 'W' : 'M'
  })

  // Update URL when parameters change
  const updateURL = (params: {
    view?: 'individual' | 'teams'
    gender?: 'M' | 'W'
  }) => {
    const newParams = new URLSearchParams()
    newParams.set('view', params.view || activeTab)
    newParams.set('gender', params.gender || gender)
    router.push(`/participants?${newParams.toString()}`, { scroll: false })
  }

  const handleTabChange = (value: string) => {
    const newTab = value as 'individual' | 'teams'
    setActiveTab(newTab)
    updateURL({ view: newTab })
  }

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t.participants.title}</h1>
            <p className="text-muted-foreground">IAU 24h WC 2025</p>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => router.push('/admin/runners/quick-edit')}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Quick Edit
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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

function ParticipantsPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export default function ParticipantsPage() {
  return (
    <Suspense fallback={<ParticipantsPageFallback />}>
      <ParticipantsPageContent />
    </Suspense>
  )
}
