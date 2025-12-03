<!-- Export validation function for parent component -->
<script module lang="ts">
	export function validatePassword(password: string): {
		valid: boolean;
		errors: string[];
	} {
		const errors: string[] = [];

		if (password.length < 8) {
			errors.push('Password must be at least 8 characters');
		}
		if (!/[A-Z]/.test(password)) {
			errors.push('Password must contain an uppercase letter');
		}
		if (!/[a-z]/.test(password)) {
			errors.push('Password must contain a lowercase letter');
		}
		if (!/\d/.test(password)) {
			errors.push('Password must contain a number');
		}

		return {
			valid: errors.length === 0,
			errors
		};
	}
</script>

<script lang="ts">
	import { Check, X } from 'lucide-svelte';

	let { password = '' } = $props();

	type Requirement = {
		text: string;
		test: (pwd: string) => boolean;
	};

	const requirements: Requirement[] = [
		{ text: 'At least 8 characters', test: (pwd) => pwd.length >= 8 },
		{ text: 'Contains uppercase letter', test: (pwd) => /[A-Z]/.test(pwd) },
		{ text: 'Contains lowercase letter', test: (pwd) => /[a-z]/.test(pwd) },
		{ text: 'Contains number', test: (pwd) => /\d/.test(pwd) }
	];

	const results = $derived(
		requirements.map((req) => ({
			...req,
			met: req.test(password)
		}))
	);

	const allMet = $derived(results.every((r) => r.met));
	const hasValue = $derived(password.length > 0);
</script>

{#if hasValue}
	<div class="mt-2 rounded-base border border-surface-300-700 bg-surface-100-900 p-3">
		<p class="mb-2 text-xs font-semibold text-surface-600-400">Password requirements:</p>
		<ul class="space-y-1">
			{#each results as { text, met }}
				<li class="flex items-center gap-2 text-sm">
					{#if met}
						<Check class="h-4 w-4 text-success-500" />
						<span class="text-success-600 dark:text-success-400">{text}</span>
					{:else}
						<X class="h-4 w-4 text-error-500" />
						<span class="text-surface-600-400">{text}</span>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
{/if}
