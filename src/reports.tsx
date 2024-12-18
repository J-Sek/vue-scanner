import { Hono } from "hono";
import type { FC } from "hono/jsx";
import Layout from "./layouts/default";

import { Database } from "bun:sqlite";

type ReportItem = { fileName: string, path: string, migrationComplexity: number, migrationValue: number };
const Report: FC<{ title: string; items: ReportItem[] }> = (props: { title: string; items: ReportItem[] }) => {
  return (
    <Layout>
      <ul style='margin-top: 1rem;'>
        <li style='background: transparent; opacity: .4'>
            <pre><code>{'Component'.padEnd(64,' ')}</code><code>{'Directory'.padEnd(20, ' ')}</code><code>{'Migration Value'.padStart(21, ' ')}</code><code>{'Complexity'.padStart(24, ' ')}</code></pre>
        </li>
        {props.items.map((f) =>
          <li>
            <pre><code style='color: lime'>{f.fileName.padEnd(64,' ')}</code><code style='opacity: .4; font-size: 14px'>{f.path.split('/').slice(2, -1).join('/').padEnd(40, ' ')}</code><code style='color: #34dbcb; font-weight: bold'>{(f.migrationValue.toString() || '').padStart(6, ' ')}</code><code style='color: orange; font-weight: bold'>{(f.migrationComplexity.toString() || '').padStart(24, ' ')}</code></pre>
          </li>
        )}
      </ul>
    </Layout>
  );
};

const app = new Hono();

app.get("/components", async (c) => {
  const db = new Database("data/db.sqlite");
  const items = db.query(`SELECT fileName, path, migrationComplexity, migrationValue FROM Components ORDER BY 4 DESC, 3 ASC`).all() as ReportItem[];
  db.close();
  return c.html(<Report title='Components migration value' items={items} />);
});

export default app;
