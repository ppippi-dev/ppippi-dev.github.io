// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { redirects } from './src/redirects';

// https://astro.build/config
export default defineConfig({
	site: 'https://ppippi.dev',
	integrations: [
		mdx(),
		sitemap({
			filter: (page) =>
				!page.includes('/tags/') &&
				!Object.keys(redirects).some((oldPath) => page.endsWith(oldPath)),
		}),
	],
	markdown: {
		remarkPlugins: [remarkMath],
		rehypePlugins: [rehypeKatex],
	},
	redirects,
});
