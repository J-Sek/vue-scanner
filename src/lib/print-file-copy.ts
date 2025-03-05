import { Database } from "bun:sqlite";
import { ScanItemEntry } from "./types";
import kebabCase from "just-kebab-case";

export function printCopyCommand(path: string) {
  const db = new Database("data/db.sqlite");

  const table = path.split('/').at(0)!
  if (!['components', 'layouts', 'pages'].includes(table)) {
    return '... not analyzed ...'
  }

  const entry = db.query(`SELECT * FROM ${table} WHERE path = $path LIMIT 1`)
    .get({ $path: path }) as ScanItemEntry;

  if (!entry) {
    return `... not found in [${table}] ...`
  }

  const depsNames = entry.allLocalDependencies.split(',').map(x => `'${x}'`).join(',')
  const dependencyEntries = db.query(`SELECT * FROM components WHERE kebabName in (${depsNames})`)
    .all() as ScanItemEntry[];

  const directDependencies = dependencyEntries
    .filter(x => entry.localDependencies.split(',').includes(x.kebabName));

  const deepDependencies = dependencyEntries
    .filter(x => !entry.localDependencies.split(',').includes(x.kebabName));

  return [
    '# target',
    printFileCopy(entry.path),
    '# direct dependencies',
    ...directDependencies.map(dep => printFileCopy(dep.path)),
    '# deep dependencies',
    ...deepDependencies.map(dep => printFileCopy(dep.path)),
  ].join('\n')
}

export function printFileCopy(from: string) {
  const parts = from.split('/')
  if (from.endsWith('index.vue')) parts.pop()
  const name = parts.at(-1)
  const to = [...parts.slice(0, -1), `${kebabCase(name!.replace('.vue', ''))}.vue`].join('/')

  return process.env.COPY_TEMPLATE!
    .replace('[[from]]', from)
    .replace('[[to]]', to)
}
