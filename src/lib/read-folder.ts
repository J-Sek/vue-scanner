import { readdir } from "node:fs/promises";
import { firstBy } from "thenby";
import type { FolderScanItem, ScanItemEntry } from "./types";

import { Database } from "bun:sqlite";

const src = process.env.PROJECT_PATH;

export async function readFolder(path: string): Promise<FolderScanItem[]> {
  const db = new Database("data/db.sqlite");
  const dirents = await readdir(`${src}/${path}`, { withFileTypes: true });

  async function getFolderMigration(dirPath: string, pool: string[]): Promise<number> {
    const dirents = await readdir(`${src}/${dirPath}`, { withFileTypes: true, recursive: true });
    let sum = 0;
    for (let x of dirents) {
      const relativePath = x.path.replace(`${src}/`, '') + `/${x.name}`
      if (x.name.endsWith(".vue")) {
        const table = path.split('/').at(0)!;
        const entry = db.query(`SELECT migrationComplexity, allVuetifyComponents FROM ${table} WHERE path = $path LIMIT 1`).get({ $path: relativePath }) as ScanItemEntry;
        if (entry) {
          sum += entry.migrationComplexity ?? 0;
          pool.push(...entry.allVuetifyComponents.split(','));
        }
      }
    }
    return sum;
  }

  const results: FolderScanItem[] = [];
  for (let x of dirents) {
    const relativePath = (x.path.replace(`${src}/`, '') + `/${x.name}`).replace(/^\//, '')
    if (!x.name.endsWith(".vue")) {
      if (x.isDirectory() && /^(components|layouts|pages)/.test(path)) {
        const vuetifyComponentsPool: string[] = [];
        const migrationComplexity = await getFolderMigration(relativePath, vuetifyComponentsPool);
        results.push({
          name: relativePath,
          isVue: false,
          isDirectory: true,
          migrationComplexity,
          vuetifyComponents: vuetifyComponentsPool.filter((n,i,a) => a.indexOf(n) === i).sort(),
        });
      } else if (x.isDirectory()) {
        results.push({
          name: relativePath,
          isVue: false,
          isDirectory: true,
        });
      } else {
        results.push({ name: relativePath, isVue: false, isDirectory: false });
      }
    } else {
      const table = path.split('/').at(0)!;
      if (!['components', 'layouts', 'pages'].includes(table)) {
        break; // bail for vue files outside of scan scope, e.g. app.vue
      }
      const entry = db.query(`SELECT * FROM ${table} WHERE path = $path LIMIT 1`).get({ $path: relativePath }) as ScanItemEntry;
      if (!entry) {
        throw new Error('Missing entry for path: ' + relativePath)
      }
      results.push({
        isDirectory: false,
        isVue: true,
        path: entry.path,
        name: entry.name,
        localDependencies: entry.localDependencies.split(',').filter(x => !!x),
        otherDependencies: entry.otherDependencies.split(',').filter(x => !!x),
        localImports: entry.localImports.split(',').filter(x => !!x),
        vuetifyComponents: entry.vuetifyComponents.split(',').filter(x => !!x),
        vuetifyDirectives: entry.vuetifyDirectives.split(',').filter(x => !!x),

        allLocalDependencies: entry.allLocalDependencies.split(',').filter(x => !!x),
        allOtherDependencies: entry.allOtherDependencies.split(',').filter(x => !!x),
        allVuetifyComponents: entry.allVuetifyComponents.split(',').filter(x => !!x),
        allVuetifyDirectives: entry.allVuetifyDirectives.split(',').filter(x => !!x),

        migrationComplexity: entry.migrationComplexity,
        migrationValue: entry.migrationValue,
      });
    }
  }

  db.close();

  return results.sort(
    firstBy((x: FolderScanItem) => x.isDirectory, "desc")
    .thenBy((x: FolderScanItem) => x.name.startsWith("."), "desc")
    .thenBy((x) => x.name));
}