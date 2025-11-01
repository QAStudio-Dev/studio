import type { PageServerLoad } from './$types';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';

export const load: PageServerLoad = async () => {
	const blogDir = join(process.cwd(), 'src/md/blog');

	try {
		const files = await readdir(blogDir);
		const mdFiles = files.filter(file => file.endsWith('.md'));

		const posts = await Promise.all(
			mdFiles.map(async (file) => {
				const filePath = join(blogDir, file);
				const content = await readFile(filePath, 'utf-8');
				const { data } = matter(content);

				return {
					slug: data.slug || file.replace('.md', ''),
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

		// Filter published posts and sort by date (newest first)
		const publishedPosts = posts
			.filter(post => post.published)
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		return {
			posts: publishedPosts
		};
	} catch (error) {
		console.error('Error loading blog posts:', error);
		return {
			posts: []
		};
	}
};
