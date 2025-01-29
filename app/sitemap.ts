import { getPostDatabase } from '@/notionApi/getPostDatabase'
import { MetadataRoute } from 'next'
import { PageObjectResponse, DatePropertyItemObjectResponse } from '@notionhq/client/build/src/api-endpoints'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const baseUrl = 'https://ppippi-dev.github.io'
    
    // 정적 페이지 URLs
    const staticPages = [
      {
        url: baseUrl,
        lastModified: new Date(new Date().getTime() - (9 * 60 * 60 * 1000)).toISOString()
      },
      {
        url: `${baseUrl}/about`,
        lastModified: new Date(new Date().getTime() - (9 * 60 * 60 * 1000)).toISOString()
      }
    ]

    const posts = await getPostDatabase()
    
    const postsUrls = posts.results.map((post) => {
      const postDate = ((post as PageObjectResponse).properties.post_date as DatePropertyItemObjectResponse).date?.start
      return {
        url: `${baseUrl}/post/${post.id}`,
        lastModified: postDate 
          ? new Date(new Date(postDate).getTime() - (9 * 60 * 60 * 1000)).toISOString() 
          : new Date(new Date().getTime() - (9 * 60 * 60 * 1000)).toISOString(),
        changefreq: 'monthly'
      }
    })

    return [
      ...staticPages,
      ...postsUrls,
    ]
  } catch (error) {
    console.error('Sitemap generation failed:', error)
    // 기본 sitemap 반환
    return [{
      url: 'https://ppippi-dev.github.io',
      lastModified: new Date(new Date().getTime() - (9 * 60 * 60 * 1000)).toISOString()
    }]
  }
} 