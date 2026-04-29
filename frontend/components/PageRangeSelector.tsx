"use client";

import { useState } from "react";

interface Props {
  totalPages: number;
  pageRange: string;
  onChange: (range: string) => void;
}

export default function PageRangeSelector({ totalPages, pageRange, onChange }: Props) {
  const isAll = pageRange === "all";
  const [customValue, setCustomValue] = useState(isAll ? "" : pageRange);
  const [error, setError] = useState("");

  const validate = (val: string): string => {
    if (!val.trim()) return "Enter a page range";
    const parts = val.split(",").map((s) => s.trim());
    for (const part of parts) {
      if (part.includes("-")) {
        const [a, b] = part.split("-").map((s) => parseInt(s, 10));
        if (isNaN(a) || isNaN(b)) return "Invalid range format";
        if (a < 1 || b < 1) return "Pages start from 1";
        if (a > totalPages || b > totalPages) return `Max page is ${totalPages}`;
        if (a > b) return `${a} is greater than ${b}`;
      } else {
        const n = parseInt(part, 10);
        if (isNaN(n)) return "Invalid page number";
        if (n < 1 || n > totalPages) return `Page ${n} doesn't exist (1–${totalPages})`;
      }
    }
    return "";
  };

  const handleCustomChange = (val: string) => {
    const filtered = val.replace(/[^0-9,\- ]/g, "");
    setCustomValue(filtered);
    const err = validate(filtered);
    setError(err);
    if (!err && filtered.trim()) onChange(filtered.trim());
  };

  const handleMode = (mode: "all" | "custom") => {
    if (mode === "all") { 
      onChange("all"); 
      setError(""); 
    } else { 
      onChange(""); // <-- FIX: break the 'isAll' check in parent by clearing value
      setCustomValue(""); 
      setError(""); 
    }
  };

  const countPages = (): number => {
    if (isAll) return totalPages;
    const pages = new Set<number>();
    pageRange.split(",").map((s) => s.trim()).forEach((part) => {
      if (part.includes("-")) {
        const [a, b] = part.split("-").map((s) => parseInt(s, 10));
        if (!isNaN(a) && !isNaN(b)) for (let i = Math.max(1, a); i <= Math.min(totalPages, b); i++) pages.add(i);
      } else {
        const n = parseInt(part, 10);
        if (!isNaN(n) && n >= 1 && n <= totalPages) pages.add(n);
      }
    });
    return pages.size || totalPages;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[#1A1A1A]">Pages</p>
        <span className="text-xs text-[#0C831F] bg-[#E8F5E9] px-2.5 py-0.5 rounded-full font-semibold">
          {countPages()} of {totalPages} selected
        </span>
      </div>

      <div className="flex gap-3 mb-3">
        {(["all", "custom"] as const).map((mode) => {
          const active = mode === "all" ? isAll : !isAll;
          return (
            <button
              key={mode}
              onClick={() => handleMode(mode)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                active
                  ? "border-[#0C831F] bg-[#E8F5E9] text-[#0C831F]"
                  : "border-[#E8E8E8] bg-white text-[#666] hover:border-[#0C831F]/40"
              }`}
            >
              {mode === "all" ? "📄 All pages" : "✂️ Required Pages"}
            </button>
          );
        })}
      </div>

      {!isAll && (
        <div>
          <input
            type="text"
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="e.g. 1-3, 5, 7-9"
            className="w-full bg-white border border-[#E8E8E8] rounded-xl px-4 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#CCC] outline-none focus:border-[#0C831F] transition-colors"
          />
          {error && <p className="text-red-500 text-xs mt-1.5 ml-1">{error}</p>}
          {!error && customValue && (
            <p className="text-[#0C831F] text-xs mt-1.5 ml-1">
              ✓ {countPages()} page{countPages() > 1 ? "s" : ""} selected
            </p>
          )}
        </div>
      )}
    </div>
  );
}
