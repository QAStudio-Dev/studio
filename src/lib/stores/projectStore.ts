import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface SelectedProject {
	id: string;
	name: string;
	key: string;
}

// Safely load from localStorage with error handling
function loadInitialProject(): SelectedProject | null {
	if (!browser) return null;

	try {
		const storedProject = localStorage.getItem('selectedProject');
		if (!storedProject) return null;

		const parsed = JSON.parse(storedProject);

		// Validate structure
		if (
			parsed &&
			typeof parsed === 'object' &&
			typeof parsed.id === 'string' &&
			typeof parsed.name === 'string' &&
			typeof parsed.key === 'string'
		) {
			return parsed as SelectedProject;
		}

		// Invalid structure - clear it
		localStorage.removeItem('selectedProject');
		return null;
	} catch (error) {
		console.error('Failed to parse stored project, clearing localStorage:', error);
		try {
			localStorage.removeItem('selectedProject');
		} catch {}
		return null;
	}
}

export const selectedProject = writable<SelectedProject | null>(loadInitialProject());

// Trigger to signal that projects list should be refetched
// Incremented whenever projects are created/deleted
export const projectsRefreshTrigger = writable<number>(0);

// Subscribe to save to localStorage
if (browser) {
	selectedProject.subscribe((value) => {
		if (value) {
			localStorage.setItem('selectedProject', JSON.stringify(value));
		} else {
			localStorage.removeItem('selectedProject');
		}
	});
}

export function setSelectedProject(project: SelectedProject | null) {
	selectedProject.set(project);
}

export function clearSelectedProject() {
	selectedProject.set(null);
}

export function triggerProjectsRefresh() {
	projectsRefreshTrigger.update((n) => n + 1);
}
