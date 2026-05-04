import Link from 'next/link'

type Props = {
  lastVerifiedAt?: string | null
}

export function AuthorByline({ lastVerifiedAt }: Props) {
  return (
    <p className="mt-2 text-xs text-zinc-500">
      By{' '}
      <Link href="/team" className="text-zinc-300 hover:text-emerald-400 transition-colors">
        Tanmay Verma
      </Link>
      , Founder
      {lastVerifiedAt && (
        <>
          {' · '}Last verified{' '}
          {new Date(lastVerifiedAt).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
          })}
        </>
      )}
    </p>
  )
}
