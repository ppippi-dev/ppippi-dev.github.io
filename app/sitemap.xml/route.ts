import { getPostDatabase } from '@/notionApi/getPostDatabase'
import { PageObjectResponse, DatePropertyItemObjectResponse } from '@notionhq/client/build/src/api-endpoints'

// 날짜를 YYYY-MM-DD 형식으로 포맷팅하는 헬퍼 함수
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export async function GET() {
  try {
    const baseUrl = 'https://ppippi-dev.github.io'
    
    // XML 헤더와 시작 태그
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    // 메인 페이지 추가
    xml += '<url>\n'
    xml += `  <loc>${baseUrl}</loc>\n`
    xml += `  <lastmod>${formatDate(new Date(new Date().getTime() - (9 * 60 * 60 * 1000)))}</lastmod>\n`
    xml += '</url>\n'

    // 블로그 포스트 추가
    const posts = await getPostDatabase()
    
    for (const post of posts.results) {
      const postDate = ((post as PageObjectResponse).properties.post_date as DatePropertyItemObjectResponse).date?.start
      const lastmod = postDate 
        ? formatDate(new Date(new Date(postDate).getTime() - (9 * 60 * 60 * 1000)))
        : formatDate(new Date(new Date().getTime() - (9 * 60 * 60 * 1000)))

      xml += '<url>\n'
      xml += `  <loc>${baseUrl}/post/${post.id}</loc>\n`
      xml += `  <lastmod>${lastmod}</lastmod>\n`
      xml += '</url>\n'
    }

    // XML 종료 태그
    xml += '</urlset>'

    // Response 헤더 설정과 함께 XML 반환
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    })

  } catch (error) {
    console.error('Sitemap generation failed:', error)
    
    // 에러 발생 시 기본 sitemap 반환
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
  <loc>https://ppippi-dev.github.io</loc>
  <lastmod>${formatDate(new Date(new Date().getTime() - (9 * 60 * 60 * 1000)))}</lastmod>
</url>
</urlset>`

    return new Response(fallbackXml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }
} 