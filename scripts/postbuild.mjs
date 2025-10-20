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

function copyRootPNGsToDist() {
  const pngFiles = Array.from({ length: 6 }, (_, index) => `${String(index + 1).padStart(2, '0')}.png`);
  for (const fileName of pngFiles) {
    const sourcePath = resolve(projectRoot, fileName);
    const destinationPath = resolve(distDir, fileName);

    try {
      const stats = statSync(sourcePath);
      if (!stats.isFile()) {
        console.warn(`Skipping ${fileName} because it is not a file.`);
        continue;
      }
      cpSync(sourcePath, destinationPath, { force: true });
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        console.warn(`Could not find ${fileName} in project root. Skipping.`);
      } else {
        throw error;
      }
    }
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
copyRootPNGsToDist();
cleanDocsDir();
copyDistContents();

console.log(`Copied dist contents to ${docsDir}`);
