import { Router, type Response } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { db, usersTable, sessionsTable, subscriptionsTable } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../utils/hash";
import { authMiddleware, AuthRequest } from "../middlewares/auth";

const router = Router();

// 30 days session duration
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// Helper to create a session token and store it in database
async function createSession(userId: string, res: Response) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessionsTable).values({
    userId,
    token,
    expiresAt,
  });

  // Set HTTP-only cookie
  res.cookie("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_MS,
  });

  return token;
}

// Helper to fetch subscription details and remaining days
async function getUserSubscriptionInfo(userId: string) {
  try {
    const subs = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId))
      .orderBy(desc(subscriptionsTable.createdAt));

    const activeSub = subs.find((s) => s.status === "active");

    let daysActive = null;
    if (activeSub && activeSub.currentPeriodEnd) {
      const msDiff = new Date(activeSub.currentPeriodEnd).getTime() - Date.now();
      daysActive = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
    }

    return activeSub
      ? {
          plan: activeSub.plan,
          status: activeSub.status,
          expiresAt: activeSub.currentPeriodEnd,
          daysActive,
        }
      : null;
  } catch (_) {
    return null;
  }
}

// ── 1. POST /signup ──
router.post("/signup", async (req, res): Promise<void> => {
  try {
    const bodySchema = z.object({
      email: z.string().email("Invalid email format"),
      phoneNumber: z.string().min(10, "Phone number must be at least 10 digits").max(15).optional().nullable(),
      password: z.string().min(6, "Password must be at least 6 characters"),
      name: z.string().min(1, "Name is required").optional().nullable(),
    });

    const parsed = bodySchema.parse(req.body);
    const passwordHash = hashPassword(parsed.password);

    // Check if email already exists
    const [existingEmail] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, parsed.email.toLowerCase()))
      .limit(1);

    if (existingEmail) {
      res.status(400).json({ error: "Email is already registered" });
      return;
    }

    // Check if phone number already exists (if provided)
    if (parsed.phoneNumber) {
      const [existingPhone] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.phoneNumber, parsed.phoneNumber))
        .limit(1);

      if (existingPhone) {
        res.status(400).json({ error: "Phone number is already registered" });
        return;
      }
    }

    const [newUser] = await db
      .insert(usersTable)
      .values({
        email: parsed.email.toLowerCase(),
        phoneNumber: parsed.phoneNumber || null,
        passwordHash,
        name: parsed.name || null,
        role: "user",
        premiumTier: "free",
        premiumEnabled: false,
      })
      .returning();

    const token = await createSession(newUser.id, res);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        premiumTier: newUser.premiumTier,
        premiumEnabled: newUser.premiumEnabled,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    res.status(500).json({ error: err.message || "Failed to create user" });
  }
});

// ── 2. POST /login ──
router.post("/login", async (req, res): Promise<void> => {
  try {
    const bodySchema = z.object({
      identifier: z.string().min(1, "Email or Phone Number is required"),
      password: z.string().min(1, "Password is required"),
    });

    const parsed = bodySchema.parse(req.body);
    const id = parsed.identifier.toLowerCase();

    // Query by email OR phone number
    const conditions = [eq(usersTable.email, id)];
    if (/^\+?[0-9]+$/.test(id)) {
      conditions.push(eq(usersTable.phoneNumber, id));
    }

    const users = await db
      .select()
      .from(usersTable)
      .where(or(...conditions))
      .limit(1);

    const user = users[0];
    if (!user || !user.passwordHash || !verifyPassword(parsed.password, user.passwordHash)) {
      res.status(401).json({ error: "Invalid email/phone number or password" });
      return;
    }

    const token = await createSession(user.id, res);
    const subscription = await getUserSubscriptionInfo(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        premiumTier: user.premiumTier,
        premiumEnabled: user.premiumEnabled,
      },
      subscription,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    res.status(500).json({ error: err.message || "Failed to authenticate" });
  }
});

// ── 3. POST /google ──
router.post("/google", async (req, res): Promise<void> => {
  try {
    const bodySchema = z.object({
      email: z.string().email("Invalid email format"),
      name: z.string().min(1, "Name is required"),
      googleSubject: z.string().min(1, "Google Subject ID is required"),
    });

    const parsed = bodySchema.parse(req.body);
    const email = parsed.email.toLowerCase();

    // Find by email or googleSubject
    let user;
    const existingUsers = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.email, email), eq(usersTable.googleSubject, parsed.googleSubject)))
      .limit(1);

    if (existingUsers.length > 0) {
      user = existingUsers[0];
      // Update Google ID if not set
      if (!user.googleSubject) {
        const [updatedUser] = await db
          .update(usersTable)
          .set({ googleSubject: parsed.googleSubject, updatedAt: new Date() })
          .where(eq(usersTable.id, user.id))
          .returning();
        user = updatedUser;
      }
    } else {
      // Create user
      const [newUser] = await db
        .insert(usersTable)
        .values({
          email,
          name: parsed.name,
          googleSubject: parsed.googleSubject,
          role: "user",
          premiumTier: "free",
          premiumEnabled: false,
        })
        .returning();
      user = newUser;
    }

    const token = await createSession(user.id, res);
    const subscription = await getUserSubscriptionInfo(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        premiumTier: user.premiumTier,
        premiumEnabled: user.premiumEnabled,
      },
      subscription,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0].message });
      return;
    }
    res.status(500).json({ error: err.message || "Google auth processing failed" });
  }
});

// ── 4. GET /me ──
router.get("/me", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (!req.user) {
    res.json({ success: true, user: null, subscription: null });
    return;
  }

  const subscription = await getUserSubscriptionInfo(req.user.id);

  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      phoneNumber: req.user.phoneNumber,
      role: req.user.role,
      premiumTier: req.user.premiumTier,
      premiumEnabled: req.user.premiumEnabled,
    },
    subscription,
  });
});

// ── 5. POST /logout ──
router.post("/logout", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  if (req.sessionToken) {
    try {
      await db.delete(sessionsTable).where(eq(sessionsTable.token, req.sessionToken));
    } catch (_) {
      // Ignore database delete errors
    }
  }

  res.clearCookie("session_token");
  res.json({ success: true, message: "Logged out successfully" });
});

export default router;
