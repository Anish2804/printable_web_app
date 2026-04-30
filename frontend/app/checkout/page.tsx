// FILE: apps/web/app/checkout/page.tsx
// Checkout page — handles single or multiple print jobs
// Reads `printJobs` (array) from sessionStorage

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PaymentToggle from "@/components/PaymentToggle";
import PriceCalc from "@/components/PriceCalc";
import { api } from "@/lib/api";
import { calculatePrice, countPagesInRange } from "@/lib/price";
import type { PrintConfig, PaymentMode } from "@/lib/types";
import storeConfig from "../../store.config.json";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PrintJob {
  fileUrl: string;
  fileName: string;
  config: PrintConfig;
}

function calcPrice(c: PrintConfig): number {
  return calculatePrice(c).total;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("offline");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("printJobs");
    const legacy = sessionStorage.getItem("printJob");
    if (stored) {
      setJobs(JSON.parse(stored));
    } else if (legacy) {
      const { fileUrl, fileName, config } = JSON.parse(legacy);
      setJobs([{ fileUrl, fileName, config }]);
    } else {
      router.push("/upload");
    }
    // Restore username if previously entered
    const savedName = sessionStorage.getItem("userName");
    if (savedName) setUserName(savedName);
  }, [router]);

  const totalAmount = jobs.reduce((s, j) => s + calcPrice(j.config), 0);

  const handlePlaceOrder = async () => {
    if (!jobs.length) return;

    // Validate userName
    if (!userName.trim()) {
      setError("Please enter your name before placing the order.");
      return;
    }

    setLoading(true);
    setError("");

    // Save userName for next time
    sessionStorage.setItem("userName", userName.trim());

    try {
      const payload = {
        files: jobs.map((job) => ({
          ...job.config,
          fileUrl: job.fileUrl,
          fileName: job.fileName,
          // Send the page count for pricing (backend uses this)
          pages: countPagesInRange(job.config.pageRange, job.config.totalPages),
        })),
        paymentMode,
        userName: userName.trim(),
      };

      if (paymentMode === "offline") {
        const { orderId } = await api.createOrder(payload);
        sessionStorage.removeItem("printJobs");
        sessionStorage.removeItem("printJob");
        router.push(`/track/${orderId}`);
      } else {
        const result = await api.createOrder(payload);
        const { orderId, razorpayOrderId, amount } = result;

        const rzp = new window.Razorpay({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: amount,
          currency: "INR",
          order_id: razorpayOrderId,
          name: storeConfig.storeName,
          description:
            jobs.length === 1
              ? `Print order — ${jobs[0].fileName}`
              : `${jobs.length} print orders`,
          handler: () => {
            sessionStorage.removeItem("printJobs");
            sessionStorage.removeItem("printJob");
            router.push(`/track/${orderId}`);
          },
          modal: { ondismiss: () => setLoading(false) },
        });
        rzp.open();
      }
    } catch (err) {
      console.error("Order creation failed:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (!jobs.length) return null;

  return (
    <main className="min-h-screen bg-[#F2F3F7] text-[#1A1A1A] ">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#F2F3F7]/90 backdrop-blur-xl border-b border-[#E8E8E8]">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-[#E8E8E8] hover:bg-[#F8FDF8] transition-colors shadow-sm">
            <span className="text-lg text-[#1A1A1A]">‹</span>
          </button>
          <h1 className="text-sm font-bold">
            <span className="flex items-center gap-2"><img src={storeConfig.logoPath} alt={`${storeConfig.storeName} logo`} className="w-5 h-5 rounded-md object-cover bg-black" /><span>Print<span className="text-[#0C831F]">able</span></span></span>
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 pb-32">
        <h2 className="text-xl font-bold mb-1">Checkout</h2>
        <p className="text-[#999] text-xs mb-6">
          {jobs.length === 1
            ? "Review and pay"
            : `${jobs.length} files · review and pay`}
        </p>

        {/* Username input */}
        <div className="bg-white border border-[#E8E8E8] rounded-2xl p-4 mb-4">
          <label className="text-sm font-semibold text-[#1A1A1A] mb-2 block">Your Name</label>
          <input
            type="text"
            placeholder="Enter your name (e.g. Anish)"
            value={userName}
            onChange={(e) => {
              setUserName(e.target.value);
              if (error.toLowerCase().includes("name")) setError("");
            }}
            className={`w-full bg-[#F2F3F7] border rounded-xl px-4 py-2.5 text-sm text-[#1A1A1A] placeholder:text-[#CCC] outline-none transition-colors ${
              error.toLowerCase().includes("name") 
                ? "border-red-500 ring-1 ring-red-500/20" 
                : "border-[#E8E8E8] focus:border-[#0C831F]"
            }`}
            maxLength={50}
          />
          {error.toLowerCase().includes("name") ? (
            <p className="text-[10px] text-red-500 mt-1.5 font-bold animate-shake">⚠️ {error}</p>
          ) : (
            <p className="text-[10px] text-[#999] mt-1.5">This name will appear on your order</p>
          )}
        </div>

        {/* File(s) summary */}
        <div className="space-y-3 mb-6">
          {jobs.map((job, i) => {
            const pc = countPagesInRange(job.config.pageRange, job.config.totalPages);
            return (
              <div
                key={i}
                className="bg-white border border-[#E8E8E8] rounded-2xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#E8F5E9] border border-[#C8E6C9] rounded-xl flex items-center justify-center text-[#0C831F] text-xs font-bold shrink-0">
                    {jobs.length > 1 ? i + 1 : "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{job.fileName}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className="text-[10px] bg-[#E8E8E8] text-black px-2 py-0.5 rounded-md font-medium">
                        {pc} page{pc > 1 ? "s" : ""}
                      </span>
                      <span className="text-[10px] bg-[#E8E8E8] text-black px-2 py-0.5 rounded-md font-medium">
                        {job.config.copies} cop{job.config.copies > 1 ? "ies" : "y"}
                      </span>
                      <span className="text-[10px] bg-[#E8E8E8] text-black px-2 py-0.5 rounded-md font-medium">
                        {job.config.colour ? "🎨 Colour" : "🖤 B&W"}
                      </span>
                      <span className="text-[10px] bg-[#E8E8E8] text-black px-2 py-0.5 rounded-md font-medium">
                        {job.config.duplex ? "📄 Both sides" : "📃 Single"}
                      </span>
                      <span className="text-[10px] bg-[#E8E8E8] text-black px-2 py-0.5 rounded-md font-medium">
                        {job.config.orientation === "landscape" ? "▭ Landscape" : "▯ Portrait"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[#0C831F] font-bold text-sm shrink-0">
                    {storeConfig.currencySymbol}{calcPrice(job.config)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment mode toggle */}
        <PaymentToggle mode={paymentMode} onChange={setPaymentMode} />

        {/* Price breakdown for single file */}
        {jobs.length === 1 && <PriceCalc config={jobs[0].config} />}

        {error && !error.toLowerCase().includes("name") && <p className="text-red-400 text-xs mt-3">{error}</p>}
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#F2F3F7]/95 backdrop-blur-xl border-t border-[#E8E8E8] z-50">
        <div className="max-w-lg mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[#999] text-[10px] uppercase tracking-widest">Total</span>
              <p className="text-[#1A1A1A] text-lg font-black">{storeConfig.currencySymbol}{totalAmount}</p>
            </div>
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="bg-gradient-to-r from-[#00B4D8] via-[#10B981] to-[#0C831F] hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm py-3.5 px-8 rounded-xl transition-all duration-200 tracking-wide uppercase shadow-lg shadow-[#0C831F]/20 active:scale-95"
            >
              {loading
                ? "Processing…"
                : paymentMode === "online"
                  ? "Pay Online →"
                  : `Place Order →`}
            </button>
          </div>
          {paymentMode === "offline" && (
            <p className="text-[#1A1A1A] text-[10px] text-center mt-2">
              Pay cash when you collect your printout
            </p>
          )}
        </div>
      </div>
    </main>
  );
}