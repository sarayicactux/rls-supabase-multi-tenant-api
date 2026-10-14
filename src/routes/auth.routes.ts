import { Router } from "express";
import { z } from "zod";
import { createAnonSupabaseClient } from "../lib/supabase.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

const loginSchema = z
  .object({
    email: z.string().trim().email().max(320),
    password: z.string().min(1).max(200),
  })
  .strict();

// =====================================================
// POST /api/auth/login
// =====================================================

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid login data",
      errors: parsed.error.flatten(),
    });
    return;
  }

  const { email, password } = parsed.data;
  const supabase = createAnonSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session || !data.user) {
    res.status(401).json({
      message: "Invalid email or password",
    });
    return;
  }

  res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    token_type: data.session.token_type,
    expires_in: data.session.expires_in,
    expires_at: data.session.expires_at,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
});

// =====================================================
// GET /api/auth/me
// =====================================================

router.get("/me", authenticate, (req, res) => {
  res.status(200).json({
    id: req.user!.id,
    email: req.user!.email,
  });
});

export default router;
