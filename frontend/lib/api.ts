// FILE: apps/web/lib/api.ts
// All API calls to the Express backend — single source of truth for endpoints

import type { Order, PrintConfig, PaymentMode } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}

export const api = {
  /** Get signed Cloudinary upload URL */
  getUploadSignature: () =>
    get<{
      signature: string;
      timestamp: number;
      cloudName: string;
      apiKey: string;
      folder: string;
    }>("/upload-signature"),

  /** Create a new print order */
  createOrder: (payload: {
    files: (PrintConfig & {
      cloudinaryUrl: string;
      fileName: string;
    })[];
    paymentMode: PaymentMode;
    userName: string;
  }) =>
    post<{ orderId: string; razorpayOrderId?: string; amount?: number }>(
      "/orders",
      payload
    ),

  /** Get a single order by ID (used by track page) */
  getOrder: (id: string) => get<Order>(`/orders/${id}`),

  /** Get all pending orders (used by desktop poller as proxy via Next.js route) */
  getPendingOrders: () => get<Order[]>("/orders?status=pending"),
};