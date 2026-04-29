"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function HomePage() {
  const router = useRouter();
  const [trackId, setTrackId] = useState("");

  const handleTrack = () => {
    const id = trackId.trim().toUpperCase();
    if (id.length >= 4) router.push(`/track/${id}`);
  };

  return (
    <main className="min-h-screen bg-[#F2F3F7] flex flex-col items-center justify-center px-5 py-16">
      {/* Theme toggle - top right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {/* Header */}
      <div className="mb-10 text-center">
        {/* Shop open badge */}
        <div className="inline-flex items-center gap-2 bg-[#E8F5E9] border border-[#C8E6C9] rounded-full px-4 py-1.5 text-xs text-[#0C831F] font-semibold mb-6 tracking-wide">
          <span className="w-2 h-2 rounded-full bg-[#0C831F] animate-pulse inline-block" />
          Shop is open
        </div>
        <h1 className="text-5xl font-black tracking-tight mb-3 text-[#1A1A1A] flex flex-col items-center gap-4">
          <img src="/logo.jpg" alt="Printable Logo" className="w-24 h-24 rounded-2xl shadow-md object-cover bg-white" />
          <span>Print<span className="text-[#0C831F]">able</span></span>
        </h1>
        <p className="text-[#666] text-sm max-w-xs mx-auto leading-relaxed">
          Upload your file. Pick your options. We print it. Simple.
        </p>
      </div>

      {/* QR card */}
      <div className="card p-8 mb-6 text-center w-full max-w-xs">
        <div className="w-48 h-48 bg-[#F2F3F7] border border-[#E8E8E8] rounded-xl mx-auto mb-4 flex items-center justify-center">
          <div className="grid grid-cols-3 gap-1.5 opacity-25">
            {[1,0,1,0,1,0,1,0,1].map((v, i) => (
              <div key={i} className="w-10 h-10 bg-[#1A1A1A] rounded-sm" style={{ opacity: v }} />
            ))}
          </div>
        </div>
        <p className="text-[#333] text-xs font-semibold">Scan to open on your phone</p>
      </div>

      {/* CTA */}
      <Link
        href="/upload"
        className="btn-green w-full max-w-xs flex items-center justify-center py-4 text-sm font-bold tracking-wide uppercase rounded-xl mb-5 shadow-lg shadow-[#0C831F]/20"
      >
        Start New Print Order →
      </Link>

      {/* Track */}
      <p className="text-[#333] text-xs mb-3 font-semibold">Track existing order? Enter order ID below</p>
      <div className="flex gap-2 w-full max-w-xs">
        <input
          type="text"
          placeholder="Order ID e.g. ABC123"
          value={trackId}
          onChange={(e) => setTrackId(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleTrack()}
          maxLength={8}
          className="flex-1 bg-white border-2 border-dashed border-[#B0B0B0] rounded-xl px-4 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#999] outline-none focus:border-[#0C831F] focus:border-solid transition-all uppercase tracking-widest"
        />
        <button
          onClick={handleTrack}
          disabled={trackId.trim().length < 4}
          className="bg-white border border-[#E8E8E8] hover:border-[#0C831F] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-4 py-2.5 text-sm text-[#333] hover:text-[#0C831F] transition-colors font-semibold"
        >
          Go
        </button>
      </div>
    </main>
  );
}