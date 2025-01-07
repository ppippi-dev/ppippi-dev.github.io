import { getPostDatabase } from '@/notionApi/getPostDatabase'
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ppippi-dev.github.io'
  
  // 노션 포스트 데이터 가져오기
  const posts = await getPostDatabase()
  
  // 포스트 URL 생성
  const postsUrls = posts.results.map((post) => ({
    url: `${baseUrl}/post/${post.id}`,
    lastModified: new Date(post.last_edited_time),
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