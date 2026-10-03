// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { getUserForLayout } from '$lib/server/users';
import { getAccessibleProjectsNav } from '$lib/server/projects';
import { getCsrfToken } from '$lib/server/sessions';
import { defineBaseMetaTags } from 'svelte-meta-tags';
import { building } from '$app/environment';
import { SITE_URL } from '$lib/site';

const PRIVATE_PATH_PREFIXES = [
	'/dashboard',
	'/projects',
	'/teams',
	'/settings',
	'/reports',
	'/sms',
	'/authenticators',
	'/onboarding',
	'/admin',
	'/invitations',
	'/change-password',
	'/reset-password',
	'/setup-password',
	'/user-profile'
];

export const load: LayoutServerLoad = async (event) => {
	const { locals, url } = event;
	// Get user ID from auth
	const userId = locals.userId || null;

	// Generate CSRF token for forms
	const csrfToken = getCsrfToken(event);

	// Prerendered pages are built with a placeholder origin, so fall back to the public URL
	const origin = building ? SITE_URL : url.origin;
	const ogImageUrl = new URL('/og_image.png', origin).href;
	const pageUrl = new URL(url.pathname, origin).href;
	const isPrivate = PRIVATE_PATH_PREFIXES.some(
		(prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
	);

	const { baseMetaTags } = defineBaseMetaTags({
		title: 'QA Studio',
		titleTemplate: '%s | QA Studio',
		description:
			'Modern test management platform built by QA engineers. Open source, API-first, and designed for modern testing workflows.',
		canonical: pageUrl,
		robots: isPrivate ? 'noindex,nofollow' : 'index,follow',
		openGraph: {
			type: 'website',
			url: pageUrl,
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
			}
		]
	});

	// Fetch user data if authenticated
	let user = null;
	let projects: Array<{ id: string; name: string; key: string }> = [];

	if (userId) {
		const [dbUser, navProjects] = await Promise.all([
			getUserForLayout(userId),
			getAccessibleProjectsNav(userId)
		]);

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
			projects = navProjects;
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
