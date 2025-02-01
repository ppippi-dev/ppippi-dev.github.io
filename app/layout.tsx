import { Metadata } from 'next'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'ppippi-dev Blog',
  description: '숲을 보고싶은 어느 한 개발자 이야기',
  verification: {
    google: 'QtdRN4sJqiyHD62UJrE_IDbeFhcdbVpBCg0a0h0Smkw',
  },
  icons: {
    icon: '/favicon.ico',
    // 또는 PNG/SVG 사용시:
    // icon: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
          data-ad-client="ca-pub-4845852016760480"
        />
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-KQYDN19HGC"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-KQYDN19HGC');
          `}
        </Script>
        <link 
          rel="alternate" 
          type="application/rss+xml" 
          title="ppippi's Dev Blog RSS Feed" 
          href="/feed.xml" 
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
