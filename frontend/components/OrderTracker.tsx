// FILE: apps/web/components/OrderTracker.tsx
// Visual status stepper — shows current order stage with animated active step

"use client";

import type { Order, OrderStatus } from "@/lib/types";
import storeConfig from "../store.config.json";

const STEPS: { status: OrderStatus; label: string; desc: string }[] = [
  { status: "pending_payment", label: "Order placed", desc: "Waiting for payment confirmation" },
  { status: "paid",           label: "Payment confirmed", desc: "Your payment was received" },
  { status: "printing",       label: "Printing",   desc: "Your document is printing now" },
  { status: "completed",      label: "Ready",      desc: "Your printout is ready to collect" },
];

const STATUS_ORDER: OrderStatus[] = ["pending_payment", "paid", "printing", "completed"];

interface Props {
  order: Order;
}

export default function OrderTracker({ order }: Props) {
  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const isCancelled = order.status === "cancelled";

  // Calculate total copies across all files
  const totalCopies = order.files?.reduce((sum, f) => sum + (f.copies || 0), 0) || 0;
  // Get first file name for display or show count
  const fileDisplay = order.files?.length === 1 
    ? order.files[0].fileName 
    : `${order.files?.length || 0} files`;

  return (
    <div>
      {/* Order meta */}
      <div className="bg-white border border-[#E8E8E8] rounded-xl p-4 mb-6">
        <div className="grid grid-cols-2 gap-4 text-xs">
          {order.userName && (
            <div className="col-span-2">
              <p className="text-[#999] mb-0.5 font-semibold uppercase tracking-wider">Customer</p>
              <p className="font-bold text-sm text-[#1A1A1A]">{order.userName}</p>
            </div>
          )}
          <div>
            <p className="text-[#999] mb-0.5 font-semibold uppercase tracking-wider">Items</p>
            <p className="font-bold text-[#1A1A1A] truncate" title={order.files?.map(f => f.fileName).join(', ')}>
              {fileDisplay}
            </p>
          </div>
          <div>
            <p className="text-[#999] mb-0.5 font-semibold uppercase tracking-wider">Total Amount</p>
            <p className="font-bold text-[#0C831F]">{storeConfig.currencySymbol}{order.totalAmount}</p>
          </div>
          <div>
            <p className="text-[#999] mb-0.5 font-semibold uppercase tracking-wider">Total Copies</p>
            <p className="font-bold text-[#1A1A1A]">{totalCopies}</p>
          </div>
          <div>
            <p className="text-[#999] mb-0.5 font-semibold uppercase tracking-wider">Payment Mode</p>
            <p className="font-bold text-[#1A1A1A] capitalize">{order.paymentMode}</p>
          </div>
        </div>
      </div>

      {/* Cancelled state */}
      {isCancelled && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center animate-fadeUp">
          <div className="text-3xl mb-2">🚫</div>
          <p className="text-red-600 font-bold text-sm">Order Cancelled</p>
          <p className="text-red-400 text-xs mt-1">This order was cancelled by the shop or customer.</p>
        </div>
      )}

      {/* Status steps */}
      {!isCancelled && (
        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            const upcoming = i > currentIdx;

            return (
              <div
                key={step.status}
                className={`border rounded-xl p-4 flex items-center gap-4 transition-all duration-300 ${
                  active
                    ? "border-[#0C831F] bg-[#F8FDF8] shadow-sm"
                    : done
                    ? "border-[#C8E6C9] bg-white opacity-70"
                    : "border-[#E8E8E8] bg-white opacity-40"
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    active
                      ? "bg-[#0C831F] text-white scale-110 shadow-md shadow-[#0C831F]/20"
                      : done
                      ? "bg-[#E8F5E9] text-[#0C831F]"
                      : "bg-[#F2F3F7] text-[#CCC]"
                  }`}
                >
                  {done ? "✓" : active ? (
                    <div className="relative">
                       <span className="w-2 h-2 bg-white rounded-full block animate-ping absolute inset-0" />
                       <span className="w-2 h-2 bg-white rounded-full block relative" />
                    </div>
                  ) : (
                    i + 1
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${active ? "text-[#1A1A1A]" : done ? "text-[#0C831F]" : "text-[#999]"}`}>
                    {step.label}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${active ? "text-[#666]" : "text-[#999]"}`}>
                    {step.desc}
                  </p>
                </div>

                {active && (
                  <div className="flex items-center gap-1.5 bg-[#E8F5E9] text-[#0C831F] px-2 py-1 rounded-full text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 bg-[#0C831F] rounded-full animate-pulse" />
                    LIVE
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Completed CTA */}
      {order.status === "completed" && (
        <div className="mt-8 bg-[#E8F5E9] border-2 border-[#0C831F]/20 rounded-2xl p-6 text-center animate-fadeUp shadow-lg shadow-[#0C831F]/10">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-[#0C831F] font-black text-lg mb-1">Ready to collect!</p>
          <p className="text-[#0C831F]/70 text-xs font-medium">Please visit the counter with your Order ID.</p>
        </div>
      )}

      <p className="text-[#999] text-[10px] text-center mt-8 font-medium tracking-wide">
        STAY ON THIS PAGE • UPDATES AUTOMATICALLY
      </p>
    </div>
  );
}