'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2 } from 'lucide-react'

export function LogoUpload({
  currentUrl,
  toolSlug,
  onUploaded,
}: {
  currentUrl?: string | null
  toolSlug?: string
  onUploaded: (url: string) => void
}) {
  const [preview, setPreview] = useState(currentUrl ?? '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!toolSlug) {
      setError('Save the tool first to upload a logo')
      return
    }

    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('slug', toolSlug)

    try {
      const res = await fetch('/api/tools/logo', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Upload failed')
        return
      }
      // Append cache-buster to force refresh
      const url = `${data.url}?t=${Date.now()}`
      setPreview(url)
      onUploaded(url)
    } catch {
      setError('Network error')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleClear() {
    setPreview('')
    onUploaded('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">Logo</label>

      {preview ? (
        <div className="relative inline-block">
          <div className="h-20 w-20 rounded-xl border border-zinc-700 bg-zinc-800 overflow-hidden">
            <Image
              src={preview}
              alt="Tool logo"
              width={80}
              height={80}
              className="h-full w-full object-cover"
              unoptimized
            />
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="absolute -top-2 -right-2 rounded-full bg-zinc-800 border border-zinc-600 p-0.5 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="flex h-20 w-full max-w-[200px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span className="text-xs">Upload logo</span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleChange}
        className="hidden"
      />

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      <p className="mt-1 text-[11px] text-zinc-600">PNG, JPEG, WebP, or SVG. Max 2 MB.</p>
    </div>
  )
}
