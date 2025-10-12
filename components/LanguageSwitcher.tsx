'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'
import { Languages } from 'lucide-react'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'sv' : 'en')
  }

  return (
    <button
      onClick={toggleLanguage}
      className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
      title={language === 'en' ? 'Switch to Swedish (SV)' : 'Switch to English (EN)'}
      aria-label={language === 'en' ? 'Switch to Swedish' : 'Switch to English'}
    >
      <Languages className="h-5 w-5" />
    </button>
  )
}
