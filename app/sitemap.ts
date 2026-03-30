import type { MetadataRoute } from 'next'
import { getAllToolSlugs } from '@/lib/data/tools'
import { getCategories } from '@/lib/data/categories'
import { getAllQuestionIds } from '@/lib/data/questions'
import { getAllWorkflowIds } from '@/lib/data/workflows'
import { BEST_PAGES } from '@/lib/data/best-pages'

const BASE_URL = 'https://rightaichoice.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tools, categories, questions, workflows] = await Promise.all([
    getAllToolSlugs(),
    getCategories(),
    getAllQuestionIds(),
    getAllWorkflowIds(),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/tools`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/questions`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/workflows`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/recommend`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/ai-chat`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ]

  const toolRoutes: MetadataRoute.Sitemap = tools.map(({ slug, updated_at }) => ({
    url: `${BASE_URL}/tools/${slug}`,
    lastModified: updated_at ? new Date(updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
  }))

  const categoryRoutes: MetadataRoute.Sitemap = categories.map(
    (cat: { slug: string; updated_at?: string }) => ({
      url: `${BASE_URL}/categories/${cat.slug}`,
      lastModified: cat.updated_at ? new Date(cat.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.75,
    })
  )

  const questionRoutes: MetadataRoute.Sitemap = questions.map(({ id, updated_at }) => ({
    url: `${BASE_URL}/questions/${id}`,
    lastModified: updated_at ? new Date(updated_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.65,
  }))

  const workflowRoutes: MetadataRoute.Sitemap = workflows.map(({ id, updated_at }) => ({
    url: `${BASE_URL}/workflows/${id}`,
    lastModified: updated_at ? new Date(updated_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  const bestPageRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/best`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    ...BEST_PAGES.map((p) => ({
      url: `${BASE_URL}/best/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
  ]

  return [
    ...staticRoutes,
    ...bestPageRoutes,
    ...toolRoutes,
    ...categoryRoutes,
    ...questionRoutes,
    ...workflowRoutes,
  ]
}
