import { Hono } from "hono";
import type { FC } from "hono/jsx";
import { readdir } from "node:fs/promises";
import { firstBy } from "thenby";
import { fullScan } from "./full-scan";
import { analyzeFile } from "./file-scanner";
import type { FolderScanItem } from "./types";

// const db = new Database(":memory:");

const app = new Hono();
const src = process.env.PROJECT_PATH!;

async function readFolder(path: string): Promise<FolderScanItem[]> {
  const dirents = await readdir(`${src}/${path}`, { withFileTypes: true });
  const results: FolderScanItem[] = [];
  for (let x of dirents) {
    if (!x.name.endsWith(".vue")) {
      results.push({ name: x.name, isDirectory: x.isDirectory(), isVue: false });
    } else {
      results.push({
        isDirectory: false, isVue: true,
        ...await analyzeFile(src, `${path}/${x.name}`, x.name)
      });
    }
  }
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
        pre { margin: .5rem 0 0; font-family: MonoLisa, monospace }
        a { color: #27e }
        a:not(:hover) { text-decoration: none }
      `}</style>
      <body>{props.children}</body>
    </html>
  );
};

const List: FC<{ path: string; files: FolderScanItem[] }> = (props: {
  path: string;
  files: FolderScanItem[];
}) => {
  return (
    <Layout>
      <h2>{props.path}</h2>
      <ul style='margin-top: 1rem; font-family: "MonoLisa"'>
        {props.files.map((f) =>
          f.isDirectory ? (
            <li>
              <a style={props.path.split("/").length > 6 ? 'color: red' : ''} href={`${props.path.substring(1)}${f.name}`}>{f.name}</a>
            </li>
          ) : (
            <li>
              {!f.isVue && (<span style='color: gold'>{f.name}</span>)}
              {f.isVue && (<span style='color: lime'>{f.name}</span>)}
              {f.isVue && (<>
                {(f.localDependencies.length || '') && (<pre>Local dependencies:  {f.localDependencies.join(', ')}</pre>)}
                {(f.otherDependencies.length || '') && (<pre>Other dependencies:  {f.otherDependencies.join(', ')}</pre>)}
                {(f.localImports.length      || '') && (<pre>Local imports:       {f.localImports.join(', ')}</pre>)}
                {(f.vuetifyComponents.length || '') && (<pre>Vuetify components:  {f.vuetifyComponents.join(', ')}</pre>)}
                {(f.vuetifyDirectives.length || '') && (<pre>Vuetify directives:  {f.vuetifyDirectives.join(', ')}</pre>)}
              </>)}
            </li>
          )
        )}
      </ul>
    </Layout>
  );
};

app.get("/", async (c) => {
  const files = await readFolder(src as string);
  return c.html(<List path={`~/`} files={files} />);
});

// app.get("/full-scan", async (c) => {
//   return c.json(await fullScan(src as string));
// });

app.get("/:path1", async (c) => {
  const { path1 } = c.req.param();
  const fullPath = [path1].join("/");
  const files = await readFolder(fullPath);
  return c.html(<List path={`~/${path1}/`} files={files} />);
});

app.get("/:path1/:path2", async (c) => {
  const { path1, path2 } = c.req.param();
  const fullPath = [path1, path2].join("/");
  const files = await readFolder(fullPath);
  return c.html(<List path={`~/${path1}/${path2}/`} files={files} />);
});

app.get("/:path1/:path2/:path3", async (c) => {
  const { path1, path2, path3 } = c.req.param();
  const fullPath = [path1, path2, path3].join("/");
  const files = await readFolder(fullPath);
  return c.html(<List path={`~/${path1}/${path2}/${path3}/`} files={files} />);
});

app.get("/:path1/:path2/:path3/:path4", async (c) => {
  const { path1, path2, path3, path4 } = c.req.param();
  const fullPath = [path1, path2, path3, path4].join("/");
  const files = await readFolder(fullPath);
  return c.html(<List path={`~/${path1}/${path2}/${path3}/${path4}/`} files={files} />);
});

app.get("/:path1/:path2/:path3/:path4/:path5", async (c) => {
  const { path1, path2, path3, path4, path5 } = c.req.param();
  const fullPath = [path1, path2, path3, path4, path5].join("/");
  const files = await readFolder(fullPath);
  return c.html(<List path={`~/${path1}/${path2}/${path3}/${path4}/${path5}/`} files={files} />);
});

export default app;
