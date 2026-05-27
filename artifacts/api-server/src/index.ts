import app from "./app";
import { logger } from "./lib/logger";
import net from "net";
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
const cleanupTimer = setInterval(() => {
  cleanupOldFiles(TMP_DIR, 10 * 60 * 1000).catch(() => {
    // Ignore cleanup errors
  });
}, 5 * 60 * 1000);
cleanupTimer.unref();

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

function findFreePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        logger.warn(`Port ${startPort} is in use, trying ${startPort + 1}...`);
        resolve(findFreePort(startPort + 1));
      } else {
        resolve(startPort);
      }
    });
    server.once("listening", () => {
      server.close(() => {
        resolve(startPort);
      });
    });
    server.listen(startPort, "0.0.0.0");
  });
}

const startServer = async () => {
  try {
    const finalPort = await findFreePort(port);
    const server = app.listen(finalPort, () => {
      logger.info({ port: finalPort }, "Server listening");
    });
    server.on("error", (err) => {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    });
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
};

startServer();
