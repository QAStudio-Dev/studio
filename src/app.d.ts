// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			userId: string | null;
			auth: () => { userId: string | null };
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
