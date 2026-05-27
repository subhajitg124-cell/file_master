import { Request, Response, NextFunction } from "express";

export function requestTimeout(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        res.status(504).json({ detail: "Request timeout." });
      }
    });
    next();
  };
}
