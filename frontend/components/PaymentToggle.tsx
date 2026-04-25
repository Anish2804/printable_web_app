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
              ? "border-[#e8642a] bg-[#e8642a]/5"
              : "border-[#2e2c28] bg-[#1a1916] hover:border-[#e8642a]/40"
          }`}
        >
          <div className="text-xl mb-2">💵</div>
          <p className={`text-sm font-bold mb-0.5 ${mode === "offline" ? "text-[#e8642a]" : ""}`}>
            Pay at Shop (Cash)
          </p>
          <p className="text-xs text-[#6b6860]">Cash on collection</p>
        </button>
      </div>
    </div>
  );
}