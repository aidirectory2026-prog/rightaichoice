'use client'

import { useState, useRef, useEffect } from 'react'
import { Share2, X, Check, Copy, MessageCircle } from 'lucide-react'
import { analytics } from '@/lib/analytics'

type ShareButtonProps = {
  url: string
  title: string
  text?: string
  size?: 'sm' | 'md'
  variant?: 'icon' | 'button'
  entity?: string
  entityId?: string
}

type Platform = {
  name: string
  icon: React.ReactNode
  getUrl: (url: string, title: string, text: string) => string
  color: string
}

const PLATFORMS: Platform[] = [
  {
    name: 'X / Twitter',
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    getUrl: (url, _, text) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    color: 'hover:text-sky-400',
  },
  {
    name: 'LinkedIn',
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    getUrl: (url, title) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    color: 'hover:text-blue-400',
  },
  {
    name: 'Reddit',
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
      </svg>
    ),
    getUrl: (url, title) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    color: 'hover:text-orange-400',
  },
  {
    name: 'WhatsApp',
    icon: <MessageCircle className="h-3.5 w-3.5" />,
    getUrl: (url, _, text) =>
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`,
    color: 'hover:text-green-400',
  },
  {
    name: 'Facebook',
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    getUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    color: 'hover:text-blue-500',
  },
]

export function ShareButton({ url, title, text = '', size = 'md', variant = 'icon', entity = 'page', entityId = '' }: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const shareText = text || title
  const fullUrl = url.startsWith('http') ? url : `https://rightaichoice.com${url}`

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleCopy() {
    await navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    analytics.shareClicked(entity, entityId || fullUrl, 'copy_link')
    setTimeout(() => setCopied(false), 2000)
  }

  function handlePlatformShare(platform: Platform) {
    const shareUrl = platform.getUrl(fullUrl, title, shareText)
    analytics.shareClicked(entity, entityId || fullUrl, platform.name.toLowerCase().replace(/[^a-z]/g, '_'))
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=500')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      {variant === 'button' ? (
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 min-h-[40px] text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <Share2 className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          Share
        </button>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          title="Share"
          aria-label="Share"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <Share2 className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl shadow-black/40 py-1.5">
          <div className="px-3 py-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Share via</span>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-600 hover:text-zinc-400"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="border-t border-zinc-800 pt-1">
            {PLATFORMS.map((platform) => (
              <button
                key={platform.name}
                onClick={() => handlePlatformShare(platform)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 ${platform.color} hover:bg-zinc-800 transition-colors`}
              >
                {platform.icon}
                {platform.name}
              </button>
            ))}

            <div className="border-t border-zinc-800 mt-1 pt-1">
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
