import { getPostDatabase } from '@/notionApi/getPostDatabase'
import { PageObjectResponse, DatePropertyItemObjectResponse } from '@notionhq/client/build/src/api-endpoints'

// 날짜를 YYYY-MM-DD 형식으로 포맷팅하는 헬퍼 함수
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10) // YYYY-MM-DD 형식
}

export async function GET() {
  try {
    const baseUrl = 'https://ppippi-dev.github.io'
    
    // XML 문자열 생성 시작
    const xmlStrings = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9',
      '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">',
      '<url>',
      `  <loc>${baseUrl}</loc>`,
      `  <lastmod>${formatDate(new Date())}</lastmod>`,
      '  <priority>1.00</priority>',
      '</url>'
    ];

    // 블로그 포스트 추가
    const posts = await getPostDatabase()
    
    for (const post of posts.results) {
      const postDate = ((post as PageObjectResponse).properties.post_date as DatePropertyItemObjectResponse).date?.start
      const lastmod = postDate ? formatDate(new Date(postDate)) : formatDate(new Date())

      xmlStrings.push(
        '<url>',
        `  <loc>${baseUrl}/post/${post.id}</loc>`,
        `  <lastmod>${lastmod}</lastmod>`,
        '  <priority>0.80</priority>',
        '</url>'
      );
    }

    xmlStrings.push('</urlset>');

    // 배열을 줄바꿈으로 결합
    const xml = xmlStrings.join('\n');

    // Response 헤더 설정과 함께 XML 반환
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })

  } catch (error) {
    console.error('Sitemap generation failed:', error)
    
    // 에러 발생 시 기본 sitemap 반환
    const fallbackXml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9',
      '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">',
      '<url>',
      `  <loc>${baseUrl}</loc>`,
      `  <lastmod>${formatDate(new Date())}</lastmod>`,
      '  <priority>1.00</priority>',
      '</url>',
      '</urlset>'
    ].join('\n');

    return new Response(fallbackXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }
} 