import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { apiLimiter } from "./middlewares/rateLimit";

const app: Express = express();

// ── Security: CORS ────────────────────────────────────────────────────────────
// Allow the Replit preview/deployed domains and localhost in dev mode.
const isDev = process.env["NODE_ENV"] === "development";

app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin requests (SSR, curl) have no Origin header — allow them.
      if (!origin) return callback(null, true);

      const allowed =
        origin.endsWith(".replit.app") ||
        origin.endsWith(".replit.dev") ||
        (isDev && (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")));

      if (allowed) {
        callback(null, true);
      } else {
        logger.warn({ origin }, "CORS: blocked request from disallowed origin");
        callback(new Error("Not allowed by CORS policy"));
      }
    },
    credentials: true,
  }),
);

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ── Body parsers (with size limits) ──────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Global rate limiting ──────────────────────────────────────────────────────
app.use(apiLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api", router);

export default app;
