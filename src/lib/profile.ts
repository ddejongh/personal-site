import { getEntry } from 'astro:content';

export async function getProfile() {
	const entry = await getEntry('profile', 'me');
	if (!entry) throw new Error('Missing profile entry "me" in src/content/profile.json');
	return entry.data;
}

const monthYear = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export function formatRange(start: Date, end?: Date) {
	return `${monthYear.format(start)} – ${end ? monthYear.format(end) : 'Present'}`;
}
