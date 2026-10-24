// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://2026bdbv.diaphana.io',
	base: '/docs',
	integrations: [
		starlight({
			title: '2026 BDBV outbreak',
			description:
				'Background and references for the 2026 Bundibugyo virus disease (BDBV) outbreak in Africa.',
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
					],
				},
			],
		}),
	],
});
