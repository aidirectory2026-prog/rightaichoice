'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play, ExternalLink, ChevronDown } from 'lucide-react'

type Tutorial = {
  title: string
  youtube_url: string
  channel: string
  video_id: string
}

export function TutorialVideos({ tutorials }: { tutorials: Tutorial[] }) {
  const [showAll, setShowAll] = useState(false)

  if (!tutorials || tutorials.length === 0) return null

  const visible = showAll ? tutorials : tutorials.slice(0, 3)

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Play className="h-5 w-5 text-red-500" />
        Tutorials & Learning
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((video) => (
          <a
            key={video.video_id}
            href={video.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-lg border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="relative aspect-video bg-muted">
              <Image
                src={`https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`}
                alt={video.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="rounded-full bg-red-600 p-3">
                  <Play className="h-6 w-6 text-white fill-white" />
                </div>
              </div>
            </div>
            <div className="p-3">
              <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                {video.title}
              </p>
              {video.channel && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  {video.channel}
                  <ExternalLink className="h-3 w-3" />
                </p>
              )}
            </div>
          </a>
        ))}
      </div>

      {tutorials.length > 3 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 text-sm text-primary hover:underline flex items-center gap-1"
        >
          Show all {tutorials.length} tutorials
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </section>
  )
}
