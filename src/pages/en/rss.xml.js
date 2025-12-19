import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';

export async function GET(context) {
	const posts = await getCollection('blog-en');
	return rss({
		title: 'ppippi-dev Blog (English)',
		description: 'My personal blog for organizing learnings and experiences in MLOps, AI, and Cloud.',
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/en/blog/${post.id}/`,
		})),
	});
}
