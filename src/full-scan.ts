import { Hono } from "hono";
import { readdir } from "node:fs/promises";
import { analyzeFile } from "./file-scanner";
import { ScanItem } from "./types";
import { firstBy } from "thenby";

import { Database } from "bun:sqlite";

const src = process.env.PROJECT_PATH;

const multipiers = {
  localComponents: 5,
  otherComponents: 4,
  frameworkComponents: 3,
  frameworkDirectives: 2
};

const app = new Hono();
app.get("/full-scan", async (c) => c.json(await fullScan()));
export default app;

// --------------------------------------------------------------

function setupDatabase(db: Database) {
  // db.query(`DROP TABLE Components`).run();
  db.query(`CREATE TABLE IF NOT EXISTS Components (
    path TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,

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

  // db.query(`DROP TABLE Layouts`).run();
  db.query(`CREATE TABLE IF NOT EXISTS Layouts (
    path TEXT PRIMARY KEY,
    name TEXT NOT NULL,

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

  // db.query(`DROP TABLE Pages`).run();
  db.query(`CREATE TABLE IF NOT EXISTS Pages (
    path TEXT PRIMARY KEY,
    name TEXT NOT NULL,

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

  analyzeComponents(db, components, pages);
  analyzeLayouts(db, layouts, components);
  analyzePages(db, pages, components);

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
      results.push(await analyzeFile(src!, `/${dir}/${x.name}`, x.name));
    }
  }
  return results.sort(firstBy(x => x.path));
}

function analyzeComponents(db: Database, components: ScanItem[], pages: ScanItem[]) {

  components.forEach(x => {

    x.allLocalDependencies = getAllRecursive(components, [], x, (x: ScanItem) => [...x.localDependencies, ...x.localImports].filter((n,i,a) => a.indexOf(n) === i));
    x.allOtherDependencies = getAllRecursive(components, [], x, (x) => x.otherDependencies);
    x.allVuetifyComponents = getAllRecursive(components, [], x, (x) => x.vuetifyComponents);
    x.allVuetifyDirectives = getAllRecursive(components, [], x, (x) => x.vuetifyDirectives);
    // x.allMissingDependencies = [];

    x.migrationComplexity = 0 /* script size / KLOC */
      + x.allLocalDependencies.length * multipiers.localComponents
      + x.allOtherDependencies.length * multipiers.otherComponents
      + x.allVuetifyComponents.length * multipiers.frameworkComponents
      + x.allVuetifyDirectives.length * multipiers.frameworkDirectives;
    x.migrationValue = 0;
      // + x.allDependentComponents.length * 3
      // + x.allDependentPages.length * 5;
  });

  const insertOne = db.prepare("INSERT INTO Components (path, name, localDependencies, otherDependencies, localImports, vuetifyComponents, vuetifyDirectives, allLocalDependencies, allOtherDependencies, allVuetifyComponents, allVuetifyDirectives, migrationComplexity, migrationValue) VALUES ($path, $name, $localDependencies, $otherDependencies, $localImports, $vuetifyComponents, $vuetifyDirectives, $allLocalDependencies, $allOtherDependencies, $allVuetifyComponents, $allVuetifyDirectives, $migrationComplexity, $migrationValue)");
  const insertMany = db.transaction(items => { items.forEach((x: any) => insertOne.run(x)); return items.length; });

  db.query(`DELETE FROM Components`).run();
  return insertMany(components.map(x => ({
    $name: x.name,
    $path: x.path,
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
      + x.allLocalDependencies.length * multipiers.localComponents
      + x.allOtherDependencies.length * multipiers.otherComponents
      + x.allVuetifyComponents.length * multipiers.frameworkComponents
      + x.allVuetifyDirectives.length * multipiers.frameworkDirectives;
  });

  const insertOne = db.prepare("INSERT INTO Layouts (path, name, localDependencies, otherDependencies, localImports, vuetifyComponents, vuetifyDirectives, allLocalDependencies, allOtherDependencies, allVuetifyComponents, allVuetifyDirectives, migrationComplexity) VALUES ($path, $name, $localDependencies, $otherDependencies, $localImports, $vuetifyComponents, $vuetifyDirectives, $allLocalDependencies, $allOtherDependencies, $allVuetifyComponents, $allVuetifyDirectives, $migrationComplexity)");
  const insertMany = db.transaction(items => { items.forEach((x: any) => insertOne.run(x)); return items.length; });

  db.query(`DELETE FROM layouts`).run();
  return insertMany(layouts.map(x => ({
    $path: x.path,
    $name: x.name,
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
      + x.allLocalDependencies.length * multipiers.localComponents
      + x.allOtherDependencies.length * multipiers.otherComponents
      + x.allVuetifyComponents.length * multipiers.frameworkComponents
      + x.allVuetifyDirectives.length * multipiers.frameworkDirectives;
  });

  const insertOne = db.prepare("INSERT INTO Pages (path, name, localDependencies, otherDependencies, localImports, vuetifyComponents, vuetifyDirectives, allLocalDependencies, allOtherDependencies, allVuetifyComponents, allVuetifyDirectives, migrationComplexity) VALUES ($path, $name, $localDependencies, $otherDependencies, $localImports, $vuetifyComponents, $vuetifyDirectives, $allLocalDependencies, $allOtherDependencies, $allVuetifyComponents, $allVuetifyDirectives, $migrationComplexity)");
  const insertMany = db.transaction(items => { items.forEach((x: any) => insertOne.run(x)); return items.length; });

  db.query(`DELETE FROM pages`).run();
  return insertMany(pages.map(x => ({
    $path: x.path,
    $name: x.name,
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
    const dependencyItem = components.find(x => x.name === dependencyName);
    if (dependencyItem && !visitedComponents.includes(dependencyName)) {
      visitedComponents.push(dependencyName);
      getAllRecursive(components, pool, dependencyItem, selector, visitedComponents);
    }
  }
  return pool.filter((n,i,a) => a.indexOf(n) === i);
}
