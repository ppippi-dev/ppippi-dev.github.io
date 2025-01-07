import createMDX from '@next/mdx'
import { createVanillaExtractPlugin } from '@vanilla-extract/next-plugin'
const withVanillExtract = createVanillaExtractPlugin()

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true,
    domains: [
      'pagead2.googlesyndication.com',
      'googleads.g.doubleclick.net',
    ],
  },
}

const withMDX = createMDX({})

export default withVanillExtract(withMDX(nextConfig))
