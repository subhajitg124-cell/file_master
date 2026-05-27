import app from "./app";
import { logger } from "./lib/logger";
import net from "net";

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
