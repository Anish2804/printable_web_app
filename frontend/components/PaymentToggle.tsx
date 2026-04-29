// FILE: apps/web/components/PaymentToggle.tsx
// Online / Offline payment mode switcher

"use client";

import type { PaymentMode } from "@/lib/types";

interface Props {
  mode: PaymentMode;
  onChange: (mode: PaymentMode) => void;
}

export default function PaymentToggle({ mode, onChange }: Props) {
  return (
    <div className="mt-2 mb-6">
      <h3 className="text-xs tracking-widest uppercase text-[#6b6860] mb-4">Payment Method</h3>

      <div className="grid grid-cols-1 gap-3">
        {/* Online payment hidden as per user request */}
        {/* Offline */}
        <button
          onClick={() => onChange("offline")}
          className={`border rounded-xl p-4 text-left transition-all ${
            mode === "offline"
              ? "border-[#0C831F] bg-gradient-to-r from-[#00B4D8]/10 via-[#10B981]/10 to-[#0C831F]/10 shadow-[0_0_15px_rgba(12,131,31,0.1)]"
              : "border-[#E8E8E8] bg-white hover:border-[#0C831F]/40"
          }`}
        >
          <div className="text-xl mb-2">💵</div>
          <p className={`text-sm font-bold mb-0.5 ${mode === "offline" ? "text-[#0C831F]" : "text-[#1A1A1A]"}`}>
            Pay at Shop (Cash)
          </p>
          <p className="text-xs text-[#999]">Cash on collection</p>
        </button>
      </div>
    </div>
  );
}