import { Hono } from "hono";
import type { FC } from "hono/jsx";
import type { FolderScanItem } from "./lib/types";
import { readFolder } from "./lib/read-folder";
import Layout from "./layouts/default";

const app = new Hono();

const List: FC<{ path: string; files: FolderScanItem[] }> = (props: { path: string; files: FolderScanItem[] }) => {
  return (
    <Layout>
      <h2>{props.path}</h2>
      <ul style='margin-top: 1rem;'>
        {props.files.map((f) =>
          f.isDirectory ? (
            <li>
              <pre><a style={props.path.split("/").length > 6 ? 'color: red' : ''} href={`/explore/${f.fileName}`}>{f.fileName.padEnd(44,' ')}</a><code style='color: yellow; font-weight: bold'>{String(f.migrationComplexity || '').padStart(6,' ')}</code></pre>
              {!!f.migrationComplexity && (<pre style='opacity: .4'>{'Vuetify components:'.padEnd(44,' ')}{String((f.vuetifyComponents || []).length || '0').padStart(6,' ')}</pre>)}
            </li>
          ) : (
            <li>
              {!f.isVue && (<span style='color: gold'>{f.fileName}</span>)}
              {f.isVue && (<span style='color: lime'>{f.fileName}</span>)}
              {f.isVue && (<>
                <pre style={ f.localDependencies.length ? '' : 'opacity: .4' }>Local dependencies:     {f.localDependencies.join(', ') || '-'}</pre>
                <pre style={ f.otherDependencies.length ? '' : 'opacity: .4' }>Other dependencies:     {f.otherDependencies.join(', ') || '-'}</pre>
                <pre style={ f.localImports.length      ? '' : 'opacity: .4' }>Local imports:          {f.localImports.join(', ')      || '-'}</pre>
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

app.get("/", async (c) => {
  const files = await readFolder("");
  return c.html(<List path={`~/`} files={files} />);
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
