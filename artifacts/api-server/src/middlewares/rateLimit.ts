import rateLimit from "express-rate-limit";

/** General API rate limit — 120 requests per minute per IP. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

/** Stricter limit for file-processing routes — 10 per minute per IP. */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many uploads. Please wait a minute before trying again." },
});
