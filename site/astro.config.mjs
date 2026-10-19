// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';

// The build shown in the footer, so the live site says which commit it was built from.
// GitHub Actions sets GITHUB_RUN_NUMBER (counts up with every deploy run) and GITHUB_SHA;
// a local build has no build number ("dev") and asks git for the commit.
const gitSha = () => {
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
};
const BUILD_NUMBER = process.env.GITHUB_RUN_NUMBER || 'dev';
const BUILD_SHA = (process.env.GITHUB_SHA || gitSha()).slice(0, 7) || 'dev';
const BUILD_TIME = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

// When deploying, set `site` to the public URL. Left unset for local development.
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    define: {
      __BUILD_NUMBER__: JSON.stringify(BUILD_NUMBER),
      __BUILD_SHA__: JSON.stringify(BUILD_SHA),
      __BUILD_TIME__: JSON.stringify(BUILD_TIME),
    },
  },
});
