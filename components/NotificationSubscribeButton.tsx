'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, BellOff } from 'lucide-react'

// Declare OneSignal types for TypeScript
declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>
    OneSignal?: any
  }
}

export function NotificationSubscribeButton() {
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
    setTimeout(checkSubscription, 1500)
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

  return (
    <Button
      onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
      disabled={isLoading}
      variant={isSubscribed ? 'outline' : 'default'}
      size="sm"
      className="gap-2"
    >
      {isSubscribed ? (
        <>
          <BellOff className="h-4 w-4" />
          Unsubscribe
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          Subscribe to Updates
        </>
      )}
    </Button>
  )
}
