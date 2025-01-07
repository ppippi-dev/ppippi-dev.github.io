import { getPostDatabase } from '@/notionApi/getPostDatabase'
import { MetadataRoute } from 'next'
import { PageObjectResponse, DatePropertyItemObjectResponse } from '@notionhq/client/build/src/api-endpoints'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ppippi-dev.github.io'
  
  const posts = await getPostDatabase()
  
  const postsUrls = posts.results.map((post) => ({
    url: `${baseUrl}/post/${post.id}`,
    lastModified: new Date(((post as PageObjectResponse).properties.post_date as DatePropertyItemObjectResponse).date?.start ?? ''),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...postsUrls,
  ]
} 