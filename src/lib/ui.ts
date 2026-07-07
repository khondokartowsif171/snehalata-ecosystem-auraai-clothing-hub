import { writable } from 'svelte/store';

// Global UI state shared across components (e.g. the mobile category sheet opened
// from the bottom nav).
export const categorySheetOpen = writable(false);
