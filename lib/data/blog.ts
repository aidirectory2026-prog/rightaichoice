import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')

export type BlogPostMeta = {
  slug: string
  title: string
  description: string
  publishedAt: string
  author: string
  categories: string[]
  tools: string[]
  image?: string
}

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return []

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'))

  const posts = files.map((file) => {
    const slug = file.replace(/\.mdx$/, '')
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8')
    const { data } = matter(raw)

    return {
      slug,
      title: data.title ?? slug,
      description: data.description ?? '',
      publishedAt: data.publishedAt ?? '',
      author: data.author ?? 'RightAIChoice',
      categories: data.categories ?? [],
      tools: data.tools ?? [],
      image: data.image,
    } satisfies BlogPostMeta
  })

  // Sort by publishedAt descending
  return posts.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
}

export function getPostBySlug(slug: string): { meta: BlogPostMeta; content: string } | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)

  return {
    meta: {
      slug,
      title: data.title ?? slug,
      description: data.description ?? '',
      publishedAt: data.publishedAt ?? '',
      author: data.author ?? 'RightAIChoice',
      categories: data.categories ?? [],
      tools: data.tools ?? [],
      image: data.image,
    },
    content,
  }
}
