import Image from 'next/image'
import { resolveToolLogoUrl } from '@/lib/tool-logo'

type ToolLogoInput = {
  name: string
  logo_url?: string | null
  website_url?: string | null
}

type ToolLogoProps = {
  tool: ToolLogoInput
  size: number
  /** Override Tailwind classes for the outer container (e.g. rounded, bg). */
  className?: string
  /** Override Tailwind classes for the letter-avatar fallback text. */
  fallbackClassName?: string
}

export function ToolLogo({ tool, size, className, fallbackClassName }: ToolLogoProps) {
  const src = resolveToolLogoUrl(tool)
  const containerClass =
    className ?? 'flex items-center justify-center rounded-lg bg-zinc-800 overflow-hidden'
  const fallbackClass = fallbackClassName ?? 'font-bold text-zinc-500'

  return (
    <div className={containerClass} style={{ width: size, height: size }}>
      {src ? (
        <Image
          src={src}
          alt={tool.name}
          width={size}
          height={size}
          className="h-full w-full object-contain p-1"
          unoptimized={src.includes('google.com/s2/favicons')}
        />
      ) : (
        <span className={fallbackClass} style={{ fontSize: size * 0.4 }}>
          {tool.name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}
