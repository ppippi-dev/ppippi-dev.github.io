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
        lastModified: new Date(),
        priority: 1.0
      },
      {
        url: `${baseUrl}/about`,  // about 페이지가 있다면
        lastModified: new Date(),
        priority: 0.9
      }
    ]

    const posts = await getPostDatabase()
    
    const postsUrls = posts.results.map((post) => {
      const postDate = ((post as PageObjectResponse).properties.post_date as DatePropertyItemObjectResponse).date?.start
      return {
        url: `${baseUrl}/post/${post.id}`,
        lastModified: postDate ? new Date(postDate) : new Date(),
        priority: 0.8,
        changefreq: 'monthly'  // 블로그 포스트는 자주 수정되지 않으므로
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
      lastModified: new Date(),
      priority: 1.0
    }]
  }
} 