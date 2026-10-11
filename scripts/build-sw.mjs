import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const outputDirectory = fileURLToPath(new URL('../dist/', import.meta.url));

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  }));
  return files.flat();
}

const files = (await listFiles(outputDirectory))
  .filter((path) => relative(outputDirectory, path) !== 'sw.js')
  .sort();
const hash = createHash('sha256');
for (const file of files) {
  hash.update(relative(outputDirectory, file));
  hash.update(await readFile(file));
}
const assets = files.map((file) => '/' + relative(outputDirectory, file).replaceAll('\\', '/'));
const cacheName = 'todo-offline-' + hash.digest('hex').slice(0, 16);

const worker = `
const CACHE_NAME = ${JSON.stringify(cacheName)};
const ASSETS = ${JSON.stringify(assets)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith('todo-offline-') && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) return response;
      } catch {
        // Use the installed app shell when the network is unavailable.
      }
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/index.html');
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    return cached || fetch(request);
  })());
});
`;

await writeFile(join(outputDirectory, 'sw.js'), worker);
console.log(`Offline: cached ${assets.length} app files (${cacheName}).`);
