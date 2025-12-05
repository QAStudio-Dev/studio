<script lang="ts">
	import { Building2, Users, Mail, Phone, Calendar, Shield } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let { data } = $props();

	let selectedTeam = $state<string | null>(null);
	let showUpgradeModal = $state(false);
	let showInquiryModal = $state(false);
	let selectedInquiry = $state<string | null>(null);

	// Form states
	let upgradePlan = $state('pro');
	let upgradeCustomSeats = $state<string>('');
	let upgradeContractEnd = $state('');
	let upgradeAccountManager = $state('');
	let upgradeInvoiceEmail = $state('');

	let inquiryStatus = $state('');
	let inquiryAssignedTo = $state('');
	let inquiryNotes = $state('');

	function openUpgradeModal(teamId: string) {
		selectedTeam = teamId;
		const team = data.teams.find((t) => t.id === teamId);
		if (team) {
			upgradePlan = team.plan;
			upgradeCustomSeats = team.customSeats?.toString() || '';
			upgradeContractEnd = team.contractEnd
				? new Date(team.contractEnd).toISOString().split('T')[0]
				: '';
			upgradeAccountManager = team.accountManager || '';
			upgradeInvoiceEmail = team.invoiceEmail || '';
		}
		showUpgradeModal = true;
	}

	function openInquiryModal(inquiryId: string) {
		selectedInquiry = inquiryId;
		const inquiry = data.inquiries.find((i) => i.id === inquiryId);
		if (inquiry) {
			inquiryStatus = inquiry.status;
			inquiryAssignedTo = inquiry.assignedTo || '';
			inquiryNotes = inquiry.notes || '';
		}
		showInquiryModal = true;
	}

	function getPlanBadgeClass(plan: string) {
		switch (plan) {
			case 'free':
				return 'badge preset-filled-surface-500';
			case 'pro':
				return 'badge preset-filled-primary-500';
			case 'enterprise':
				return 'badge preset-filled-secondary-500';
			default:
				return 'badge preset-outlined-surface-500';
		}
	}

	function getStatusBadgeClass(status: string) {
		switch (status) {
			case 'pending':
				return 'badge preset-filled-warning-500';
			case 'contacted':
				return 'badge preset-filled-primary-500';
			case 'qualified':
				return 'badge preset-filled-success-500';
			case 'converted':
				return 'badge preset-filled-secondary-500';
			case 'rejected':
				return 'badge preset-filled-error-500';
			default:
				return 'badge preset-outlined-surface-500';
		}
	}
</script>

