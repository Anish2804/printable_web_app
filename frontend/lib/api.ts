// FILE: apps/web/lib/api.ts
// All API calls to the Express backend — single source of truth for endpoints

import type { Order, PrintConfig, PaymentMode, OrderStatus } from "@/lib/types";

let BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
if (BASE.endsWith("/")) BASE = BASE.slice(0, -1);

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
  /** Get signed Cloudflare R2 upload URL */
  getUploadUrl: (fileName: string, contentType: string) =>
    get<{
      uploadUrl: string;
      publicUrl: string;
      key: string;
    }>(`/upload-url?fileName=${encodeURIComponent(fileName)}&contentType=${encodeURIComponent(contentType)}`),

  /** Create a new print order */
  createOrder: (payload: {
    files: (PrintConfig & {
      fileUrl: string;
      fileName: string;
      pages: number;
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
  getPendingOrders: () => get<Order[]>("/orders?status=pending_payment"),

  /** Update order status (Admin/Desktop usage) */
  updateOrderStatus: (id: string, status: OrderStatus) =>
    patch<Order>(`/orders/${id}/status`, { status }),

  /** Confirm cash payment (Admin/Desktop usage) */
  confirmCashPayment: (id: string) =>
    patch<Order>(`/orders/${id}/confirm-payment`, {}),
    
  /** Health check */
  health: () => get<{ ok: boolean }>("/health"),
};