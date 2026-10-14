import type { RequestHandler } from "express";
import { createUserSupabaseClient } from "../lib/supabase.js";

export const authenticate: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({
        message: "Authentication token is required",
      });
      return;
    }

    const accessToken = authorization
      .slice("Bearer ".length)
      .trim();

    if (!accessToken) {
      res.status(401).json({
        message: "Authentication token is required",
      });
      return;
    }

    const supabase = createUserSupabaseClient(accessToken);

    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      res.status(401).json({
        message: "Invalid or expired authentication token",
      });
      return;
    }

    req.user = data.user;
    req.supabase = supabase;

    next();
  } catch {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
