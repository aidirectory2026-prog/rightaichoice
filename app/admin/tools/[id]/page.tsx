import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ToolForm } from '../tool-form'

export const metadata = { title: 'Edit Tool' }

export default async function EditToolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: tool }, { data: categories }, { data: tags }] = await Promise.all([
    supabase
      .from('tools')
      .select('*, tool_categories(category_id), tool_tags(tag_id)')
      .eq('id', id)
      .single(),
    supabase.from('categories').select('id, name').order('sort_order'),
    supabase.from('tags').select('id, name').order('name'),
  ])

  if (!tool) notFound()

  const toolData = {
    ...tool,
    categoryIds: (tool.tool_categories as { category_id: string }[])?.map((tc) => tc.category_id) ?? [],
    tagIds: (tool.tool_tags as { tag_id: string }[])?.map((tt) => tt.tag_id) ?? [],
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Edit: {tool.name}</h1>
      <p className="text-sm text-zinc-500 mb-8">/{tool.slug}</p>
      <ToolForm tool={toolData} categories={categories ?? []} tags={tags ?? []} />
    </div>
  )
}
