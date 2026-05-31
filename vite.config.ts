import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		process.env.ANALYZE === 'true' &&
			visualizer({
				filename: 'build-stats.html',
				gzipSize: true,
				open: false
			}),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		})
	],
	server: {
		port: 3000,
		host: true
	},
	preview: {
		port: 3000,
		host: true
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules/@lucide/svelte')) {
						return 'lucide';
					}
					if (id.includes('node_modules/@skeletonlabs')) {
						return 'skeleton';
					}
					if (id.includes('node_modules/marked')) {
						return 'marked';
					}
					if (id.includes('node_modules/html5-qrcode')) {
						return 'html5-qrcode';
					}
				}
			}
		}
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					setupFiles: ['./vitest-setup-server.ts']
				}
			}
		]
	}
});
