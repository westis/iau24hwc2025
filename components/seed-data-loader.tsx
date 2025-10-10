'use client'

import { useEffect } from 'react'
import { loadSeedData } from '@/lib/seed/seed-loader'

/**
 * Client component that loads seed data on mount
 * This ensures pre-populated data is available on first visit
 */
export function SeedDataLoader() {
  useEffect(() => {
    // Only run in browser
    if (typeof window !== 'undefined') {
      loadSeedData()
    }
  }, [])

  return null
}
