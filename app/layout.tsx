import { Metadata } from 'next'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'ppippi-dev Blog',
  description: '숲을 보고싶은 어느 한 개발자 이야기',
  verification: {
    google: 'QtdRN4sJqiyHD62UJrE_IDbeFhcdbVpBCg0a0h0Smkw',
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
      </head>
      <body>{children}</body>
    </html>
  )
}
