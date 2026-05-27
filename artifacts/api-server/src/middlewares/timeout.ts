import type { Request, Response, NextFunction } from "express";

/**
 * Adds a per-route processing timeout. Replit's reverse proxy hard-kills
 * requests after 30 s, so we respond with 408 slightly before that.
 *
 * Usage:
 *   router.post('/merge-pdf', withTimeout(25_000), handler);
 */
export function withTimeout(ms: number) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: `Processing timed out after ${Math.round(ms / 1000)}s. Try a smaller file.`,
        });
      }
    }, ms);

    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));

    next();
  };
}
