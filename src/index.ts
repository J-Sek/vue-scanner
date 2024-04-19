import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import explore from "./explore";
import reports from "./reports";
import { fullScan } from "./lib/full-scan";

const app = new Hono();
app.use("/favicon.ico", serveStatic({ path: "./static/favicon.ico" }));

app.get("/", (c) => c.redirect("/explore"));
app.route("/explore", explore);
app.route("/reports", reports);

app.get("/full-scan", async (c) => c.json(await fullScan()));

export default {
  port: 8600,
  fetch: app.fetch,
};
