import type { Request, Response, NextFunction } from "express";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthRequest extends Request {
  user?: typeof usersTable.$inferSelect;
  sessionToken?: string;
}

/**
 * Middleware to authenticate requests via session token in headers, cookies, or query params.
 */
export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  let token = req.headers["authorization"]?.replace("Bearer ", "");

  // Fallback to cookie
  if (!token && req.headers.cookie) {
    try {
      const cookies = req.headers.cookie.split(";").reduce((acc, c) => {
        const parts = c.trim().split("=");
        const k = parts[0];
        const v = parts.slice(1).join("=");
        if (k && v) acc[k] = decodeURIComponent(v);
        return acc;
      }, {} as Record<string, string>);
      token = cookies["session_token"];
    } catch (_) {
      // Ignore cookie parsing issues
    }
  }

  // Fallback to query parameter (helpful for direct file downloads or testing)
  if (!token && req.query.token) {
    token = String(req.query.token);
  }

  if (!token) {
    return next();
  }

  try {
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.token, token))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      return next();
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);

    if (user) {
      req.user = user;
      req.sessionToken = token;
    }
  } catch (err) {
    // Database connection could be down, fallback silently
  }
  next();
}

/**
 * Guard middleware that rejects unauthenticated requests with a 401 response.
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required. Please log in first." });
    return;
  }
  next();
}
