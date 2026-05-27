import fs from "fs/promises";
import path from "path";
import { logger } from "../lib/logger";

/**
 * Schedule deletion of a temp file after `delayMs` milliseconds.
 * Default delay is 60 s — long enough for the download to complete.
 *
 * Usage (in a route handler):
 *   res.download(outputPath, filename, () => scheduleCleanup(outputPath));
 */
export function scheduleCleanup(filePath: string, delayMs = 60_000): void {
  setTimeout(async () => {
    try {
      await fs.unlink(filePath);
      logger.debug({ filePath }, "Temp file cleaned up");
    } catch {
      // File may already be gone — ignore
    }
  }, delayMs);
}

/**
 * Delete all files in `dir` that are older than `maxAgeMs`.
 * Call this on a scheduled interval to prevent disk fill-up.
 */
export async function cleanupOldFiles(
  dir: string,
  maxAgeMs = 10 * 60 * 1000, // 10 minutes
): Promise<void> {
  const now = Date.now();
  let entries: string[];

  try {
    entries = await fs.readdir(dir);
  } catch {
    return; // Directory doesn't exist yet
  }

  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry);
      try {
        const stat = await fs.stat(fullPath);
        if (now - stat.mtimeMs > maxAgeMs) {
          await fs.unlink(fullPath);
          logger.debug({ fullPath }, "Stale temp file removed");
        }
      } catch {
        // Ignore per-file errors
      }
    }),
  );
}
