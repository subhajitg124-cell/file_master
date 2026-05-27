import app from "./app";
import { logger } from "./lib/logger";
import { cleanupOldFiles } from "./utils/cleanup";
import os from "os";
import path from "path";

// ── Startup environment checks ────────────────────────────────────────────────
if (!process.env["DATABASE_URL"]) {
  logger.warn(
    "DATABASE_URL env var is not set. " +
      "The API server will start but any database calls will fail. " +
      "Set DATABASE_URL in Replit Secrets.",
  );
}

// ── Scheduled temp-file cleanup (every 5 minutes) ────────────────────────────
const TMP_DIR = path.join(os.tmpdir(), "file-master");
setInterval(() => {
  cleanupOldFiles(TMP_DIR, 10 * 60 * 1000).catch(() => {
    // Ignore cleanup errors
  });
}, 5 * 60 * 1000);

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
