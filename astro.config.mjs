// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
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
	redirects,
	prefetch: {
		prefetchAll: true,
		defaultStrategy: 'viewport',
	},
});
