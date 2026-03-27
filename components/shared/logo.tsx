import Link from 'next/link'

export function Logo({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const textClass = size === 'lg' ? 'text-2xl' : 'text-sm'

  return (
    <Link href="/" className={`inline-block font-semibold text-white tracking-tight ${textClass}`}>
      Right<span className="text-emerald-400">AI</span>Choice
    </Link>
  )
}
