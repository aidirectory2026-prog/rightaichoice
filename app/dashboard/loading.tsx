export default function DashboardLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4 animate-pulse">
        <div className="h-8 w-40 bg-zinc-800 rounded mx-auto" />
        <div className="h-4 w-56 bg-zinc-800 rounded mx-auto" />
        <div className="h-4 w-20 bg-zinc-800 rounded mx-auto" />
      </div>
    </main>
  )
}
