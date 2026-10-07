import { buildGame, createGameServer } from '@rarefriends/friendsdk/build';
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const directory = path.dirname(fileURLToPath(import.meta.url));
export async function buildPlatform(outdir = path.join(directory, '.friendsdk')) {
  // Use the public v0.2 runner for child/CSP, assets and Nakama server.js.
  // Its stock host is GameHost; replace only the trusted host entry with ConnectedGameHost chrome=none.
  const result = await buildGame(directory, { outdir });
  await build({ entryPoints: [path.join(directory, 'host.tsx')], absWorkingDir: directory,
    bundle: true, platform: 'browser', format: 'esm', target: 'es2022', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' }, outfile: path.join(outdir, 'runtime.js') });
  // Some runner versions emit a runtime.css link only when their own host imports CSS.
  const html = await readFile(path.join(outdir, 'index.html'), 'utf8');
  if (!html.includes('runtime.css')) await writeFile(path.join(outdir, 'index.html'), html.replace('</head>', '<link rel="stylesheet" href="./runtime.css"></head>'));
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] ?? 'build';
  if (!['build', 'dev'].includes(command)) throw Error('Use build or dev. Platform manifest is not a ChanceGame --deployment.');
  const result = await buildPlatform();
  if (command === 'dev') {
    const server = createGameServer(result.outdir);
    server.listen(4173, '127.0.0.1', () => console.log('Platform preview (no transactions): http://127.0.0.1:4173'));
    const close = () => server.close(() => process.exit(0)); process.on('SIGINT', close); process.on('SIGTERM', close);
  } else console.log('Built platform preview + Nakama server.js: ' + result.outdir);
}
