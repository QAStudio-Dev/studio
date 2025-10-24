<script lang="ts">
	import { UserProfile } from 'svelte-clerk/client';
</script>

<svelte:head>
	<title>User Profile - QA Studio</title>
</svelte:head>

<div class="container mx-auto px-4 py-16">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold">User Profile</h1>
		<p class="text-surface-600-400">Manage your account settings and preferences</p>
	</div>

	<UserProfile />
</div>
