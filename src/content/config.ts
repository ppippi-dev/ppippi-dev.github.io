import { defineCollection, z } from 'astro:content';

const blogSchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	pubDate: z.coerce.date(),
	updatedDate: z.coerce.date().optional(),
	heroImage: z.string().optional(),
	tags: z.array(z.string()).optional(),
});

const blog = defineCollection({
	type: 'content',
	schema: blogSchema,
});

const blogEn = defineCollection({
	type: 'content',
	schema: blogSchema,
});

export const collections = { blog, 'blog-en': blogEn };
