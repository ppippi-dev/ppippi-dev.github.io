import { getPostDatabase } from '@/notionApi/getPostDatabase'
import { MetadataRoute } from 'next'
import { PageObjectResponse, DatePropertyItemObjectResponse } from '@notionhq/client/build/src/api-endpoints'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ppippi-dev.github.io'
  
  const posts = await getPostDatabase()
  
  const postsUrls = posts.results.map((post) => {
    const postDate = ((post as PageObjectResponse).properties.post_date as DatePropertyItemObjectResponse).date?.start
    return {
      url: `${baseUrl}/post/${post.id}`,
      lastModified: postDate ? new Date(postDate) : new Date(),
      priority: 0.8
    }
  })

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      priority: 1.0
    },
    ...postsUrls,
  ]
} 