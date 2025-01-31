import { getPostDatabase } from '@/notionApi/getPostDatabase'
import { MetadataRoute } from 'next'
import { PageObjectResponse, DatePropertyItemObjectResponse } from '@notionhq/client/build/src/api-endpoints'

// 날짜를 YYYY-MM-DD 형식으로 포맷팅하는 헬퍼 함수
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const baseUrl = 'https://ppippi-dev.github.io'
    
    // 정적 페이지 URLs
    const staticPages = [
      {
        url: baseUrl,
        lastModified: formatDate(new Date(new Date().getTime() - (9 * 60 * 60 * 1000)))
      }
    ]

    const posts = await getPostDatabase()
    
    const postsUrls = posts.results.map((post) => {
      const postDate = ((post as PageObjectResponse).properties.post_date as DatePropertyItemObjectResponse).date?.start
      return {
        url: `${baseUrl}/post/${post.id}`,
        lastModified: postDate 
          ? formatDate(new Date(new Date(postDate).getTime() - (9 * 60 * 60 * 1000)))
          : formatDate(new Date(new Date().getTime() - (9 * 60 * 60 * 1000))),
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
      lastModified: formatDate(new Date(new Date().getTime() - (9 * 60 * 60 * 1000)))
    }]
  }
} 