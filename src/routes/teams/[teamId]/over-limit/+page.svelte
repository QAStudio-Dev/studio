<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { AlertTriangle, Users, CreditCard } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();
	let {
		team,
		members,
		subscription,
		currentUserId,
		seatsNeeded,
		currentMembers,
		membersToRemove
	} = $derived(data);

	let selectedToRemove = $state<string[]>([]);
	let loading = $state(false);
	let error = $state('');

	// Can't remove yourself
	let removableMembers = $derived(members.filter((m) => m.id !== currentUserId));

	let isValid = $derived(selectedToRemove.length === membersToRemove);

	function toggleMember(memberId: string) {
		if (selectedToRemove.includes(memberId)) {
			selectedToRemove = selectedToRemove.filter((id) => id !== memberId);
		} else {
			if (selectedToRemove.length < membersToRemove) {
				selectedToRemove = [...selectedToRemove, memberId];
			}
		}
	}

	async function removeMembers() {
		if (!isValid) return;

		loading = true;
		error = '';

		try {
			const res = await fetch(`/api/teams/${team.id}/resolve-seat-limit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					memberIdsToRemove: selectedToRemove
				})
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to remove members');
			}

			// Redirect to team page
			goto(`/teams/${team.id}`);
		} catch (err: any) {
			error = err.message;
			loading = false;
		}
	}

	function getMemberName(member: any) {
		if (member.firstName && member.lastName) {
			return `${member.firstName} ${member.lastName}`;
		}
		return member.email;
	}
</script>

<div class="container mx-auto max-w-4xl p-8">
	<!-- Header Alert -->
	<div class="alert mb-8 preset-filled-warning-500">
		<AlertTriangle class="h-6 w-6" />
		<div>
			<h1 class="mb-1 h3">Team Over Seat Limit</h1>
			<p class="text-sm">
				Your team subscription was reduced to <strong
					>{seatsNeeded} seat{seatsNeeded !== 1 ? 's' : ''}</strong
				>, but you currently have
				<strong>{currentMembers} member{currentMembers !== 1 ? 's' : ''}</strong>.
			</p>
			<p class="mt-2 text-sm">
				Please select <strong
					>{membersToRemove} member{membersToRemove !== 1 ? 's' : ''}</strong
				> to remove from the team.
			</p>
		</div>
	</div>

	{#if error}
		<div class="alert mb-6 preset-filled-error-500">
			<AlertTriangle class="h-5 w-5" />
			<p>{error}</p>
		</div>
	{/if}

	<!-- Main Content -->
	<div class="card p-6">
		<div class="mb-6 flex items-center gap-3">
			<Users class="h-5 w-5" />
			<h2 class="h3">Select Members to Remove</h2>
		</div>

		<p class="mb-6 text-surface-600-400">
			Selected: <strong>{selectedToRemove.length}</strong> of
			<strong>{membersToRemove}</strong> required
		</p>

		<!-- Member List -->
		<div class="mb-6 space-y-3">
			{#each removableMembers as member}
				{@const isSelected = selectedToRemove.includes(member.id)}
				{@const canSelect = isSelected || selectedToRemove.length < membersToRemove}

				<button
					onclick={() => canSelect && toggleMember(member.id)}
					class="w-full rounded-container border-2 p-4 text-left transition-all hover:bg-surface-100-900"
					class:border-error-500={isSelected}
					class:border-surface-200-800={!isSelected}
					class:opacity-50={!canSelect}
					disabled={!canSelect}
					type="button"
				>
					<div class="flex items-center gap-3">
						<div
							class="flex h-6 w-6 items-center justify-center rounded border-2"
							class:bg-error-500={isSelected}
							class:border-error-500={isSelected}
							class:border-surface-200-800={!isSelected}
						>
							{#if isSelected}
								<svg
									class="h-4 w-4 text-white"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/>
								</svg>
							{/if}
						</div>

						<Avatar class="h-12 w-12">
							{#if member.imageUrl}
								<Avatar.Image src={member.imageUrl} alt={getMemberName(member)} />
							{/if}
							<Avatar.Fallback>
								{member.firstName?.[0] || member.email[0].toUpperCase()}
							</Avatar.Fallback>
						</Avatar>

						<div class="min-w-0 flex-1">
							<p class="font-medium">{getMemberName(member)}</p>
							<p class="text-sm text-surface-600-400">{member.email}</p>
							<p class="mt-1 text-xs text-surface-600-400">{member.role}</p>
						</div>
					</div>
				</button>
			{/each}

			<!-- Current User (cannot be removed) -->
			{#if members.find((m) => m.id === currentUserId)}
				{@const currentMember = members.find((m) => m.id === currentUserId)!}
				<div
					class="w-full rounded-container border-2 border-surface-200-800 bg-surface-100-900 p-4 opacity-50"
				>
					<div class="flex items-center gap-3">
						<div class="flex h-6 w-6 items-center justify-center"></div>

						<Avatar class="h-12 w-12">
							{#if currentMember.imageUrl}
								<Avatar.Image
									src={currentMember.imageUrl}
									alt={getMemberName(currentMember)}
								/>
							{/if}
							<Avatar.Fallback>
								{currentMember.firstName?.[0] ||
									currentMember.email[0].toUpperCase()}
							</Avatar.Fallback>
						</Avatar>

						<div class="min-w-0 flex-1">
							<p class="font-medium">{getMemberName(currentMember)} (You)</p>
							<p class="text-sm text-surface-600-400">{currentMember.email}</p>
							<p class="mt-1 text-xs text-surface-600-400">{currentMember.role}</p>
						</div>

						<span class="badge preset-filled-primary-500 text-xs">Cannot Remove</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex items-center justify-between gap-4 border-t border-surface-200-800 pt-6">
			<a href="/teams/{team.id}" class="btn preset-outlined"> Cancel </a>

			<button
				onclick={removeMembers}
				class="btn preset-filled-error-500"
				disabled={!isValid || loading}
			>
				{loading
					? 'Removing...'
					: `Remove ${selectedToRemove.length} Member${selectedToRemove.length !== 1 ? 's' : ''}`}
			</button>
		</div>
	</div>

	<!-- Subscription Info -->
	<div class="mt-6 card p-6">
		<div class="mb-4 flex items-center gap-3">
			<CreditCard class="h-5 w-5" />
			<h2 class="h4">Subscription Details</h2>
		</div>

		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<span class="text-surface-600-400">Current Plan</span>
				<span class="font-medium">{seatsNeeded} seat{seatsNeeded !== 1 ? 's' : ''}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-surface-600-400">Current Members</span>
				<span class="font-medium">{currentMembers}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-surface-600-400">Must Remove</span>
				<span class="font-medium text-error-500">{membersToRemove}</span>
			</div>
		</div>

		<div class="mt-6 border-t border-surface-200-800 pt-6">
			<p class="text-sm text-surface-600-400">
				Need more seats? You can upgrade your subscription from the
				<a href="/teams/{team.id}" class="text-primary-500 hover:underline">team settings</a
				>.
			</p>
		</div>
	</div>
</div>
