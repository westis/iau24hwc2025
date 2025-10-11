'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'
import { Button } from '@/components/ui/button'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center gap-1 rounded-md border border-input bg-background p-1">
      <Button
        variant={language === 'en' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setLanguage('en')}
        className="h-7 px-2 text-xs"
      >
        EN
      </Button>
      <Button
        variant={language === 'sv' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setLanguage('sv')}
        className="h-7 px-2 text-xs"
      >
        SV
      </Button>
    </div>
  )
}