<div class="container mx-auto max-w-7xl px-4 py-12">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold">Team Administration</h1>
		<p class="text-surface-600-300">Manage teams, plans, and enterprise inquiries</p>
	</div>

	<!-- Tabs -->
	<div class="mb-8">
		<div class="flex gap-4 border-b border-surface-200 dark:border-surface-800">
			<button class="border-b-2 border-primary-500 px-4 py-2 font-medium text-primary-500">
				Teams
			</button>
			<button
				class="text-surface-600-300 px-4 py-2 hover:text-surface-900 dark:hover:text-surface-100"
			>
				Enterprise Inquiries ({data.inquiries.length})
			</button>
		</div>
	</div>

	<!-- Teams Table -->
	<div class="overflow-hidden card">
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead
					class="bg-surface-50-900 border-b border-surface-200 dark:border-surface-800"
				>
					<tr>
						<th class="px-6 py-3 text-left text-sm font-semibold">Team</th>
						<th class="px-6 py-3 text-left text-sm font-semibold">Plan</th>
						<th class="px-6 py-3 text-left text-sm font-semibold">Members</th>
						<th class="px-6 py-3 text-left text-sm font-semibold">Projects</th>
						<th class="px-6 py-3 text-left text-sm font-semibold">Created</th>
						<th class="px-6 py-3 text-left text-sm font-semibold">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-200 dark:divide-surface-800">
					{#each data.teams as team}
						<tr class="hover:bg-surface-50-900/50">
							<td class="px-6 py-4">
								<div>
									<div class="font-medium">{team.name}</div>
									{#if team.description}
										<div class="text-surface-600-300 text-sm">
											{team.description}
										</div>
									{/if}
								</div>
							</td>
							<td class="px-6 py-4">
								<span class={getPlanBadgeClass(team.plan)}>
									{team.plan}
								</span>
								{#if team.plan === 'enterprise' && team.customSeats}
									<div class="text-surface-600-300 mt-1 text-xs">
										{team.customSeats} seats
									</div>
								{/if}
							</td>
							<td class="px-6 py-4">{team._count.members}</td>
							<td class="px-6 py-4">{team._count.projects}</td>
							<td class="px-6 py-4">
								<div class="text-surface-600-300 text-sm">
									{new Date(team.createdAt).toLocaleDateString()}
								</div>
							</td>
							<td class="px-6 py-4">
								<button
									class="btn preset-outlined-primary-500 btn-sm"
									onclick={() => openUpgradeModal(team.id)}
								>
									Manage
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Enterprise Inquiries Section (hidden for now, can be toggled) -->
	<div class="mt-8 card p-6">
		<h2 class="mb-4 text-xl font-bold">Enterprise Inquiries</h2>
		<div class="space-y-4">
			{#each data.inquiries as inquiry}
				<div class="rounded-lg border border-surface-200 p-4 dark:border-surface-800">
					<div class="mb-3 flex items-start justify-between">
						<div>
							<h3 class="font-semibold">{inquiry.companyName}</h3>
							<p class="text-surface-600-300 text-sm">{inquiry.email}</p>
						</div>
						<span class={getStatusBadgeClass(inquiry.status)}>
							{inquiry.status}
						</span>
					</div>
					<div class="text-surface-600-300 grid gap-2 text-sm">
						{#if inquiry.contactName}
							<div>Contact: {inquiry.contactName}</div>
						{/if}
						{#if inquiry.estimatedSeats}
							<div>Estimated Seats: {inquiry.estimatedSeats}</div>
						{/if}
						{#if inquiry.requirements}
							<div>Requirements: {inquiry.requirements}</div>
						{/if}
						<div>Submitted: {new Date(inquiry.createdAt).toLocaleDateString()}</div>
					</div>
					<div class="mt-3">
						<button
							class="btn preset-outlined-primary-500 btn-sm"
							onclick={() => openInquiryModal(inquiry.id)}
						>
							Manage Inquiry
						</button>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Upgrade Team Modal -->
{#if showUpgradeModal && selectedTeam}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto card p-8">
			<h2 class="mb-6 text-2xl font-bold">Manage Team Plan</h2>

			<form
				method="POST"
				action="?/upgradeToPlan"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							showUpgradeModal = false;
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="teamId" value={selectedTeam} />

				<div class="space-y-6">
					<!-- Plan Selection -->
					<label class="label">
						<span class="mb-2 block font-medium">Plan</span>
						<select name="plan" class="input" bind:value={upgradePlan} required>
							<option value="free">Free</option>
							<option value="pro">Pro</option>
							<option value="enterprise">Enterprise</option>
						</select>
					</label>

					{#if upgradePlan === 'enterprise'}
						<!-- Enterprise-specific fields -->
						<label class="label">
							<span class="mb-2 block font-medium">Custom Seats</span>
							<input
								type="number"
								name="customSeats"
								class="input"
								bind:value={upgradeCustomSeats}
								min="1"
								placeholder="e.g., 500"
							/>
						</label>

						<label class="label">
							<span class="mb-2 block font-medium">Contract End Date</span>
							<input
								type="date"
								name="contractEnd"
								class="input"
								bind:value={upgradeContractEnd}
							/>
						</label>

						<label class="label">
							<span class="mb-2 block font-medium">Account Manager</span>
							<input
								type="email"
								name="accountManager"
								class="input"
								bind:value={upgradeAccountManager}
								placeholder="sales@yourdomain.com"
							/>
						</label>

						<label class="label">
							<span class="mb-2 block font-medium">Invoice Email</span>
							<input
								type="email"
								name="invoiceEmail"
								class="input"
								bind:value={upgradeInvoiceEmail}
								placeholder="billing@company.com"
							/>
						</label>
					{/if}

					<!-- Actions -->
					<div class="flex gap-3">
						<button type="submit" class="btn preset-filled-primary-500">
							Save Changes
						</button>
						<button
							type="button"
							class="btn preset-outlined-surface-500"
							onclick={() => (showUpgradeModal = false)}
						>
							Cancel
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Inquiry Management Modal -->
{#if showInquiryModal && selectedInquiry}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="w-full max-w-2xl card p-8">
			<h2 class="mb-6 text-2xl font-bold">Manage Inquiry</h2>

			<form
				method="POST"
				action="?/updateInquiryStatus"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							showInquiryModal = false;
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="inquiryId" value={selectedInquiry} />

				<div class="space-y-6">
					<label class="label">
						<span class="mb-2 block font-medium">Status</span>
						<select name="status" class="input" bind:value={inquiryStatus}>
							<option value="pending">Pending</option>
							<option value="contacted">Contacted</option>
							<option value="qualified">Qualified</option>
							<option value="converted">Converted</option>
							<option value="rejected">Rejected</option>
						</select>
					</label>

					<label class="label">
						<span class="mb-2 block font-medium">Assigned To</span>
						<input
							type="email"
							name="assignedTo"
							class="input"
							bind:value={inquiryAssignedTo}
							placeholder="sales@yourdomain.com"
						/>
					</label>

					<label class="label">
						<span class="mb-2 block font-medium">Notes</span>
						<textarea
							name="notes"
							class="textarea"
							rows="4"
							bind:value={inquiryNotes}
							placeholder="Internal notes about this inquiry..."
						></textarea>
					</label>

					<div class="flex gap-3">
						<button type="submit" class="btn preset-filled-primary-500"> Save </button>
						<button
							type="button"
							class="btn preset-outlined-surface-500"
							onclick={() => (showInquiryModal = false)}
						>
							Cancel
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
