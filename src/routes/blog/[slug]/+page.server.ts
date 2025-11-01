import type { PageServerLoad, EntryGenerator } from './$types';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';
import { error } from '@sveltejs/kit';
import { marked } from 'marked';

export const prerender = true;

export const entries: EntryGenerator = async () => {
	const blogDir = join(process.cwd(), 'src/md/blog');

	try {
		const files = await readdir(blogDir);
		const mdFiles = files.filter(file => file.endsWith('.md'));

		const slugs = await Promise.all(
			mdFiles.map(async (file) => {
				const filePath = join(blogDir, file);
				const content = await readFile(filePath, 'utf-8');
				const { data } = matter(content);

				// Only include published posts
				if (data.published === false) {
					return null;
				}

				return {
					slug: data.slug || file.replace('.md', '')
				};
			})
		);

		return slugs.filter((s): s is { slug: string } => s !== null);
	} catch (error) {
		console.error('Error generating blog entries:', error);
		return [];
	}
};

export const load: PageServerLoad = async ({ params }) => {
	const blogDir = join(process.cwd(), 'src/md/blog');

	try {
		const files = await readdir(blogDir);
		const mdFiles = files.filter(file => file.endsWith('.md'));

		// Find the file that matches the slug
		for (const file of mdFiles) {
			const filePath = join(blogDir, file);
			const content = await readFile(filePath, 'utf-8');
			const { data, content: markdown } = matter(content);

			const fileSlug = data.slug || file.replace('.md', '');

			if (fileSlug === params.slug) {
				// Check if post is published
				if (data.published === false) {
					throw error(404, { message: 'Post not found' });
				}

				// Convert markdown to HTML
				const html = await marked(markdown);

				return {
					post: {
						slug: fileSlug,
						title: data.title,
						description: data.description,
						date: data.date,
						cover: data.cover,
						category: data.category,
						tags: data.tags || [],
						author: data.author,
						html
					}
				};
			}
		}

		throw error(404, { message: 'Post not found' });
	} catch (err) {
		console.error('Error loading blog post:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, { message: 'Failed to load blog post' });
	}
};
