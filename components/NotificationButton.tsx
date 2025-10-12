'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// Declare OneSignal types for TypeScript
declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>
    OneSignal?: any
  }
}

export function NotificationButton() {
  const { t } = useLanguage()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Check if OneSignal is initialized and get subscription status
    const checkSubscription = () => {
      if (typeof window === 'undefined') return

      window.OneSignalDeferred = window.OneSignalDeferred || []
      window.OneSignalDeferred.push(async function (OneSignal: any) {
        try {
          const isPushSupported = OneSignal.Notifications.isPushSupported()
          console.log('OneSignal: Push supported:', isPushSupported)

          if (isPushSupported) {
            setIsInitialized(true)
            const permission = OneSignal.Notifications.permission
            console.log('OneSignal: Current permission:', permission)
            setIsSubscribed(permission)

            // Listen for permission changes
            OneSignal.Notifications.addEventListener('permissionChange', (granted: boolean) => {
              console.log('OneSignal: Permission changed to:', granted)
              setIsSubscribed(granted)
            })
          } else {
            console.warn('OneSignal: Push notifications not supported on this browser')
          }
        } catch (error) {
          console.error('Error checking subscription status:', error)
        }
      })
    }

    // Wait a bit for OneSignal SDK to load
    setTimeout(checkSubscription, 2000)
  }, [])

  const handleSubscribe = async () => {
    if (typeof window === 'undefined') return

    console.log('OneSignal: Attempting to subscribe...')
    setIsLoading(true)
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || []
      window.OneSignalDeferred.push(async function (OneSignal: any) {
        try {
          console.log('OneSignal: Showing permission prompt...')
          await OneSignal.Slidedown.promptPush()

          // Check status after prompt
          const permission = OneSignal.Notifications.permission
          console.log('OneSignal: Permission after prompt:', permission)
          setIsSubscribed(permission)

          if (permission) {
            console.log('OneSignal: Successfully subscribed!')
          } else {
            console.warn('OneSignal: User denied permission or closed prompt')
          }
        } catch (error) {
          console.error('OneSignal: Error subscribing to notifications:', error)
          alert('Failed to subscribe to notifications. Please check browser permissions.')
        } finally {
          setIsLoading(false)
        }
      })
    } catch (error) {
      console.error('OneSignal: Error subscribing to notifications:', error)
      alert('Failed to subscribe to notifications. Please try again.')
      setIsLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    if (typeof window === 'undefined') return

    console.log('OneSignal: Attempting to unsubscribe...')
    setIsLoading(true)
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || []
      window.OneSignalDeferred.push(async function (OneSignal: any) {
        try {
          await OneSignal.User.PushSubscription.optOut()
          setIsSubscribed(false)
          console.log('OneSignal: Successfully unsubscribed')
        } catch (error) {
          console.error('OneSignal: Error unsubscribing from notifications:', error)
          alert('Failed to unsubscribe. Please try again.')
        } finally {
          setIsLoading(false)
        }
      })
    } catch (error) {
      console.error('OneSignal: Error unsubscribing from notifications:', error)
      alert('Failed to unsubscribe. Please try again.')
      setIsLoading(false)
    }
  }

  // Don't show button if OneSignal isn't configured
  if (!isInitialized) {
    return null
  }

  const title = isSubscribed ? t.notifications.unsubscribe : t.notifications.subscribe

  return (
    <button
      onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
      disabled={isLoading}
      className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent transition-colors disabled:opacity-50"
      aria-label={title}
      title={title}
    >
      {isLoading ? (
        <BellRing className="h-5 w-5 animate-pulse" />
      ) : isSubscribed ? (
        <BellRing className="h-5 w-5 text-green-600 dark:text-green-400" />
      ) : (
        <BellOff className="h-5 w-5 text-muted-foreground" />
      )}
    </button>
  )
}
