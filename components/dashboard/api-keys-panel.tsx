'use client'

import { useState, useTransition } from 'react'
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff } from 'lucide-react'

type ApiKey = {
  id: string
  name: string
  key_prefix: string
  key?: string // only present immediately after creation
  requests_total: number
  last_used_at: string | null
  is_active: boolean
  created_at: string
}

export function ApiKeysPanel({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleCreate() {
    const name = newKeyName.trim()
    if (!name || creating) return
    setCreating(true)
    setError('')
    setCreatedKey(null)

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create key')
        return
      }
      setCreatedKey(data.key)
      setKeys((prev) => [data, ...prev])
      setNewKeyName('')
      setShowForm(false)
    } catch {
      setError('Network error')
    } finally {
      setCreating(false)
    }
  }

  function handleRevoke(id: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    startTransition(async () => {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id))
      }
    })
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const activeKeys = keys.filter((k) => k.is_active)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Key className="h-4 w-4 text-zinc-400" />
          API Keys
        </h3>
        {activeKeys.length < 5 && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New key
          </button>
        )}
      </div>

      {/* New key created — show once */}
      {createdKey && (
        <div className="mb-4 rounded-lg border border-emerald-800 bg-emerald-950/40 p-3">
          <p className="text-xs text-emerald-400 font-medium mb-2">
            Copy your key now — it won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-white bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 truncate">
              {createdKey}
            </code>
            <button
              onClick={() => handleCopy(createdKey)}
              className="shrink-0 p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="mb-4 space-y-2">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. My App)"
            maxLength={50}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-600"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            autoFocus
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newKeyName.trim() || creating}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError('') }}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      {activeKeys.length === 0 ? (
        <p className="text-xs text-zinc-600">No active API keys. Create one to get started.</p>
      ) : (
        <div className="space-y-2">
          {activeKeys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-200 font-medium truncate">{k.name}</p>
                <p className="text-xs text-zinc-600 font-mono mt-0.5">{k.key_prefix}••••••••••••••••••••</p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-zinc-500">{k.requests_total.toLocaleString()} requests</p>
                  <p className="text-xs text-zinc-600">
                    {k.last_used_at
                      ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}`
                      : 'Never used'}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(k.id)}
                  disabled={isPending}
                  className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40"
                  title="Revoke key"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-zinc-600">
        Include your key as a header: <code className="font-mono">Authorization: Bearer rac_your_key</code>
      </p>
    </div>
  )
}
