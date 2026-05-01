"use client";

import type { PrintConfig } from "@/lib/types";
import { calculatePrice } from "@/lib/price";
import storeConfig from "../store.config.json";

export default function PriceCalc({ config, orderTotalPages = 0 }: { config: PrintConfig, orderTotalPages?: number }) {
  const { perPageCost, pageCount, total, breakdown } = calculatePrice(config, orderTotalPages);

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#1A1A1A]">Price Estimate</h3>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#0C831F] rounded-full animate-pulse" />
          <span className="text-[10px] text-[#0C831F] font-semibold">Live</span>
        </div>
      </div>

      <div className="space-y-2">
        {breakdown.map((line) => (
          <div key={line.label} className="flex justify-between text-sm">
            <span className="text-[#666]">{line.label}</span>
            <span className="font-semibold text-[#1A1A1A]">
              {line.amount < 0 ? "−" : ""}{storeConfig.currencySymbol}{Math.abs(line.amount).toFixed(0)}
            </span>
          </div>
        ))}

        <div className="border-t border-[#F2F3F7] pt-2 mt-2 flex justify-between items-center">
          <div>
            <span className="text-xs text-[#999]">
              {storeConfig.currencySymbol}{perPageCost}/pg × {pageCount} pg × {config.copies} copies
            </span>
          </div>
          <span className="text-[#0C831F] text-xl font-black">{storeConfig.currencySymbol}{total}</span>
        </div>
      </div>
    </div>
  );
}