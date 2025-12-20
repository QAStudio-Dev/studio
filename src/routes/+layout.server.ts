// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { getUser } from '$lib/server/users';
import { db } from '$lib/server/db';
import { getCsrfToken } from '$lib/server/sessions';
import { defineBaseMetaTags } from 'svelte-meta-tags';

export const load: LayoutServerLoad = async (event) => {
	const { locals, url } = event;
	// Get user ID from auth
	const userId = locals.userId || null;

	// Generate CSRF token for forms
	const csrfToken = getCsrfToken(event);

	// Define base meta tags for SSR
	// Use dynamic URLs based on current origin (works in dev/staging/prod)
	const ogImageUrl = new URL('/og_image.png', url.origin).href;

	const baseMetaTags = defineBaseMetaTags({
		title: 'QA Studio',
		titleTemplate: '%s | QA Studio',
		description:
			'Modern test management platform built by QA engineers. Open source, API-first, and designed for modern testing workflows.',
		canonical: new URL(url.pathname, url.origin).href,
		openGraph: {
			type: 'website',
			url: new URL(url.pathname, url.origin).href,
			locale: 'en_US',
			title: 'QA Studio - Modern Test Management Platform',
			description:
				'Modern test management platform built by QA engineers. Open source, API-first, and designed for modern testing workflows.',
			siteName: 'QA Studio',
			images: [
				{
					url: ogImageUrl,
					alt: 'QA Studio - Modern Test Management',
					width: 1200,
					height: 630,
					secureUrl: ogImageUrl,
					type: 'image/png'
				}
			]
		},
		twitter: {
			cardType: 'summary_large_image',
			site: '@qastudio',
			title: 'QA Studio - Modern Test Management Platform',
			description:
				'Modern test management platform built by QA engineers. Open source and API-first.',
			image: ogImageUrl,
			imageAlt: 'QA Studio - Modern Test Management'
		},
		additionalMetaTags: [
			{
				name: 'keywords',
				content:
					'test management, QA, quality assurance, playwright, testing, test automation, test reporting, open source'
			},
			{
				name: 'author',
				content: 'QA Studio'
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1'
			},
			{
				httpEquiv: 'x-ua-compatible',
				content: 'IE=edge'
			}
		]
	});

	// Fetch user data if authenticated
	let user = null;
	let projects: Array<{ id: string; name: string; key: string }> = [];

	if (userId) {
		const dbUser = await getUser(userId);
		if (dbUser) {
			user = {
				id: dbUser.id,
				email: dbUser.email,
				firstName: dbUser.firstName,
				lastName: dbUser.lastName,
				imageUrl: dbUser.imageUrl,
				role: dbUser.role,
				teamId: dbUser.teamId
			};

			// Fetch user's projects
			// Only fetch projects if user has a team
			if (dbUser.teamId) {
				const userProjects = await db.project.findMany({
					where: {
						teamId: dbUser.teamId
					},
					select: {
						id: true,
						name: true,
						key: true
					},
					orderBy: {
						createdAt: 'desc'
					}
				});

				projects = userProjects;
			}
		}
	}

	return {
		userId,
		user,
		projects,
		csrfToken,
		baseMetaTags
	};
};
