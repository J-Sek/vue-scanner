import { Hono } from "hono";
import { readdir } from "node:fs/promises";
import { analyzeFile } from "./file-scanner";
import { ScanItem } from "./types";
import { firstBy } from "thenby";

import { Database } from "bun:sqlite";
const db = new Database("data/db.sqlite", { create: true });

const app = new Hono();
const src = process.env.PROJECT_PATH;

export async function fullScan(baseDir: string) {
  let totalVueFiles = 0;
  const componentsDirents = await readdir(`${baseDir}/components`, { withFileTypes: true, recursive: true });

  const results: ScanItem[] = [];
  for (let x of componentsDirents) {
    if (x.name.endsWith(".vue")) {
      results.push(await analyzeFile(baseDir, `/components/${x.name}`, x.name));
      totalVueFiles++;
    }
  }
  results.sort(firstBy(x => x.path));

  // TODO: add components to database

  // -> query database to determine total dependencies each file
  // -> sort pages by migration compexity (incl. script size / KLOC)
  // -> sort components by migration value

  let totalPages = 0;
  const pagesDirents = await readdir(`${baseDir}/pages`, { withFileTypes: true, recursive: true });

  for (let x of pagesDirents) {
    if (x.name.endsWith(".vue")) {
      results.push(await analyzeFile(baseDir, `/pages/${x.name}`, x.name));
      totalPages++;
    }
  }

  return { totalVueFiles, totalPages };
}

app.get("/full-scan", async (c) => {
  return c.json(await fullScan(src as string));
});

export default app;
