import type { PageServerLoad } from './$types';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';

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

export const load: PageServerLoad = async () => {
	const blogDir = join(process.cwd(), 'src/md/blog');

	try {
		const mdFiles = await findMarkdownFiles(blogDir);

		const posts = await Promise.all(
			mdFiles.map(async (filePath) => {
				const content = await readFile(filePath, 'utf-8');
				const { data } = matter(content);

				return {
					slug: data.slug || filePath.split('/').pop()?.replace('.md', ''),
					title: data.title,
					description: data.description,
					date: data.date,
					cover: data.cover,
					category: data.category,
					tags: data.tags || [],
					author: data.author,
					published: data.published !== false
				};
			})
		);

		// Filter published posts, sort by date (newest first), and take the latest 3
		const latestPosts = posts
			.filter((post) => post.published)
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
			.slice(0, 3);

		return {
			posts: latestPosts,
			pageMetaTags: {
				title: 'QA Studio - Modern Test Management Platform',
				description:
					'Modern test management platform built by QA engineers. Open source, API-first, and designed for modern testing workflows. Track test cases, runs, and results with ease.'
			}
		};
	} catch (error) {
		console.error('Error loading blog posts:', error);
		return {
			posts: [],
			pageMetaTags: {
				title: 'QA Studio - Modern Test Management Platform',
				description:
					'Modern test management platform built by QA engineers. Open source, API-first, and designed for modern testing workflows. Track test cases, runs, and results with ease.'
			}
		};
	}
};
