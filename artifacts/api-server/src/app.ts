import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import pinoHttp from "pino-http";
import router from "./routes";
import apiV1Router from "./routes/apiV1";
import { requestTimeout } from "./middlewares/requestTimeout";
import { logger } from "./lib/logger";
import { apiLimiter } from "./middlewares/rateLimit";

const app: Express = express();

app.use(helmet());

// Dynamic CORS configuration (avoiding wildcard '*')
const allowedOriginRegex = /^(https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?|https?:\/\/.*\.replit\.(app|dev|co))$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOriginRegex.test(origin)) {
        return callback(null, true);
      }
      logger.warn({ origin }, "CORS: blocked request from disallowed origin");
      return callback(new Error("Not allowed by CORS policy"));
    },
    credentials: true,
  })
);

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

// Apply request timeout to API/processing routes
app.use("/api/v1", requestTimeout(30000), apiV1Router);
app.use("/api", requestTimeout(30000), router);

// Serve frontend static assets with SPA fallback in production
if (process.env.NODE_ENV === "production") {
  const publicDir = path.resolve(__dirname, "../../file-master/dist/public");
  app.use(express.static(publicDir));
  
  app.get("*", (req, res, next) => {
    // If it starts with /api, pass it through so we don't accidentally serve index.html for API 404s
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

export default app;
