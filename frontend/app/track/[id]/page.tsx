// FILE: apps/web/app/track/[id]/page.tsx
// Order tracking page — polls GET /orders/:id every 1 min, auto-stops on completion

"use client";

import { useParams, useRouter } from "next/navigation";
import OrderTracker from "@/components/OrderTracker";
import { usePolling } from "@/lib/usePolling";
import type { Order } from "@/lib/types";

export default function TrackPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Stop polling once order is completed or cancelled
  const { data: order, error } = usePolling<Order>(
    `/api/orders/${id}`,
    60000, // poll every 1 minute
    (data) => data?.status === "completed" || data?.status === "cancelled"
  );

  return (
    <main className="min-h-screen bg-[#F2F3F7] text-[#1A1A1A] px-5 py-10  max-w-lg mx-auto">
      <button onClick={() => router.push("/")} className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-[#E8E8E8] hover:bg-[#F8FDF8] transition-colors shadow-sm mb-8">
        <span className="text-lg text-[#1A1A1A]">‹</span>
      </button>

      <div className="mb-8">
        <p className="text-[#999] text-xs tracking-widest uppercase mb-1">Order</p>
        <h2 className="text-2xl font-bold">{id}</h2>
      </div>

      {error ? (
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4 text-red-400 text-sm">
          Could not load order. Check your order ID and try again.
        </div>
      ) : !order ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 bg-white border border-[#E8E8E8] rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <OrderTracker order={order} />
      )}
    </main>
  );
}