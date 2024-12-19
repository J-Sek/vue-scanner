import { readdir } from "node:fs/promises";
import { analyzeFile } from "./file-scanner";
import { ScanItem } from "./types";
import { firstBy } from "thenby";

import { Database } from "bun:sqlite";

const src = process.env.PROJECT_PATH;

const multipliers = {
  localComponents: 5,
  otherComponents: 4,
  frameworkComponents: 3,
  frameworkDirectives: 2,

  dependentComponents: 1,
  dependentLayouts: 3,
  dependentPages: 2
};

function setupDatabase(db: Database) {
  // Helper function to check if a table exists
  function tableExists(tableName: string): boolean {
    const result = db
      .query(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(tableName);
    return !!result; // Returns true if the table exists, false otherwise
  }

  // Drop tables only if they exist
  if (tableExists('Components')) {
    db.query(`DROP TABLE Components`).run();
  }
  if (tableExists('Layouts')) {
    db.query(`DROP TABLE Layouts`).run();
  }
  if (tableExists('Pages')) {
    db.query(`DROP TABLE Pages`).run();
  }

  // Create tables
  db.query(`CREATE TABLE IF NOT EXISTS Components (
    path TEXT PRIMARY KEY,
    fileName TEXT NOT NULL UNIQUE,
    kebabName TEXT NOT NULL,
    localDependencies TEXT,
    otherDependencies TEXT,
    localImports TEXT,
    vuetifyComponents TEXT,
    vuetifyDirectives TEXT,
    allLocalDependencies TEXT,
    allOtherDependencies TEXT,
    allVuetifyComponents TEXT,
    allVuetifyDirectives TEXT,
    migrationComplexity INTEGER,
    migrationValue INTEGER
  )`).run();

  db.query(`CREATE TABLE IF NOT EXISTS Layouts (
    path TEXT PRIMARY KEY,
    fileName TEXT NOT NULL,
    kebabName TEXT NOT NULL,
    localDependencies TEXT,
    otherDependencies TEXT,
    localImports TEXT,
    vuetifyComponents TEXT,
    vuetifyDirectives TEXT,
    allLocalDependencies TEXT,
    allOtherDependencies TEXT,
    allVuetifyComponents TEXT,
    allVuetifyDirectives TEXT,
    migrationComplexity INTEGER
  )`).run();

  db.query(`CREATE TABLE IF NOT EXISTS Pages (
    path TEXT PRIMARY KEY,
    fileName TEXT NOT NULL,
    kebabName TEXT NOT NULL,
    localDependencies TEXT,
    otherDependencies TEXT,
    localImports TEXT,
    vuetifyComponents TEXT,
    vuetifyDirectives TEXT,
    allLocalDependencies TEXT,
    allOtherDependencies TEXT,
    allVuetifyComponents TEXT,
    allVuetifyDirectives TEXT,
    migrationComplexity INTEGER
  )`).run();
}


// --------------------------------------------------------------

export async function fullScan() {

  const components = await findVueFiles('components');
  const layouts = await findVueFiles('layouts');
  const pages = await findVueFiles('pages');

  const db = new Database("data/db.sqlite", { create: true });
  setupDatabase(db);

  analyzePages(db, pages, components);
  analyzeLayouts(db, layouts, components);
  analyzeComponents(db, components, pages, layouts);

  db.close();

  return {
    components: components.length,
    layouts: layouts.length,
    pages: pages.length,
  };
}

async function findVueFiles(dir: string): Promise<ScanItem[]> {
  const dirents = await readdir(`${src}/${dir}`, { withFileTypes: true, recursive: true });
  const results: ScanItem[] = [];
  for (let x of dirents) {
    if (x.name.endsWith(".vue")) {
      const relativePath = x.path.replace(`${src}/`, '') + `/${x.name}`
      results.push(await analyzeFile(src!, relativePath, x.name));
    }
  }
  return results.sort(firstBy(x => x.path));
}

function analyzeComponents(db: Database, components: ScanItem[], pages: ScanItem[], layouts: ScanItem[]) {

  components.forEach(x => {

    x.allLocalDependencies = getAllRecursive(components, [], x, (x: ScanItem) => [...x.localDependencies, ...x.localImports].filter((n,i,a) => a.indexOf(n) === i));
    x.allOtherDependencies = getAllRecursive(components, [], x, (x) => x.otherDependencies);
    x.allVuetifyComponents = getAllRecursive(components, [], x, (x) => x.vuetifyComponents);
    x.allVuetifyDirectives = getAllRecursive(components, [], x, (x) => x.vuetifyDirectives);
    // x.allMissingDependencies = [];

    x.migrationComplexity = 0 /* TODO: add script size / KLOC */
      + x.allLocalDependencies.length * multipliers.localComponents
      + x.allOtherDependencies.length * multipliers.otherComponents
      + x.allVuetifyComponents.length * multipliers.frameworkComponents
      + x.allVuetifyDirectives.length * multipliers.frameworkDirectives;

    const allDependentPages = pages
      .filter(p => p.allLocalDependencies!.includes(x.kebabName))
      .map(x => x.path);

    const allDependentLayouts = layouts
      .filter(p => p.allLocalDependencies!.includes(x.kebabName))
      .map(x => x.path);

    const dependentComponents = components
      .filter(p => p.localDependencies!.includes(x.kebabName) || p.localImports!.includes(x.fileName))
      .map(x => x.path);

    x.migrationValue = 0
      + dependentComponents.length * multipliers.dependentComponents
      + allDependentLayouts.length * multipliers.dependentLayouts
      + allDependentPages.length * multipliers.dependentPages;
  });

  const insertOne = db.prepare(`INSERT INTO Components (path, fileName, kebabName, localDependencies, otherDependencies, localImports, vuetifyComponents, vuetifyDirectives, allLocalDependencies, allOtherDependencies, allVuetifyComponents, allVuetifyDirectives, migrationComplexity, migrationValue) VALUES ($path, $fileName, $kebabName, $localDependencies, $otherDependencies, $localImports, $vuetifyComponents, $vuetifyDirectives, $allLocalDependencies, $allOtherDependencies, $allVuetifyComponents, $allVuetifyDirectives, $migrationComplexity, $migrationValue)`);
  const insertMany = db.transaction(items => { items.forEach((x: any) => insertOne.run(x)); return items.length; });

  db.query(`DELETE FROM Components`).run();
  return insertMany(components.map(x => ({
    $path: x.path,
    $fileName: x.fileName,
    $kebabName: x.kebabName,
    $localDependencies: x.localDependencies.join(','),
    $otherDependencies: x.otherDependencies.join(','),
    $localImports: x.localImports.join(','),
    $vuetifyComponents: x.vuetifyComponents.join(','),
    $vuetifyDirectives: x.vuetifyDirectives.join(','),
    $allLocalDependencies: x.allLocalDependencies!.join(','),
    $allOtherDependencies: x.allOtherDependencies!.join(','),
    $allVuetifyComponents: x.allVuetifyComponents!.join(','),
    $allVuetifyDirectives: x.allVuetifyDirectives!.join(','),
    $migrationComplexity: x.migrationComplexity,
    $migrationValue: x.migrationValue
  })));
}

function analyzeLayouts(db: Database, layouts: ScanItem[], components: ScanItem[]) {
  layouts.forEach(x => {

    x.allLocalDependencies = getAllRecursive(components, [], x, (x) => [...x.localDependencies, ...x.localImports].filter((n,i,a) => a.indexOf(n) === i));
    x.allOtherDependencies = getAllRecursive(components, [], x, (x) => x.otherDependencies);
    x.allVuetifyComponents = getAllRecursive(components, [], x, (x) => x.vuetifyComponents);
    x.allVuetifyDirectives = getAllRecursive(components, [], x, (x) => x.vuetifyDirectives);
    // x.allMissingDependencies = [];

    x.migrationComplexity = 0 /* script size / KLOC */
      + x.allLocalDependencies.length * multipliers.localComponents
      + x.allOtherDependencies.length * multipliers.otherComponents
      + x.allVuetifyComponents.length * multipliers.frameworkComponents
      + x.allVuetifyDirectives.length * multipliers.frameworkDirectives;
  });

  const insertOne = db.prepare(`INSERT INTO Layouts (path, fileName, kebabName, localDependencies, otherDependencies, localImports, vuetifyComponents, vuetifyDirectives, allLocalDependencies, allOtherDependencies, allVuetifyComponents, allVuetifyDirectives, migrationComplexity) VALUES ($path, $fileName, $kebabName, $localDependencies, $otherDependencies, $localImports, $vuetifyComponents, $vuetifyDirectives, $allLocalDependencies, $allOtherDependencies, $allVuetifyComponents, $allVuetifyDirectives, $migrationComplexity)`);
  const insertMany = db.transaction(items => { items.forEach((x: any) => insertOne.run(x)); return items.length; });

  db.query(`DELETE FROM layouts`).run();
  return insertMany(layouts.map(x => ({
    $path: x.path,
    $fileName: x.fileName,
    $kebabName: x.kebabName,
    $localDependencies: x.localDependencies.join(','),
    $otherDependencies: x.otherDependencies.join(','),
    $localImports: x.localImports.join(','),
    $vuetifyComponents: x.vuetifyComponents.join(','),
    $vuetifyDirectives: x.vuetifyDirectives.join(','),
    $allLocalDependencies: x.allLocalDependencies!.join(','),
    $allOtherDependencies: x.allOtherDependencies!.join(','),
    $allVuetifyComponents: x.allVuetifyComponents!.join(','),
    $allVuetifyDirectives: x.allVuetifyDirectives!.join(','),
    $migrationComplexity: x.migrationComplexity
  })));
}

function analyzePages(db: Database, pages: ScanItem[], components: ScanItem[]) {
  pages.forEach(x => {

    x.allLocalDependencies = getAllRecursive(components, [], x, (x) => [...x.localDependencies, ...x.localImports].filter((n,i,a) => a.indexOf(n) === i));
    x.allOtherDependencies = getAllRecursive(components, [], x, (x) => x.otherDependencies);
    x.allVuetifyComponents = getAllRecursive(components, [], x, (x) => x.vuetifyComponents);
    x.allVuetifyDirectives = getAllRecursive(components, [], x, (x) => x.vuetifyDirectives);
    // x.allMissingDependencies = [];

    x.migrationComplexity = 0 /* script size / KLOC */
      + x.allLocalDependencies.length * multipliers.localComponents
      + x.allOtherDependencies.length * multipliers.otherComponents
      + x.allVuetifyComponents.length * multipliers.frameworkComponents
      + x.allVuetifyDirectives.length * multipliers.frameworkDirectives;
  });

  const insertOne = db.prepare(`INSERT INTO Pages (path, fileName, kebabName, localDependencies, otherDependencies, localImports, vuetifyComponents, vuetifyDirectives, allLocalDependencies, allOtherDependencies, allVuetifyComponents, allVuetifyDirectives, migrationComplexity) VALUES ($path, $fileName, $kebabName, $localDependencies, $otherDependencies, $localImports, $vuetifyComponents, $vuetifyDirectives, $allLocalDependencies, $allOtherDependencies, $allVuetifyComponents, $allVuetifyDirectives, $migrationComplexity)`);
  const insertMany = db.transaction(items => { items.forEach((x: any) => insertOne.run(x)); return items.length; });

  db.query(`DELETE FROM pages`).run();
  return insertMany(pages.map(x => ({
    $path: x.path,
    $fileName: x.fileName,
    $kebabName: x.kebabName,
    $localDependencies: x.localDependencies.join(','),
    $otherDependencies: x.otherDependencies.join(','),
    $localImports: x.localImports.join(','),
    $vuetifyComponents: x.vuetifyComponents.join(','),
    $vuetifyDirectives: x.vuetifyDirectives.join(','),
    $allLocalDependencies: x.allLocalDependencies!.join(','),
    $allOtherDependencies: x.allOtherDependencies!.join(','),
    $allVuetifyComponents: x.allVuetifyComponents!.join(','),
    $allVuetifyDirectives: x.allVuetifyDirectives!.join(','),
    $migrationComplexity: x.migrationComplexity
  })));
}

function getAllRecursive(components: ScanItem[], pool: string[], item: ScanItem, selector: (s: ScanItem) => string[], visitedComponents: string[] = []) {
  for (const i of selector(item)) {
    if (!pool.includes(i)) {
      pool.push(i);
    }
  }
  const getDependencies = (x: ScanItem) => [...x.localDependencies, ...x.localImports].filter((n,i,a) => a.indexOf(n) === i);
  for (const dependencyName of getDependencies(item)) {
    const dependencyItem = components.find(x => x.kebabName === dependencyName);
    if (dependencyItem && !visitedComponents.includes(dependencyName)) {
      visitedComponents.push(dependencyName);
      getAllRecursive(components, pool, dependencyItem, selector, visitedComponents);
    }
  }
  return pool.filter((n,i,a) => a.indexOf(n) === i);
}
