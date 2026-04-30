"use client";

// Renders a live PDF preview using pdfjs-dist.
// White card style to match Blinkit design.
// FIX: properly cancel loading tasks to prevent stuck state.

import { useEffect, useRef, useState } from "react";

interface Props {
  fileUrl: string;
  colour: boolean;
  orientation: "portrait" | "landscape";
  currentPage: number;
  totalPages: number;
  onTotalPages: (n: number) => void;
  onPageChange: (page: number) => void;
  onClose?: () => void;
}

export default function PdfPreview({
  fileUrl,
  colour,
  orientation,
  currentPage,
  totalPages,
  onTotalPages,
  onPageChange,
  onClose,
}: Props) {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const thumbContainerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [rendering, setRendering] = useState(false);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load PDF — store the task ref so we can destroy it on cleanup
  useEffect(() => {
    let cancelled = false;
    let task: any = null;

    setLoadError(null);
    setLoading(true);
    setPdfDoc(null);
    setThumbs([]);

    async function loadPdf() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        // Load matching worker version from CDN
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

        task = pdfjsLib.getDocument({ url: fileUrl, disableAutoFetch: false });
        const pdf = await task.promise;

        if (cancelled) return;
        setPdfDoc(pdf);
        setLoading(false);
        onTotalPages(pdf.numPages);
      } catch (err: any) {
        if (cancelled) return;
        console.error("PDF load failed:", err);
        setLoadError(err?.message ?? "Failed to load PDF");
        setLoading(false);
      }
    }

    loadPdf();
    return () => {
      cancelled = true;
      // Destroy the task to stop any pending network/worker activity
      if (task) {
        try { task.destroy(); } catch (_) {}
      }
    };
  }, [fileUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render main page
  useEffect(() => {
    if (!pdfDoc || !mainCanvasRef.current) return;
    let cancelled = false;
    let renderTask: any = null;

    async function renderPage() {
      setRendering(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        const canvas = mainCanvasRef.current!;
        const ctx = canvas.getContext("2d")!;

        // Scale to fit ~320px width
        const desiredWidth = 320;
        const unscaledVp = page.getViewport({ scale: 1 });
        const scale = desiredWidth / unscaledVp.width;
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (cancelled) return;
        renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("Render failed:", err);
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    renderPage();
    return () => {
      cancelled = true;
      if (renderTask) {
        try { renderTask.cancel(); } catch (_) {}
      }
    };
  }, [pdfDoc, currentPage]);

  // Generate thumbnails progressively
  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;

    async function generateThumbs() {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        if (cancelled) break;
        try {
          const page = await pdfDoc.getPage(i);
          const vp = page.getViewport({ scale: 0.2 });
          const c = document.createElement("canvas");
          c.width = vp.width;
          c.height = vp.height;
          const ctx = c.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          const dataUrl = c.toDataURL();
          if (!cancelled) {
            setThumbs((prev) => [...prev, dataUrl]);
          }
        } catch (_) {}
      }
    }

    setThumbs([]);
    generateThumbs();
    return () => { cancelled = true; };
  }, [pdfDoc]);

  const isLandscape = orientation === "landscape";

  return (
    <div className="relative bg-white rounded-2xl shadow-md overflow-hidden">
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-7 h-7 bg-white border border-[#E8E8E8] rounded-full flex items-center justify-center text-[#666] text-sm hover:bg-[#F2F3F7] transition-colors shadow-sm"
        >
          ×
        </button>
      )}

      {/* Page indicator */}
      {!loadError && !loading && (
        <div className="absolute top-3 left-3 z-20 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full font-medium">
          {currentPage} / {totalPages || "…"}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div
              style={{ width: 28, height: 28, border: "3px solid #E8E8E8", borderTopColor: "#0C831F", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}
            />
            <p className="text-[#999] text-xs">Loading preview…</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {loadError && (
        <div className="flex flex-col items-center justify-center min-h-[280px] p-6 text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="text-[#D32F2F] text-sm font-bold mb-1">Preview unavailable</p>
          <p className="text-[#999] text-xs leading-relaxed max-w-[220px]">{loadError}</p>
        </div>
      )}

      {/* Canvas */}
      {!loading && !loadError && (
        <div
          className="flex items-center justify-center p-4 transition-all duration-300 relative"
          style={{ minHeight: 380 }}
        >
          <canvas
            ref={mainCanvasRef}
            className="max-w-full rounded-lg transition-all duration-300"
            style={{
              transform: isLandscape ? "rotate(-90deg) scale(0.75)" : "none",
              transformOrigin: "center center",
              boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
              filter: colour ? "none" : "grayscale(100%)"
            }}
          />
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50">
              <div
                style={{ width: 24, height: 24, border: "3px solid #E8E8E8", borderTopColor: "#0C831F", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}
              />
            </div>
          )}
        </div>
      )}

      {/* Nav arrows */}
      {!loadError && !loading && totalPages > 1 && (
        <>
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white border border-[#E8E8E8] disabled:opacity-30 rounded-full flex items-center justify-center text-[#666] shadow-sm hover:bg-[#F2F3F7] transition-all text-lg"
          >
            ‹
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white border border-[#E8E8E8] disabled:opacity-30 rounded-full flex items-center justify-center text-[#666] shadow-sm hover:bg-[#F2F3F7] transition-all text-lg"
          >
            ›
          </button>
        </>
      )}

      {/* Thumbnail strip */}
      {thumbs.length > 1 && !loadError && !loading && (
        <div
          ref={thumbContainerRef}
          className="flex gap-2 overflow-x-auto pb-2 px-4 pt-1 border-t border-[#F2F3F7]"
        >
          {thumbs.map((src, i) => (
            <button
              key={i}
              onClick={() => onPageChange(i + 1)}
              className={`shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-150 hover:scale-105 ${
                currentPage === i + 1
                  ? "border-[#0C831F] shadow-md"
                  : "border-[#E8E8E8] opacity-60 hover:opacity-100"
              }`}
            >
              <img 
                src={src} 
                alt={`Page ${i + 1}`} 
                className="h-14 w-auto transition-all duration-300" 
                style={{ filter: colour ? "none" : "grayscale(100%)" }}
              />
              <div className={`text-[9px] text-center py-0.5 font-semibold ${
                currentPage === i + 1 ? "text-[#0C831F] bg-[#E8F5E9]" : "text-[#999] bg-white"
              }`}>
                {i + 1}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
