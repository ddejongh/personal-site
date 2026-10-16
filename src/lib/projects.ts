import { getCollection } from 'astro:content';

export async function getProjects() {
	const projects = await getCollection('projects', (project) => !project.data.draft);
	return projects.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
