export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm space-y-6 animate-pulse">
        <div className="flex flex-col items-center gap-3">
          <div className="h-4 w-24 bg-zinc-800 rounded" />
          <div className="h-6 w-40 bg-zinc-800 rounded" />
          <div className="h-4 w-48 bg-zinc-800 rounded" />
        </div>
        <div className="h-10 w-full bg-zinc-800 rounded-lg" />
        <div className="space-y-4">
          <div className="h-10 w-full bg-zinc-800 rounded-lg" />
          <div className="h-10 w-full bg-zinc-800 rounded-lg" />
          <div className="h-10 w-full bg-zinc-900 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
