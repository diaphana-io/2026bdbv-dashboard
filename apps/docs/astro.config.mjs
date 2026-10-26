// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

// https://astro.build/config
export default defineConfig({
	site: 'https://2026bdbv.diaphana.io',
	base: '/docs',
	integrations: [
		// Must come BEFORE starlight so ```mermaid fences are transformed.
		mermaid({
			autoTheme: true,
		}),
		starlight({
			title: '2026 Ebola Outbreak Dashboard',
			description:
				'Background and references for the 2026 Bundibugyo virus disease (BDBV) outbreak in Africa.',
			logo: {
				src: './src/assets/bdbv-favicon.svg',
				alt: '2026 Ebola Outbreak Dashboard',
			},
			favicon: '/favicon.svg',
			customCss: ['./src/styles/custom.css'],
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/diaphana-io/2026bdbv-dashboard',
				},
			],
			sidebar: [
				{
					label: 'Outbreak information',
					items: [
						{ label: 'Overview', slug: 'index' },
						{ label: 'About', slug: 'about' },
						{ label: 'Privacy Policy', slug: 'privacy' },
					],
				},
				{
					label: 'Data',
					items: [
						{ label: 'Data and storage', slug: 'data-and-storage' },
						{ label: 'Database structure', slug: 'database-structure' },
					],
				},
				{
					label: 'Developers',
					items: [{ label: 'Contributing', slug: 'contributing' }],
				},
			],
		}),
	],
});
