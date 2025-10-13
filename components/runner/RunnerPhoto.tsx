'use client'

import Image from 'next/image'
import { User } from 'lucide-react'

interface RunnerPhotoProps {
  photoUrl?: string | null
  photoFocalX?: number
  photoFocalY?: number
  photoZoom?: number
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-48 h-48',
}

const sizePx = {
  sm: 48,
  md: 96,
  lg: 128,
  xl: 192,
}

export function RunnerPhoto({
  photoUrl,
  photoFocalX = 50,
  photoFocalY = 50,
  photoZoom = 1,
  alt,
  size = 'md',
  className = '',
}: RunnerPhotoProps) {
  // If no photo, show placeholder
  if (!photoUrl) {
    return (
      <div
        className={`${sizeClasses[size]} ${className} rounded-full bg-muted flex items-center justify-center`}
      >
        <User className="w-1/2 h-1/2 text-muted-foreground" />
      </div>
    )
  }

  // Calculate object-position based on focal point
  // Focal point is 0-100%, convert to CSS percentage
  const objectPosition = `${photoFocalX}% ${photoFocalY}%`

  // Calculate scale transform based on zoom
  const scale = photoZoom || 1

  return (
    <div
      className={`${sizeClasses[size]} ${className} rounded-full overflow-hidden relative bg-muted`}
    >
      <Image
        src={photoUrl}
        alt={alt}
        fill
        sizes={`${sizePx[size]}px`}
        className="object-cover"
        style={{
          objectPosition,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
        }}
        quality={90}
      />
    </div>
  )
}
