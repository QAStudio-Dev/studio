<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { UserPlus, Mail, Clock, XCircle, AlertCircle, CheckCircle, Copy } from 'lucide-svelte';

	let { data } = $props();
	let { team, availableSeats, maxSeats, currentUser } = $derived(data);

	// Form state
	let email = $state('');
	let role = $state('TESTER');
	let loading = $state(false);
	let error = $state('');
	let success = $state('');
	let copiedId = $state<string | null>(null);
	let lastInviteUrl = $state<string | null>(null);

	const roles = [
		{ value: 'VIEWER', label: 'Viewer', description: 'Read-only access' },
		{ value: 'TESTER', label: 'Tester', description: 'Create and execute tests' },
		{ value: 'MANAGER', label: 'Manager', description: 'Manage projects and teams' },
		{ value: 'ADMIN', label: 'Admin', description: 'Full system access' }
	];

	async function sendInvitation() {
		if (!email) {
			error = 'Email is required';
			return;
		}

		loading = true;
		error = '';
		success = '';

		try {
			const res = await fetch(`/api/teams/${team.id}/members/invite`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, role })
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to send invitation');
			}

			const result = await res.json();
			success = `Invitation sent to ${email}`;
			lastInviteUrl = result.invitation.inviteUrl;
			email = '';

			// Refresh the page to show the new invitation
			setTimeout(() => {
				window.location.reload();
			}, 2000);
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function cancelInvitation(invitationId: string) {
		if (!confirm('Are you sure you want to cancel this invitation?')) {
			return;
		}

		try {
			const res = await fetch(`/api/teams/${team.id}/members/invite`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ invitationId })
			});

			if (!res.ok) {
				throw new Error('Failed to cancel invitation');
			}

			// Refresh the page
			window.location.reload();
		} catch (err: any) {
			error = err.message;
		}
	}

	function copyInviteLink(token: string) {
		const link = `${window.location.origin}/invitations/${token}`;
		navigator.clipboard.writeText(link);
		copiedId = token;
		setTimeout(() => {
			copiedId = null;
		}, 2000);
	}

	function formatDate(date: string | Date) {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="container mx-auto max-w-4xl p-8">
	<!-- Header -->
	<div class="mb-8">
		<a href="/teams/{team.id}" class="text-surface-600-300 mb-2 inline-block text-sm">
			← Back to team
		</a>
		<h1 class="mb-2 text-3xl font-bold">Invite Team Members</h1>
		<p class="text-surface-600-300">
			Send invitations to add new members to {team.name}
		</p>
	</div>

	<!-- Seat Information -->
	<div class="mb-6 card p-6">
		<div class="mb-4 flex items-center justify-between">
			<div>
				<h2 class="h4">Available Seats</h2>
				<p class="text-surface-600-300 text-sm">
					{availableSeats} of {maxSeats} seats available
				</p>
			</div>

			<div class="text-right">
				<div class="text-2xl font-bold">
					{availableSeats}/{maxSeats}
				</div>
				{#if !team.subscription}
					<a href="/teams/new" class="text-sm text-primary-500 underline"
						>Upgrade to add more</a
					>
				{:else if availableSeats === 0}
					<a href="/teams/{team.id}" class="text-sm text-primary-500 underline"
						>Manage billing</a
					>
				{/if}
			</div>
		</div>

		{#if availableSeats <= 0}
			<div class="alert preset-filled-warning">
				<AlertCircle class="h-5 w-5" />
				<p>
					You've reached your seat limit. {!team.subscription
						? 'Upgrade to Pro to add more members.'
						: 'Add more seats through the billing portal.'}
				</p>
			</div>
		{/if}
	</div>

	<!-- Alerts -->
	{#if error}
		<div class="alert preset-filled-error mb-6">
			<AlertCircle class="h-5 w-5" />
			<p>{error}</p>
		</div>
	{/if}

	{#if success}
		<div class="alert preset-filled-success mb-6">
			<CheckCircle class="h-5 w-5" />
			<p>{success}</p>
		</div>
	{/if}

	{#if lastInviteUrl}
		<div class="mb-6 card border-2 border-primary-500 p-6">
			<h3 class="mb-3 font-bold text-primary-500">Invitation Created!</h3>
			<p class="text-surface-600-300 mb-4 text-sm">
				Share this link with the invitee to join your team:
			</p>
			<div class="flex items-center gap-2">
				<input
					type="text"
					readonly
					value={lastInviteUrl}
					class="input flex-1 font-mono text-sm"
					onclick={(e) => e.currentTarget.select()}
				/>
				<button
					onclick={() => {
						if (lastInviteUrl) {
							navigator.clipboard.writeText(lastInviteUrl);
							copiedId = 'new';
							setTimeout(() => {
								copiedId = null;
							}, 2000);
						}
					}}
					class="btn preset-filled-primary-500"
				>
					{#if copiedId === 'new'}
						<CheckCircle class="mr-2 h-4 w-4" />
						Copied!
					{:else}
						<Copy class="mr-2 h-4 w-4" />
						Copy Link
					{/if}
				</button>
			</div>
		</div>
	{/if}

	<!-- Invitation Form -->
	{#if availableSeats > 0}
		<div class="mb-8 card p-6">
			<h2 class="mb-4 h3">Send Invitation</h2>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					sendInvitation();
				}}
				class="space-y-4"
			>
				<div>
					<label for="email" class="mb-2 block font-medium">Email Address</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						placeholder="colleague@company.com"
						class="input"
						required
						disabled={loading}
					/>
					<p class="text-surface-600-300 mt-1 text-sm">
						They'll receive an invitation link to join your team
					</p>
				</div>

				<div>
					<label for="role" class="mb-2 block font-medium">Role</label>
					<select id="role" bind:value={role} class="select" disabled={loading}>
						{#each roles as roleOption}
							<option value={roleOption.value}>
								{roleOption.label} - {roleOption.description}
							</option>
						{/each}
					</select>
				</div>

				<button type="submit" class="btn w-full preset-filled" disabled={loading}>
					<UserPlus class="mr-2 h-4 w-4" />
					{loading ? 'Sending...' : 'Send Invitation'}
				</button>
			</form>
		</div>
	{/if}

	<!-- Pending Invitations -->
	{#if team.invitations && team.invitations.length > 0}
		<div class="card p-6">
			<h2 class="mb-4 h3">Pending Invitations</h2>

			<div class="space-y-3">
				{#each team.invitations as invitation}
					<div
						class="hover:bg-surface-100-800 rounded-container border border-surface-300-700 p-4"
					>
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<Mail class="text-surface-600-300 h-4 w-4" />
									<span class="font-medium">{invitation.email}</span>
									<span class="preset-filled-surface badge text-xs"
										>{invitation.role}</span
									>
								</div>

								<div
									class="text-surface-600-300 mt-2 flex items-center gap-4 text-sm"
								>
									<span class="flex items-center gap-1">
										<Clock class="h-3 w-3" />
										Sent {formatDate(invitation.createdAt)}
									</span>
									<span>Expires {formatDate(invitation.expiresAt)}</span>
								</div>

								<!-- Invitation Link -->
								<div class="mt-3 rounded-base bg-surface-100-900 p-3">
									<div class="text-surface-600-300 mb-2 text-xs font-medium">
										Invitation Link
									</div>
									<div class="flex items-center gap-2">
										<input
											type="text"
											readonly
											value="{window.location
												.origin}/invitations/{invitation.token}"
											class="input flex-1 font-mono text-xs"
											onclick={(e) => e.currentTarget.select()}
										/>
										<button
											onclick={() => copyInviteLink(invitation.token)}
											class="btn preset-filled-primary-500 btn-sm whitespace-nowrap"
											title="Copy invitation link"
										>
											{#if copiedId === invitation.token}
												<CheckCircle class="mr-1 h-4 w-4" />
												Copied!
											{:else}
												<Copy class="mr-1 h-4 w-4" />
												Copy
											{/if}
										</button>
									</div>
									<p class="text-surface-500-400 mt-1 text-xs">
										Share this link with the invitee to join your team
									</p>
								</div>
							</div>

							<button
								onclick={() => cancelInvitation(invitation.id)}
								class="preset-outlined-error btn btn-sm"
								title="Cancel invitation"
							>
								<XCircle class="h-4 w-4" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
