import { Hono } from "hono";
import { readdir } from "node:fs/promises";
import { analyzeFile } from "./file-scanner";
import { ScanItem } from "./types";
import { firstBy } from "thenby";

import { Database } from "bun:sqlite";

const src = process.env.PROJECT_PATH;

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
    vuetifyDirectives TEXT
  )`).run();

  // db.query(`DROP TABLE Layouts`).run();
  db.query(`CREATE TABLE IF NOT EXISTS Layouts (
    path TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    localDependencies TEXT,
    otherDependencies TEXT,
    localImports TEXT,
    vuetifyComponents TEXT,
    vuetifyDirectives TEXT
  )`).run();

  // db.query(`DROP TABLE Pages`).run();
  db.query(`CREATE TABLE IF NOT EXISTS Pages (
    path TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    localDependencies TEXT,
    otherDependencies TEXT,
    localImports TEXT,
    vuetifyComponents TEXT,
    vuetifyDirectives TEXT
  )`).run();
}

// --------------------------------------------------------------

export async function fullScan() {
  const db = new Database("data/db.sqlite", { create: true });
  setupDatabase(db);

  const totalVueFiles = await scanComponents(db);
  const totalLayouts = await scanLayouts(db);
  const totalPages = await scanPages(db);

  // -> query database to determine total dependencies each file
  // -> sort pages by migration compexity (incl. script size / KLOC)
  // -> sort components by migration value
  db.close();

  return { totalVueFiles, totalLayouts, totalPages };
}

async function scanComponents(db: Database) {
  const dirents = await readdir(`${src}/components`, { withFileTypes: true, recursive: true });

  const results: ScanItem[] = [];
  for (let x of dirents) {
    if (x.name.endsWith(".vue")) {
      results.push(await analyzeFile(src!, `/components/${x.name}`, x.name));
    }
  }
  results.sort(firstBy(x => x.path));

  const insertOne = db.prepare("INSERT INTO Components (path, name, localDependencies, otherDependencies, localImports, vuetifyComponents, vuetifyDirectives) VALUES ($path, $name, $localDependencies, $otherDependencies, $localImports, $vuetifyComponents, $vuetifyDirectives)");
  const insertMany = db.transaction(items => { items.forEach((x: any) => insertOne.run(x)); return items.length; });

  db.query(`DELETE FROM Components`).run();
  return insertMany(results.map(x => ({
    $name: x.name,
    $path: x.path,
    $localDependencies: x.localDependencies.join(','),
    $otherDependencies: x.otherDependencies.join(','),
    $localImports: x.localImports.join(','),
    $vuetifyComponents: x.vuetifyComponents.join(','),
    $vuetifyDirectives: x.vuetifyDirectives.join(','),
  })));
}

async function scanLayouts(db: Database) {
  const dirents = await readdir(`${src}/layouts`, { withFileTypes: true, recursive: true });

  const results: ScanItem[] = [];
  for (let x of dirents) {
    if (x.name.endsWith(".vue")) {
      results.push(await analyzeFile(src!, `/layouts/${x.name}`, x.name));
    }
  }
  results.sort(firstBy(x => x.path));

  const insertOne = db.prepare("INSERT INTO Layouts (path, name, localDependencies, otherDependencies, localImports, vuetifyComponents, vuetifyDirectives) VALUES ($path, $name, $localDependencies, $otherDependencies, $localImports, $vuetifyComponents, $vuetifyDirectives)");
  const insertMany = db.transaction(items => { items.forEach((x: any) => insertOne.run(x)); return items.length; });

  db.query(`DELETE FROM layouts`).run();
  return insertMany(results.map(x => ({
    $path: x.path,
    $name: x.name,
    $localDependencies: x.localDependencies.join(','),
    $otherDependencies: x.otherDependencies.join(','),
    $localImports: x.localImports.join(','),
    $vuetifyComponents: x.vuetifyComponents.join(','),
    $vuetifyDirectives: x.vuetifyDirectives.join(','),
  })));
}

async function scanPages(db: Database) {
  const dirents = await readdir(`${src}/pages`, { withFileTypes: true, recursive: true });

  const results: ScanItem[] = [];
  for (let x of dirents) {
    if (x.name.endsWith(".vue")) {
      results.push(await analyzeFile(src!, `/pages/${x.name}`, x.name));
    }
  }
  results.sort(firstBy(x => x.path));

  const insertOne = db.prepare("INSERT INTO Pages (path, name, localDependencies, otherDependencies, localImports, vuetifyComponents, vuetifyDirectives) VALUES ($path, $name, $localDependencies, $otherDependencies, $localImports, $vuetifyComponents, $vuetifyDirectives)");
  const insertMany = db.transaction(items => { items.forEach((x: any) => insertOne.run(x)); return items.length; });

  db.query(`DELETE FROM pages`).run();
  return insertMany(results.map(x => ({
    $path: x.path,
    $name: x.name,
    $localDependencies: x.localDependencies.join(','),
    $otherDependencies: x.otherDependencies.join(','),
    $localImports: x.localImports.join(','),
    $vuetifyComponents: x.vuetifyComponents.join(','),
    $vuetifyDirectives: x.vuetifyDirectives.join(','),
  })));
}

