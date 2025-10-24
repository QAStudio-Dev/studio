<script lang="ts">
	import { SignUp } from 'svelte-clerk/client';
</script>

<svelte:head>
	<title>Sign Up - QA Studio</title>
</svelte:head>

<div class="container mx-auto flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-16">
	<div class="w-full max-w-md">
		<div class="mb-8 text-center">
			<h1 class="mb-2 text-3xl font-bold">Get Started</h1>
			<p class="text-surface-600-400">Create your QA Studio account</p>
		</div>

		<SignUp />
	</div>
</div>
