'use client'

import Image from 'next/image'
import { useState } from 'react'

// Phase 10 #72 — next/image throws/blanks on a host not in remotePatterns (or a
// dead URL). This client wrapper catches that and falls back to the letter
// avatar instead of rendering a broken image.
export function ToolLogoImage({
  src,
  alt,
  size,
  unoptimized,
  fallbackClass,
  fallbackChar,
}: {
  src: string
  alt: string
  size: number
  unoptimized: boolean
  fallbackClass: string
  fallbackChar: string
}) {
  const [errored, setErrored] = useState(false)

  if (errored) {
    return (
      <span className={fallbackClass} style={{ fontSize: size * 0.4 }}>
        {fallbackChar}
      </span>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="h-full w-full object-contain p-1"
      unoptimized={unoptimized}
      onError={() => setErrored(true)}
    />
  )
}
