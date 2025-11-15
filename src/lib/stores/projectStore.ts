import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface SelectedProject {
	id: string;
	name: string;
	key: string;
}

// Load from localStorage if in browser
const storedProject = browser ? localStorage.getItem('selectedProject') : null;
const initialProject: SelectedProject | null = storedProject ? JSON.parse(storedProject) : null;

export const selectedProject = writable<SelectedProject | null>(initialProject);

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
