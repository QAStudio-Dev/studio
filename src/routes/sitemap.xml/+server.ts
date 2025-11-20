import type { RequestHandler } from './$types';
import { readdir, readFile, access } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';
import { constants } from 'fs';

// Prerender this at build time so blog files are available
export const prerender = true;

const site = 'https://qastudio.dev';

// Static pages that should be in the sitemap
const staticPages = [
	'', // homepage
	'/docs',
	'/blog',
	'/about',
	'/contact',
	'/privacy',
	'/terms',
	'/projects',
	'/sign-in',
	'/sign-up'
];

export const GET: RequestHandler = async () => {
	const pages = staticPages.map((page) => ({
		loc: `${site}${page}`,
		lastmod: new Date().toISOString().split('T')[0],
		changefreq: page === '' ? 'daily' : 'weekly',
		priority: page === '' ? '1.0' : '0.8'
	}));

	// Dynamically load blog posts from markdown files
	let posts: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [];

	try {
		const blogDir = join(process.cwd(), 'src/md/blog');

		// Check if directory exists before trying to read it
		let dirExists = false;
		try {
			await access(blogDir, constants.R_OK);
			dirExists = true;
		} catch {
			// Directory doesn't exist or isn't readable, skip blog posts
			console.log('Blog directory not found, skipping blog posts in sitemap');
		}

		if (dirExists) {
			const files = await readdir(blogDir);
			const mdFiles = files.filter((file) => file.endsWith('.md'));

			const blogPosts = await Promise.all(
				mdFiles.map(async (file) => {
					const filePath = join(blogDir, file);
					const content = await readFile(filePath, 'utf-8');
					const { data } = matter(content);

					// Only include published posts
					if (data.published === false) {
						return null;
					}

					return {
						slug: data.slug || file.replace('.md', ''),
						date: data.date
					};
				})
			);

			posts = blogPosts
				.filter((post): post is NonNullable<typeof post> => post !== null)
				.map((post) => ({
					loc: `${site}/blog/${post.slug}`,
					lastmod: post.date || new Date().toISOString().split('T')[0],
					changefreq: 'monthly',
					priority: '0.7'
				}));
		}
	} catch (error) {
		console.error('Error loading blog posts for sitemap:', error);
		// Continue with empty posts array if blog loading fails
	}

	const allUrls = [...pages, ...posts];

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
	.map(
		(url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600, s-maxage=3600'
		}
	});
};
