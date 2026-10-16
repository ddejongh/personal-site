import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const profile = defineCollection({
	loader: file('src/content/profile.json'),
	schema: z.object({
		name: z.string(),
		headline: z.string(),
		bio: z.string(),
		location: z.string().optional(),
		email: z.email().optional(),
		links: z.array(z.object({ label: z.string(), url: z.url() })),
		skills: z.array(z.object({ group: z.string(), items: z.array(z.string()) })),
	}),
});

const experience = defineCollection({
	loader: glob({ base: 'src/content/experience', pattern: '**/*.md' }),
	schema: z.object({
		company: z.string(),
		role: z.string(),
		location: z.string().optional(),
		start: z.coerce.date(),
		// Omit for a current role.
		end: z.coerce.date().optional(),
	}),
});

const projects = defineCollection({
	loader: glob({ base: 'src/content/projects', pattern: '**/*.md' }),
	schema: z.object({
		title: z.string(),
		summary: z.string(),
		date: z.coerce.date(),
		tags: z.array(z.string()).default([]),
		url: z.url().optional(),
		repo: z.url().optional(),
		draft: z.boolean().default(false),
	}),
});

const pages = defineCollection({
	loader: glob({ base: 'src/content/pages', pattern: '**/*.md' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
	}),
});

export const collections = { profile, experience, projects, pages };
