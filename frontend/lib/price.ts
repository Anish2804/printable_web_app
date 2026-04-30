// FILE: apps/web/lib/price.ts
// Price calculation logic — single source of truth for frontend estimates.
// Backend recalculates independently; this is for live UI display only.

import type { PrintConfig } from "@/lib/types";
import config from "../store.config.json";

// Pricing constants — keep in sync with backend order.service.ts
const BW_PER_PAGE = config.pricing.bwPerPage;    // ₹1 per B&W page
const COLOR_PER_PAGE = config.pricing.colorPerPage; // ₹6 per colour page

interface PriceLine {
  label: string;
  amount: number;
}

interface PriceResult {
  perPageCost: number;
  pageCount: number;
  subtotal: number;
  total: number;
  breakdown: PriceLine[];
}

/**
 * Parse a page range string like "all", "1-3", "1,3,5", "2-4,7"
 * and return the count of unique selected pages.
 * `totalPages` is the actual PDF page count for "all" resolution.
 */
export function countPagesInRange(pageRange: string, totalPages: number): number {
  if (!pageRange || pageRange.toLowerCase() === "all") return totalPages;

  const pages = new Set<number>();
  const parts = pageRange.split(",").map((s) => s.trim());

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
      for (let i = start; i <= end; i++) pages.add(i);
    } else {
      const p = parseInt(part, 10);
      if (p >= 1 && p <= totalPages) pages.add(p);
    }
  }

  return pages.size || 1;
}

export function calculatePrice(config: PrintConfig): PriceResult {
  const pageCount = countPagesInRange(config.pageRange, config.totalPages);
  const perPageCost = config.colour ? COLOR_PER_PAGE : BW_PER_PAGE;
  const subtotal = perPageCost * pageCount * config.copies;

  const breakdown: PriceLine[] = [
    {
      label: `${pageCount} page${pageCount > 1 ? "s" : ""} × ${config.copies} cop${config.copies > 1 ? "ies" : "y"} × ₹${perPageCost}`,
      amount: subtotal,
    },
  ];

  // Duplex discount
  let total = subtotal;
  if (config.duplex && pageCount > 1) {
    const discount = Math.round(subtotal * (config.pricing.duplexDiscountPercent / 100));
    breakdown.push({ label: `Duplex discount (−${config.pricing.duplexDiscountPercent}%)`, amount: -discount });
    total -= discount;
  }

  return { perPageCost, pageCount, subtotal, total, breakdown };
}