'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'

// Declare OneSignal types for TypeScript
declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>
    OneSignal?: any
  }
}

export function NotificationButton() {
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
          if (isPushSupported) {
            setIsInitialized(true)
            const permission = OneSignal.Notifications.permission
            setIsSubscribed(permission)
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

    setIsLoading(true)
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || []
      window.OneSignalDeferred.push(async function (OneSignal: any) {
        try {
          await OneSignal.Slidedown.promptPush()
          // Check status after prompt
          const permission = OneSignal.Notifications.permission
          setIsSubscribed(permission)
        } catch (error) {
          console.error('Error subscribing to notifications:', error)
        } finally {
          setIsLoading(false)
        }
      })
    } catch (error) {
      console.error('Error subscribing to notifications:', error)
      setIsLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    if (typeof window === 'undefined') return

    setIsLoading(true)
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || []
      window.OneSignalDeferred.push(async function (OneSignal: any) {
        try {
          await OneSignal.User.PushSubscription.optOut()
          setIsSubscribed(false)
        } catch (error) {
          console.error('Error unsubscribing from notifications:', error)
        } finally {
          setIsLoading(false)
        }
      })
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error)
      setIsLoading(false)
    }
  }

  // Don't show button if OneSignal isn't configured
  if (!isInitialized) {
    return null
  }

  const title = isSubscribed ? 'Unsubscribe from notifications' : 'Subscribe to get news updates'

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
        <BellOff className="h-5 w-5 text-muted-foreground" />
      ) : (
        <Bell className="h-5 w-5 text-muted-foreground" />
      )}
    </button>
  )
}
