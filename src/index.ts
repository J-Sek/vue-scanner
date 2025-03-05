import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { parseArgs } from "util";
import open from "open";
import explore from "./explore";
import reports from "./reports";
import { fullScan } from "./lib/full-scan";

const app = new Hono();
app.use("/favicon.ico", serveStatic({ path: "./static/favicon.ico" }));

app.get("/", (c) => c.redirect("/explore"));
app.route("/explore", explore);
app.route("/reports", reports);

app.get("/full-scan", async (c) => c.json(await fullScan()));

const { values: options } = parseArgs({
  args: Bun.argv,
  options: {
    open: {
      type: 'boolean',
    },
    port: {
      type: 'string',
    },
  },
  strict: true,
  allowPositionals: true,
});

const port = options.port ?? 8600

if (options.open) {
  new Promise(r => setTimeout(r, 1000))
    .then(() => open(`http://localhost:${port}`))
}

export default {
  port,
  fetch: app.fetch,
};
