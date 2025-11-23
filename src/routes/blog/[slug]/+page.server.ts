import type { PageServerLoad, EntryGenerator } from './$types';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';
import { error } from '@sveltejs/kit';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import { codeToHtml } from 'shiki';

export const prerender = true;

// Recursively find all .md files in a directory
async function findMarkdownFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				return findMarkdownFiles(fullPath);
			} else if (entry.name.endsWith('.md')) {
				return [fullPath];
			}
			return [];
		})
	);
	return files.flat();
}

// Configure marked with Shiki syntax highlighting
marked.use(
	markedHighlight({
		async: true,
		async highlight(code, lang) {
			try {
				return await codeToHtml(code, {
					lang: lang || 'text',
					themes: {
						light: 'github-light',
						dark: 'github-dark'
					}
				});
			} catch (e) {
				// Fallback to plain code if language is not supported
				return code;
			}
		}
	})
);

export const entries: EntryGenerator = async () => {
	const blogDir = join(process.cwd(), 'src/md/blog');

	try {
		const mdFiles = await findMarkdownFiles(blogDir);

		const slugs = await Promise.all(
			mdFiles.map(async (filePath) => {
				const content = await readFile(filePath, 'utf-8');
				const { data } = matter(content);

				// Only include published posts
				if (data.published === false) {
					return null;
				}

				return {
					slug: data.slug || filePath.split('/').pop()?.replace('.md', '') || ''
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
		const mdFiles = await findMarkdownFiles(blogDir);

		// Find the file that matches the slug
		for (const filePath of mdFiles) {
			const content = await readFile(filePath, 'utf-8');
			const { data, content: markdown } = matter(content);

			const fileSlug = data.slug || filePath.split('/').pop()?.replace('.md', '');

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
