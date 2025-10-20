import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const distDir = resolve(projectRoot, 'dist');
const docsDir = resolve(projectRoot, 'docs');

function ensureDistExists() {
  try {
    const stats = statSync(distDir);
    if (!stats.isDirectory()) {
      throw new Error(`Expected "${distDir}" to be a directory.`);
    }
  } catch (error) {
    throw new Error('The dist directory was not found. Run "vite build" before postbuild.');
  }
}

function cleanDocsDir() {
  rmSync(docsDir, { recursive: true, force: true });
  mkdirSync(docsDir, { recursive: true });
}

function copyDistContents() {
  const entries = readdirSync(distDir);
  for (const entry of entries) {
    const from = resolve(distDir, entry);
    const to = resolve(docsDir, entry);
    cpSync(from, to, { recursive: true, force: true });
  }
}

ensureDistExists();
cleanDocsDir();
copyDistContents();

console.log(`Copied dist contents to ${docsDir}`);
