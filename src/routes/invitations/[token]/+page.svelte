<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { UserCheck, Users, Shield, AlertCircle, CheckCircle, LogIn } from 'lucide-svelte';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { SignedIn, SignedOut, SignInButton } from 'svelte-clerk/client';

	let { data } = $props();
	let { invitation } = $derived(data);

	let loading = $state(false);
	let error = $state('');

	async function acceptInvitation() {
		loading = true;
		error = '';

		try {
			const res = await fetch(`/api/invitations/${$page.params.token}/accept`, {
				method: 'POST'
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to accept invitation');
			}

			const result = await res.json();

			// Redirect to team page
			goto(`/teams/${result.team.id}?joined=true`);
		} catch (err: any) {
			error = err.message;
			loading = false;
		}
	}

	async function declineInvitation() {
		if (!confirm('Are you sure you want to decline this invitation?')) {
			return;
		}

		loading = true;
		error = '';

		try {
			const res = await fetch(`/api/invitations/${$page.params.token}/decline`, {
				method: 'PATCH'
			});

			if (!res.ok) {
				throw new Error('Failed to decline invitation');
			}

			// Redirect to home
			goto('/?invitation=declined');
		} catch (err: any) {
			error = err.message;
			loading = false;
		}
	}

	function getRoleBadge(role: string) {
		const badges: Record<string, { class: string; icon: any }> = {
			ADMIN: { class: 'preset-filled-error', icon: Shield },
			MANAGER: { class: 'preset-filled-warning', icon: Shield },
			TESTER: { class: 'preset-filled-primary', icon: UserCheck },
			VIEWER: { class: 'preset-filled-surface', icon: Users }
		};
		return badges[role] || badges.TESTER;
	}

	function formatDate(date: string | Date) {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<div class="w-full max-w-2xl">
		<!-- Invitation Card -->
		<div class="card p-8">
			<!-- Header -->
			<div class="mb-6 text-center">
				<div class="bg-primary-500/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
					<Users class="text-primary-500 h-8 w-8" />
				</div>
				<h1 class="mb-2 text-2xl font-bold">You've been invited!</h1>
				<p class="text-surface-600-300">Join {invitation.team.name} on QA Studio</p>
			</div>

			{#if error}
				<div class="alert preset-filled-error mb-6">
					<AlertCircle class="h-5 w-5" />
					<p>{error}</p>
				</div>
			{/if}

			<!-- Team Info -->
			<div class="mb-6 rounded-container border border-surface-300-700 bg-surface-50-950 p-6">
				<h2 class="mb-4 font-medium">Team Details</h2>

				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-surface-600-300">Team Name</span>
						<span class="font-medium">{invitation.team.name}</span>
					</div>

					{#if invitation.team.description}
						<div class="flex items-start justify-between gap-4">
							<span class="text-surface-600-300">Description</span>
							<span class="max-w-xs text-right font-medium">{invitation.team.description}</span>
						</div>
					{/if}

					<div class="flex items-center justify-between">
						<span class="text-surface-600-300">Your Role</span>
						<span class="badge {getRoleBadge(invitation.role).class}">
							{invitation.role}
						</span>
					</div>

					<div class="flex items-center justify-between">
						<span class="text-surface-600-300">Team Members</span>
						<span class="font-medium">{invitation.team.members.length}</span>
					</div>

					<div class="flex items-center justify-between">
						<span class="text-surface-600-300">Invited To</span>
						<span class="font-medium">{invitation.email}</span>
					</div>

					<div class="flex items-center justify-between">
						<span class="text-surface-600-300">Expires</span>
						<span class="font-medium">{formatDate(invitation.expiresAt)}</span>
					</div>
				</div>
			</div>

			<!-- Team Members Preview -->
			{#if invitation.team.members.length > 0}
				<div class="mb-6">
					<h2 class="mb-3 text-sm font-medium">Current Members</h2>
					<div class="flex -space-x-2">
						{#each invitation.team.members.slice(0, 5) as member}
							<Avatar class="h-10 w-10 border-2 border-surface-50-950">
								{#if member.imageUrl}
									<Avatar.Image src={member.imageUrl} alt={member.email} />
								{/if}
								<Avatar.Fallback>
									{member.firstName?.[0] || member.email[0].toUpperCase()}
								</Avatar.Fallback>
							</Avatar>
						{/each}
						{#if invitation.team.members.length > 5}
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface-50-950 bg-surface-200-800 text-xs font-medium"
							>
								+{invitation.team.members.length - 5}
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Role Description -->
			<div class="mb-6 rounded-container bg-surface-100-900 p-4">
				<h3 class="mb-2 text-sm font-medium">As a {invitation.role}, you'll be able to:</h3>
				<ul class="text-surface-600-300 space-y-1 text-sm">
					{#if invitation.role === 'ADMIN'}
						<li>• Full system access</li>
						<li>• Manage users, teams, and all projects</li>
						<li>• Configure billing and integrations</li>
					{:else if invitation.role === 'MANAGER'}
						<li>• Manage projects and teams</li>
						<li>• Invite and remove team members</li>
						<li>• Create and execute tests</li>
					{:else if invitation.role === 'TESTER'}
						<li>• Create and execute test cases</li>
						<li>• View team projects and results</li>
						<li>• Collaborate with team members</li>
					{:else if invitation.role === 'VIEWER'}
						<li>• View projects and test results</li>
						<li>• Access reports and dashboards</li>
						<li>• Read-only access to team resources</li>
					{/if}
				</ul>
			</div>

			<!-- Actions -->
			<SignedIn>
				<div class="flex gap-3">
					<button
						onclick={acceptInvitation}
						class="btn flex-1 preset-filled"
						disabled={loading}
					>
						<CheckCircle class="mr-2 h-4 w-4" />
						{loading ? 'Joining...' : 'Accept Invitation'}
					</button>

					<button
						onclick={declineInvitation}
						class="btn preset-outlined"
						disabled={loading}
					>
						Decline
					</button>
				</div>
			</SignedIn>

			<SignedOut>
				<div class="rounded-container border border-warning-500 bg-warning-500/10 p-4 mb-4">
					<div class="flex items-start gap-3">
						<AlertCircle class="h-5 w-5 text-warning-500 flex-shrink-0 mt-0.5" />
						<div>
							<h3 class="font-medium text-warning-500 mb-1">Sign in required</h3>
							<p class="text-surface-600-300 text-sm mb-3">
								You need to sign in or create an account to accept this invitation.
								{#if invitation.email}
									Make sure to use the email address: <strong>{invitation.email}</strong>
								{/if}
							</p>
						</div>
					</div>
				</div>

				<div class="flex gap-3">
					<SignInButton
						forceRedirectUrl={`/invitations/${$page.params.token}`}
						signUpForceRedirectUrl={`/invitations/${$page.params.token}`}
					>
						<button class="btn flex-1 preset-filled">
							<LogIn class="mr-2 h-4 w-4" />
							Sign In to Accept
						</button>
					</SignInButton>
				</div>
			</SignedOut>
		</div>

		<!-- Footer Note -->
		<p class="text-surface-600-300 mt-4 text-center text-sm">
			By accepting, you agree to join this team and collaborate with its members
		</p>
	</div>
</div>
