import RSS from 'rss'
import { getPostDatabase } from '@/notionApi/getPostDatabase'
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'

export async function GET() {
  const baseUrl = 'https://ppippi-dev.github.io'
  
  // RSS 피드 기본 설정
  const feed = new RSS({
    title: "ppippi's Dev Blog",
    description: "개발 관련 이야기를 공유하는 블로그입니다",
    feed_url: `${baseUrl}/rss.xml`,
    site_url: baseUrl,
    language: "ko",
    pubDate: new Date(),
    copyright: `All rights reserved ${new Date().getFullYear()}, ppippi`,
  })

  try {
    const posts = await getPostDatabase()
    
    // 각 포스트를 RSS 피드에 추가
    posts.results.forEach((post) => {
      const postObj = post as PageObjectResponse
      const title = (postObj.properties.title as any).title[0]?.plain_text || 'Untitled'
      const postDate = (postObj.properties.post_date as any).date?.start
      const description = (postObj.properties.description as any).rich_text[0]?.plain_text || ''
      
      feed.item({
        title: title,
        description: description,
        url: `${baseUrl}/post/${post.id}`,
        guid: post.id,
        date: postDate ? new Date(postDate) : new Date(),
        author: 'ppippi'
      })
    })

    // RSS 피드 XML 생성
    const rssXml = feed.xml({ indent: true })

    return new Response(rssXml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
    
  } catch (error) {
    console.error('RSS 피드 생성 실패:', error)
    return new Response('RSS 피드 생성 중 오류 발생', { status: 500 })
  }
} 