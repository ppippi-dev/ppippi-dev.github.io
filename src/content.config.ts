import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blogSchema = z.object({
	title: z.string(),
	description: z.string(),
	pubDate: z.coerce.date(),
	updatedDate: z.coerce.date().optional(),
	heroImage: z.string().optional(),
	tags: z.array(z.string()).optional(),
});

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: blogSchema,
});

const blogEn = defineCollection({
	loader: glob({ base: './src/content/blog-en', pattern: '**/*.{md,mdx}' }),
	schema: blogSchema,
});

export const collections = { blog, 'blog-en': blogEn };
