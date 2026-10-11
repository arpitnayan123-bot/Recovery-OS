/**
 * Recovery OS — embedded PostgreSQL bootstrap (sandbox/dev).
 * Starts a REAL PostgreSQL 18 server (zonky binaries, no root required)
 * listening on 127.0.0.1:5432, data dir inside the project.
 *
 * Idempotent: safe to run repeatedly. Leaves the postmaster running
 * (persistent: true) so the Next.js dev server / prisma CLI can connect.
 */
import EmbeddedPostgres from "embedded-postgres";
import net from "node:net";
import path from "node:path";
import fs from "node:fs";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_DIR = process.env.PGDATA_DIR ?? path.join(ROOT, "db", "pgdata");
const PORT = Number(process.env.PGPORT ?? 5432);
const DB_NAME = process.env.PGDATABASE ?? "recovery_os";
const USER = "recovery_os";
const PASSWORD = "recovery_os";

function canConnect(port) {
  return new Promise((resolve) => {
    const s = net.connect({ host: "127.0.0.1", port, timeout: 1500 });
    s.once("connect", () => { s.destroy(); resolve(true); });
    s.once("error", () => resolve(false));
    s.once("timeout", () => { s.destroy(); resolve(false); });
  });
}

async function main() {
  const up = await canConnect(PORT);
  if (up) {
    console.log(`[pg] PostgreSQL already listening on 127.0.0.1:${PORT} — nothing to do.`);
    return;
  }

  const initialised = fs.existsSync(path.join(DATA_DIR, "PG_VERSION"));
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
    onLog: () => {},
    onError: (m) => console.error("[pg]", String(m).slice(0, 300)),
  });

  if (!initialised) {
    console.log("[pg] initialising data dir at", DATA_DIR);
    await pg.initialise();
  }
  console.log("[pg] starting postmaster…");
  await pg.start();
  // postmaster is detached by embedded-postgres when persistent; wait for socket
  for (let i = 0; i < 60; i++) {
    if (await canConnect(PORT)) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  try {
    await pg.createDatabase(DB_NAME);
    console.log(`[pg] database "${DB_NAME}" created`);
  } catch (e) {
    if (!String(e).includes("already exists")) throw e;
    console.log(`[pg] database "${DB_NAME}" already exists`);
  }
  console.log(`[pg] ready: postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DB_NAME}`);
}

main().catch((e) => {
  console.error("[pg] FAILED:", e?.message ?? e);
  process.exit(1);
});
