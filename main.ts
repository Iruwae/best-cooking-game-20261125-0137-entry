// main.ts — hands Rush Hour Kitchen in: copies game/ and screenshots/ from
// this repository into the output directory, then writes dossier.json with
// buildDossier from vendor/makefun-game.ts. Node standard library only.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || "/output");

const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

function copyTree(name: string): void {
  const src = resolve(repoRoot, name);
  const dst = resolve(outputDir, name);
  if (!existsSync(src)) throw new Error(`missing ${name}/ in ${repoRoot}`);
  cpSync(src, dst, { recursive: true });
}

async function main(): Promise<void> {
  // Start from a clean output directory so a re-run never keeps stale files.
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  // The game and its screenshots go in first; buildDossier reads them back
  // from the output directory.
  copyTree("game");
  copyTree("screenshots");

  const dossier = await buildDossier(outputDir, dossierCaps);
  const bytes = typeof dossier === "string" ? Buffer.from(dossier, "utf8") : dossier;
  writeFileSync(resolve(outputDir, "dossier.json"), bytes);
}

await main();
