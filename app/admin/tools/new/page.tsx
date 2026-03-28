import { createClient } from '@/lib/supabase/server'
import { ToolForm } from '../tool-form'

export const metadata = { title: 'Add Tool' }

export default async function NewToolPage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: tags }] = await Promise.all([
    supabase.from('categories').select('id, name').order('sort_order'),
    supabase.from('tags').select('id, name').order('name'),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Add New Tool</h1>
      <ToolForm categories={categories ?? []} tags={tags ?? []} />
    </div>
  )
}
