import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-threejs.ts';
const sourceRoot = fileURLToPath(new URL('.', import.meta.url));
const destination = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
mkdirSync(destination, { recursive: true });
for (const folder of ['game', 'screenshots']) {
  const target = join(destination, folder);
  rmSync(target, { recursive: true, force: true });
  cpSync(join(sourceRoot, folder), target, { recursive: true });
}
const limits = { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, game_max_files: 993, game_max_bytes: 50331648 };
// The SDK returns the final JSON bytes, so no second serialization belongs here.
writeFileSync(join(destination, 'dossier.json'), buildDossier(destination, limits));
