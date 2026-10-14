import { Router } from "express";
import { z } from "zod";
import type { RequestHandler } from "express";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);

// All routes below require authentication.
const withSupabase = (
  handler: RequestHandler,
): RequestHandler => {
  return (req, res, next) => {
    if (!req.supabase || !req.user) {
      res.status(401).json({
        message: "Authentication required",
      });
      return;
    }

    return handler(req, res, next);
  };
};

const createOrderSchema = z.object({
  company_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  amount: z.number().finite().nonnegative(),
}).strict();

const updateOrderSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  amount: z.number().finite().nonnegative().optional(),
}).strict().refine(
  (data) =>
    data.title !== undefined ||
    data.amount !== undefined,
  {
    message: "At least one field must be provided",
  },
);

const orderIdSchema = z.string().uuid();

// =====================================================
// GET /api/orders
// SELECT
// =====================================================

router.get(
  "/",
  withSupabase(async (req, res) => {
    const companyIdSchema = z.string().uuid();

    let query = req.supabase!
      .from("orders")
      .select("id, company_id, title, amount, created_at");

    const companyId = req.query.company_id;

    if (companyId !== undefined) {
      const parsed = companyIdSchema.safeParse(companyId);

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid company_id",
        });
        return;
      }

      query = query.eq("company_id", parsed.data);
    }

    const { data, error } = await query;

    if (error) {
      console.error("List orders failed:", error.message);

      res.status(500).json({
        message: "Could not retrieve orders",
      });
      return;
    }

    res.status(200).json(data);
  }),
);

// =====================================================
// POST /api/orders
// INSERT
// =====================================================

router.post(
  "/",
  withSupabase(async (req, res) => {
    const parsed = createOrderSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid order data",
        errors: parsed.error.flatten(),
      });
      return;
    }

    const { company_id, title, amount } = parsed.data;

    const { data, error } = await req.supabase!
      .from("orders")
      .insert({
        company_id,
        title,
        amount,
      })
      .select("id, company_id, title, amount, created_at")
      .single();

    if (error) {
      console.error("Create order failed:", error.message);

      if (error.code === "42501") {
        res.status(403).json({
          message: "You are not allowed to create this order",
        });
        return;
      }

      res.status(400).json({
        message: "Could not create order",
      });
      return;
    }

    res.status(201).json(data);
  }),
);

// =====================================================
// PATCH /api/orders/:id
// UPDATE
// =====================================================

router.patch(
  "/:id",
  withSupabase(async (req, res) => {
    const parsedId = orderIdSchema.safeParse(req.params.id);

    if (!parsedId.success) {
      res.status(400).json({
        message: "Invalid order ID",
      });
      return;
    }

    const parsedBody = updateOrderSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({
        message: "Invalid update data",
        errors: parsedBody.error.flatten(),
      });
      return;
    }

    // Only title and amount are allowed.
    // company_id and id cannot be changed here.
    const updates = parsedBody.data;

    const { data, error } = await req.supabase!
      .from("orders")
      .update(updates)
      .eq("id", parsedId.data)
      .select("id, company_id, title, amount, created_at")
      .maybeSingle();

    if (error) {
      console.error("Update order failed:", error.message);

      res.status(400).json({
        message: "Could not update order",
      });
      return;
    }

    if (!data) {
      res.status(404).json({
        message: "Order not found",
      });
      return;
    }

    res.status(200).json(data);
  }),
);

// =====================================================
// DELETE /api/orders/:id
// DELETE
// =====================================================

router.delete(
  "/:id",
  withSupabase(async (req, res) => {
    const parsedId = orderIdSchema.safeParse(req.params.id);

    if (!parsedId.success) {
      res.status(400).json({
        message: "Invalid order ID",
      });
      return;
    }

    const { data, error } = await req.supabase!
      .from("orders")
      .delete()
      .eq("id", parsedId.data)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Delete order failed:", error.message);

      res.status(400).json({
        message: "Could not delete order",
      });
      return;
    }

    if (!data) {
      res.status(404).json({
        message: "Order not found",
      });
      return;
    }

    res.status(204).end();
  }),
);

export default router;
