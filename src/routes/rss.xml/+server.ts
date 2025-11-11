import type { RequestHandler } from './$types';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';

export const prerender = true;

const SITE_URL = 'https://qastudio.dev';
const SITE_TITLE = 'QA Studio Blog';
const SITE_DESCRIPTION = 'Testing insights, best practices, and updates from QA Studio';

interface BlogPost {
	slug: string;
	title: string;
	description: string;
	date: string;
	author: string;
	content: string;
	published: boolean;
}

async function getBlogPosts(): Promise<BlogPost[]> {
	const blogDir = join(process.cwd(), 'src/md/blog');

	try {
		const files = await readdir(blogDir);
		const mdFiles = files.filter((file) => file.endsWith('.md'));

		const posts = await Promise.all(
			mdFiles.map(async (file) => {
				const filePath = join(blogDir, file);
				const fileContent = await readFile(filePath, 'utf-8');
				const { data, content } = matter(fileContent);

				return {
					slug: data.slug || file.replace('.md', ''),
					title: data.title,
					description: data.description,
					date: data.date,
					author: data.author || 'QA Studio Team',
					content,
					published: data.published !== false
				};
			})
		);

		// Filter published posts and sort by date (newest first)
		return posts
			.filter((post) => post.published)
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	} catch (error) {
		console.error('Error loading blog posts for RSS:', error);
		return [];
	}
}

function escapeXml(unsafe: string): string {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function generateRSS(posts: BlogPost[]): string {
	const lastBuildDate =
		posts.length > 0 ? new Date(posts[0].date).toUTCString() : new Date().toUTCString();

	const items = posts
		.map(
			(post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <description>${escapeXml(post.description)}</description>
      <link>${SITE_URL}/blog/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <author>${escapeXml(post.author)}</author>
    </item>`
		)
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>SvelteKit</generator>
${items}
  </channel>
</rss>`;
}

export const GET: RequestHandler = async () => {
	const posts = await getBlogPosts();
	const rss = generateRSS(posts);

	return new Response(rss, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'max-age=3600, s-maxage=3600'
		}
	});
};
