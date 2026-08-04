// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// When deploying, set `site` to the public URL (e.g. https://dnd35.example.com).
// Left unset for local development.
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
