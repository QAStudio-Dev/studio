<script lang="ts">
	import { SignIn } from 'svelte-clerk';
</script>

<svelte:head>
	<title>Sign In - QA Studio</title>
</svelte:head>

<div
	class="container mx-auto flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-16"
>
	<div class="w-full max-w-md">
		<div class="mb-8 text-center">
			<h1 class="mb-2 text-3xl font-bold">Welcome Back</h1>
			<p class="text-surface-600-400">Sign in to your QA Studio account</p>
		</div>

		<SignIn />
	</div>
</div>
