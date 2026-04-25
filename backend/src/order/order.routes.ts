// FILE: services/api/src/order/order.routes.ts
// Order HTTP routes

import { Router, Request, Response } from "express";
import {
  createOrder,
  getOrderById,
  getOrdersByStatus,
  getAllOrders,
  updateOrderStatus,
  confirmCashPayment,
  FileInput,
} from "./order.service";
import type { OrderStatus } from "./order.model";

export const orderRouter = Router();

// ─── POST /orders ─────────────────────────────────────────────────────────────
// Create a new print order (called by Next.js checkout page)
// Body: { files: FileInput[], paymentMode: "online" | "offline" }
orderRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { files, paymentMode, userName } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: "files array is required and must not be empty" });
      return;
    }

    if (!paymentMode) {
      res.status(400).json({ error: "paymentMode is required" });
      return;
    }

    if (!userName || typeof userName !== "string" || userName.trim().length === 0) {
      res.status(400).json({ error: "userName is required" });
      return;
    }

    // Validate each file entry
    for (const f of files as FileInput[]) {
      if (!f.fileName || !f.cloudinaryUrl || !f.pages || !f.copies) {
        res.status(400).json({ error: "Each file must have fileName, cloudinaryUrl, pages, copies" });
        return;
      }
    }

    const result = await createOrder({
      files: (files as FileInput[]).map((f) => ({
        fileName:      f.fileName,
        cloudinaryUrl: f.cloudinaryUrl,
        pages:         Number(f.pages),
        copies:        Number(f.copies),
        colour:        Boolean(f.colour),
        duplex:        Boolean(f.duplex),
        orientation:   String(f.orientation || 'portrait'),
        pageRange:     String(f.pageRange || 'all'),
      })),
      paymentMode,
      userName: userName.trim(),
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("POST /orders error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// ─── GET /orders/:id ──────────────────────────────────────────────────────────
orderRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const order = await getOrderById(req.params.id as string);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(order);
  } catch (err) {
    console.error("GET /orders/:id error:", err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// ─── GET /orders?status=... ───────────────────────────────────────────────────
orderRouter.get("/", async (req: Request, res: Response) => {
  try {
    if (req.query.status) {
      const status = req.query.status as OrderStatus;
      const orders = await getOrdersByStatus(status);
      res.json(orders);
    } else {
      const orders = await getAllOrders();
      res.json(orders);
    }
  } catch (err) {
    console.error("GET /orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// ─── PATCH /orders/:id/status ─────────────────────────────────────────────────
orderRouter.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses: OrderStatus[] = [
      "pending_payment",
      "paid",
      "printing",
      "completed",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const order = await updateOrderStatus(req.params.id as string, status);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(order);
  } catch (err) {
    console.error("PATCH /orders/:id/status error:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ─── PATCH /orders/:id/confirm-payment ───────────────────────────────────────
orderRouter.patch(
  "/:id/confirm-payment",
  async (req: Request, res: Response) => {
    try {
      const order = await confirmCashPayment(req.params.id as string);
      if (!order) {
        res.status(404).json({ error: "Order not found or not a cash order" });
        return;
      }
      res.json(order);
    } catch (err) {
      console.error("PATCH /orders/:id/confirm-payment error:", err);
      res.status(500).json({ error: "Failed to confirm payment" });
    }
  }
);