'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface RaceCountdownProps {
  targetDate: string // ISO 8601 format
  size?: 'small' | 'medium' | 'large'
  showLabels?: boolean
  showTitle?: boolean
}

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  isStarted: boolean
  isFinished: boolean
}

export function RaceCountdown({
  targetDate,
  size = 'medium',
  showLabels = true,
  showTitle = true
}: RaceCountdownProps) {
  const { t } = useLanguage()
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(targetDate)
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate))
    }, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  if (timeRemaining.isFinished) {
    return (
      <div className="text-center">
        <p className="text-2xl font-bold">{t.race.raceFinished}</p>
      </div>
    )
  }

  if (timeRemaining.isStarted) {
    return (
      <div className="text-center">
        <p className="text-2xl font-bold animate-pulse">{t.race.raceInProgress}</p>
      </div>
    )
  }

  return (
    <div className="text-center">
      {showTitle && (
        <p className={`mb-4 ${size === 'large' ? 'text-xl' : size === 'medium' ? 'text-lg' : 'text-base'}`}>
          {t.race.startsIn}
        </p>
      )}

      <div className={`flex justify-center ${size === 'large' ? 'gap-8' : size === 'medium' ? 'gap-6' : 'gap-4'}`}>
        <TimeUnit value={timeRemaining.days} label={t.race.days} size={size} showLabel={showLabels} />
        <TimeUnit value={timeRemaining.hours} label={t.race.hours} size={size} showLabel={showLabels} />
        <TimeUnit value={timeRemaining.minutes} label={t.race.minutes} size={size} showLabel={showLabels} />
        <TimeUnit value={timeRemaining.seconds} label={t.race.seconds} size={size} showLabel={showLabels} />
      </div>
    </div>
  )
}

function TimeUnit({
  value,
  label,
  size,
  showLabel
}: {
  value: number
  label: string
  size: 'small' | 'medium' | 'large'
  showLabel: boolean
}) {
  const sizeClasses = {
    small: { number: 'text-2xl', label: 'text-xs' },
    medium: { number: 'text-4xl', label: 'text-sm' },
    large: { number: 'text-5xl md:text-7xl', label: 'text-base md:text-xl' }
  }

  return (
    <div className="flex flex-col items-center">
      <div className={`font-bold tabular-nums ${sizeClasses[size].number}`}>
        {String(value).padStart(2, '0')}
      </div>
      {showLabel && (
        <div className={`text-muted-foreground ${sizeClasses[size].label}`}>
          {label}
        </div>
      )}
    </div>
  )
}

function calculateTimeRemaining(targetDate: string): TimeRemaining {
  const target = new Date(targetDate).getTime()
  const now = Date.now()
  const diff = target - now

  // Race finished (24 hours after start)
  const raceEndTime = target + (24 * 60 * 60 * 1000)
  if (now > raceEndTime) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isStarted: false,
      isFinished: true
    }
  }

  // Race in progress
  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isStarted: true,
      isFinished: false
    }
  }

  // Race not started yet
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return {
    days,
    hours,
    minutes,
    seconds,
    isStarted: false,
    isFinished: false
  }
}
