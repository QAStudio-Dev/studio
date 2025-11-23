import type { RequestHandler } from './$types';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';

export const prerender = true;

const SITE_URL = 'https://qastudio.dev';
const SITE_TITLE = 'QA Studio Blog';
const SITE_DESCRIPTION = 'Testing insights, best practices, and updates from QA Studio';
const SITE_AUTHOR = 'QA Studio Team';

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
		const mdFiles = await findMarkdownFiles(blogDir);

		const posts = await Promise.all(
			mdFiles.map(async (filePath) => {
				const fileContent = await readFile(filePath, 'utf-8');
				const { data, content } = matter(fileContent);

				return {
					slug: data.slug || filePath.split('/').pop()?.replace('.md', '') || '',
					title: data.title,
					description: data.description,
					date: data.date,
					author: data.author || SITE_AUTHOR,
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
		console.error('Error loading blog posts for Atom:', error);
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

function generateAtom(posts: BlogPost[]): string {
	const updated =
		posts.length > 0 ? new Date(posts[0].date).toISOString() : new Date().toISOString();

	const entries = posts
		.map(
			(post) => `
  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${SITE_URL}/blog/${post.slug}" />
    <id>${SITE_URL}/blog/${post.slug}</id>
    <updated>${new Date(post.date).toISOString()}</updated>
    <summary>${escapeXml(post.description)}</summary>
    <author>
      <name>${escapeXml(post.author)}</name>
    </author>
  </entry>`
		)
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(SITE_TITLE)}</title>
  <subtitle>${escapeXml(SITE_DESCRIPTION)}</subtitle>
  <link href="${SITE_URL}/blog" />
  <link href="${SITE_URL}/atom.xml" rel="self" />
  <id>${SITE_URL}/</id>
  <updated>${updated}</updated>
  <author>
    <name>${escapeXml(SITE_AUTHOR)}</name>
  </author>
  <generator>SvelteKit</generator>
${entries}
</feed>`;
}

export const GET: RequestHandler = async () => {
	const posts = await getBlogPosts();
	const atom = generateAtom(posts);

	return new Response(atom, {
		headers: {
			'Content-Type': 'application/atom+xml; charset=utf-8',
			'Cache-Control': 'max-age=3600, s-maxage=3600'
		}
	});
};
