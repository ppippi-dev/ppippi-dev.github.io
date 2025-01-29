import { Feed } from 'feed'
import { getPostDatabase } from '@/notionApi/getPostDatabase'
import { PageObjectResponse, RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints'

export async function GET() {
  const baseUrl = 'https://ppippi-dev.github.io'
  
  // Feed 기본 정보 설정
  const feed = new Feed({
    title: "ppippi's Dev Blog",
    description: "개발 관련 이야기를 공유하는 블로그입니다",
    id: baseUrl,
    link: baseUrl,
    language: "ko",
    favicon: `${baseUrl}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}, ppippi`,
    author: {
      name: "ppippi",
      link: baseUrl
    }
  })

  try {
    const posts = await getPostDatabase()
    
    // 각 포스트를 RSS 피드에 추가
    posts.results.forEach((post) => {
      const postObj = post as PageObjectResponse
      const title = (postObj.properties.title as any).title[0]?.plain_text || 'Untitled'
      const postDate = (postObj.properties.post_date as any).date?.start
      const description = (postObj.properties.description as any).rich_text[0]?.plain_text || ''
      
      feed.addItem({
        title: title,
        id: post.id,
        link: `${baseUrl}/post/${post.id}`,
        description: description,
        date: postDate ? new Date(postDate) : new Date(),
      })
    })

    // RSS 피드 생성
    return new Response(feed.rss2(), {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate'
      }
    })
    
  } catch (error) {
    console.error('RSS feed generation failed:', error)
    return new Response('Error generating RSS feed', { status: 500 })
  }
} 