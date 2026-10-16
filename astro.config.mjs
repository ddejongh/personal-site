// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Switch to the custom domain once it's set up.
  site: 'https://personal-site.devindejongh.workers.dev',
  integrations: [sitemap()]
});
