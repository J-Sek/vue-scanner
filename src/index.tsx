import { Hono } from "hono";
import type { FC } from "hono/jsx";
import { readdir } from "node:fs/promises";
import { firstBy } from "thenby";
import { fullScan } from "./full-scan";
import type { FolderScanItem, ScanItemEntry } from "./types";

import { Database } from "bun:sqlite";

const app = new Hono();
const src = process.env.PROJECT_PATH!;

async function readFolder(path: string): Promise<FolderScanItem[]> {
  const db = new Database("data/db.sqlite");
  const dirents = await readdir(`${src}/${path}`, { withFileTypes: true });

  async function getFolderMigration(dirPath: string, pool: string[]): Promise<number> {
    const dirents = await readdir(`${src}/${dirPath}`, { withFileTypes: true, recursive: true });
    let sum = 0;
    for (let x of dirents) {
      if (x.name.endsWith(".vue")) {
        const table = path.split('/').at(0)!;
        const entry = db.query(`SELECT migrationComplexity, allVuetifyComponents FROM ${table} WHERE path = $path LIMIT 1`).get({ $path: `/${dirPath}/${x.name}` }) as ScanItemEntry;
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
    if (!x.name.endsWith(".vue")) {
      if (x.isDirectory() && /^(components|layouts|pages)/.test(path)) {
        const vuetifyComponentsPool: string[] = [];
        const migrationComplexity = await getFolderMigration(`${path}/${x.name}`, vuetifyComponentsPool);
        results.push({
          name: x.name,
          isVue: false,
          isDirectory: true,
          migrationComplexity,
          vuetifyComponents: vuetifyComponentsPool.filter((n,i,a) => a.indexOf(n) === i).sort(),
        });
      } else if (x.isDirectory()) {
        results.push({
          name: x.name,
          isVue: false,
          isDirectory: true,
        });
      } else {
        results.push({ name: x.name, isVue: false, isDirectory: false });
      }
    } else {
      const table = path.split('/').at(0)!;
      const entry = db.query(`SELECT * FROM ${table} WHERE path = $path LIMIT 1`).get({ $path: `/${path}/${x.name}` }) as ScanItemEntry;
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

const Layout: FC = (props) => {
  return (
    <html>
      <style>{`
        @import url(https://fonts.bunny.net/css?family=syne:400);
        html { font-family: Syne, sans-serif }
        body { background: #151215; color:#ddd }
        li { padding: .5rem 1rem; background: rgba(255,255,255,.05) }
        li + li { border-top: thin solid rgba(255,255,255,.2) }
        pre:first-child { margin: 0 }
        pre { margin: .5rem 0 0; font-family: MonoLisa, monospace }
        code { margin: .5rem 0 0; font-family: MonoLisa, monospace }
        a { color: #3dd7ea }
        a:not(:hover) { text-decoration: none }
      `}</style>
      <body>{props.children}</body>
    </html>
  );
};

const List: FC<{ path: string; files: FolderScanItem[] }> = (props: { path: string; files: FolderScanItem[] }) => {
  return (
    <Layout>
      <h2>{props.path}</h2>
      <ul style='margin-top: 1rem; font-family: "MonoLisa"'>
        {props.files.map((f) =>
          f.isDirectory ? (
            <li>
              <pre><a style={props.path.split("/").length > 6 ? 'color: red' : ''} href={`${props.path.substring(1)}${f.name}`}>{f.name.padEnd(24,' ')}</a><code style='color: yellow; font-weight: bold'>{f.migrationComplexity || ''}</code></pre>
              {!!f.migrationComplexity && (<pre style='opacity: .4'>Vuetify components:     {(f.vuetifyComponents || []).length || '0'}</pre>)}
            </li>
          ) : (
            <li>
              {!f.isVue && (<span style='color: gold'>{f.name}</span>)}
              {f.isVue && (<span style='color: lime'>{f.name}</span>)}
              {f.isVue && (<>
                <pre style={ f.localDependencies.length ? '' : 'opacity: .4' }>Local dependencies:     {f.localDependencies.join(', ') || '-'}</pre>
                <pre style={ f.otherDependencies.length ? '' : 'opacity: .4' }>Other dependencies:     {f.otherDependencies.join(', ') || '-'}</pre>
                <pre style={ f.localImports.length ? '' : 'opacity: .4' }>Local imports:          {f.localImports.join(', ') || '-'}</pre>
                <pre style={ f.vuetifyComponents.length ? '' : 'opacity: .4' }>Vuetify components:     {f.vuetifyComponents.join(', ') || '-'}</pre>
                <pre style={ f.vuetifyDirectives.length ? '' : 'opacity: .4' }>Vuetify directives:     {f.vuetifyDirectives.join(', ') || '-'}</pre>
                <pre>Migration complexity:   <code style='color: yellow; font-weight: bold'>{f.migrationComplexity}</code> <code style='opacity: .4'>&lt;---</code> ( {f.allLocalDependencies!.length} | {f.allOtherDependencies!.length} | {f.allVuetifyComponents!.length} | {f.allVuetifyDirectives!.length} )</pre>
              </>)}
            </li>
          )
        )}
      </ul>
    </Layout>
  );
};

type ReportItem = { name: string, path: string, migrationComplexity: number, migrationValue: number };
const Report: FC<{ title: string; items: ReportItem[] }> = (props: { title: string; items: ReportItem[] }) => {
  return (
    <Layout>
      <h2>{props.title}</h2>
      <ul style='margin-top: 1rem; font-family: "MonoLisa"'>
        {props.items.map((f) =>
          <li>
            <pre><code style='color: lime'>{f.name.padEnd(64,' ')}</code><code style='opacity: .4; font-size: .75em'>{f.path.split('/').slice(2, -1).join('/').padEnd(40, ' ')}</code><code style='color: #34dbcb; font-weight: bold'>{(f.migrationValue.toString() || '').padStart(6, ' ')}</code><code style='color: orange; font-weight: bold'>{(f.migrationComplexity.toString() || '').padStart(24, ' ')}</code></pre>
            {/* <pre style='opacity: .4; font-size: .75em'>{f.path.split('/').slice(2, -1).join('/')}</pre> */}
          </li>
        )}
      </ul>
    </Layout>
  );
};

app.get("/", async (c) => {
  const files = await readFolder("");
  return c.html(<List path={`~/`} files={files} />);
});

app.get("/reports/components", async (c) => {
  const db = new Database("data/db.sqlite");
  const items = db.query(`SELECT name, path, migrationComplexity, migrationValue FROM Components ORDER BY 4 DESC, 3 ASC`).all() as ReportItem[];
  db.close();
  return c.html(<Report title='Components migration value' items={items} />);
});

app.get("/full-scan", async (c) => {
  return c.json(await fullScan());
});

app.get("/:path1", async (c) => {
  const { path1 } = c.req.param();
  const files = await readFolder([path1].join("/"));
  return c.html(<List path={`~/${path1}/`} files={files} />);
});

app.get("/:path1/:path2", async (c) => {
  const { path1, path2 } = c.req.param();
  const files = await readFolder([path1, path2].join("/"));
  return c.html(<List path={`~/${path1}/${path2}/`} files={files} />);
});

app.get("/:path1/:path2/:path3", async (c) => {
  const { path1, path2, path3 } = c.req.param();
  const files = await readFolder([path1, path2, path3].join("/"));
  return c.html(<List path={`~/${path1}/${path2}/${path3}/`} files={files} />);
});

app.get("/:path1/:path2/:path3/:path4", async (c) => {
  const { path1, path2, path3, path4 } = c.req.param();
  const files = await readFolder([path1, path2, path3, path4].join("/"));
  return c.html(<List path={`~/${path1}/${path2}/${path3}/${path4}/`} files={files} />);
});

app.get("/:path1/:path2/:path3/:path4/:path5", async (c) => {
  const { path1, path2, path3, path4, path5 } = c.req.param();
  const files = await readFolder([path1, path2, path3, path4, path5].join("/"));
  return c.html(<List path={`~/${path1}/${path2}/${path3}/${path4}/${path5}/`} files={files} />);
});

export default app;
