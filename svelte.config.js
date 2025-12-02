import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { webcrypto } from 'node:crypto';

// Polyfill Web Crypto API for Clerk authentication
if (!globalThis.crypto) {
	globalThis.crypto = webcrypto;
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess(), mdsvex()],
	kit: {
		adapter: adapter(),
		alias: {
			$api: './src/api',
			$prisma: './src/generated/client'
		},
		prerender: {
			handleHttpError: 'warn' // Don't fail on 404s during prerender
		},
		csrf: {
			checkOrigin: false // Disable CSRF for API routes (handled by API key auth)
		}
	},
	extensions: ['.svelte', '.svx']
};

export default config;
