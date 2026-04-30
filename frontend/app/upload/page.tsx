"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import FileDropzone, { FileEntry, estimatePageCount } from "@/components/FileDropzone";
import PrintOptionCard from "@/components/PrintOptionCard";
import PageRangeSelector from "@/components/PageRangeSelector";
import { uploadToR2WithProgress } from "@/lib/upload";
import { api } from "@/lib/api";
import { calculatePrice, countPagesInRange } from "@/lib/price";
import type { PrintConfig } from "@/lib/types";
import storeConfig from "../../store.config.json";
import PriceCalc from "@/components/PriceCalc";

const PdfPreview = dynamic(() => import("@/components/PdfPreview"), {
  ssr: false,
  loading: () => (
    <div className="bg-white border border-[#E8E8E8] rounded-2xl min-h-[380px] flex items-center justify-center shadow-sm">
      <div className="flex flex-col items-center gap-3">
        <div style={{ width: 28, height: 28, border: "3px solid #E8E8E8", borderTopColor: "#0C831F", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    </div>
  ),
});

const DEFAULT_CONFIG: PrintConfig = {
  pageRange: "all",
  totalPages: 1,
  pages: 1,
  copies: 1,
  colour: false,
  duplex: false,
  orientation: "portrait",
};

export default function UploadPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [configs, setConfigs] = useState<Record<string, PrintConfig>>({});
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [globalError, setGlobalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Track active XHR handles for cancel support
  const xhrRefs = useRef<Record<string, XMLHttpRequest>>({});

  const handleFilesChange = useCallback((updated: FileEntry[]) => {
    setEntries(updated);
    setConfigs((prev) => {
      const next = { ...prev };
      for (const e of updated) {
        if (!next[e.id]) next[e.id] = { ...DEFAULT_CONFIG, totalPages: e.pageCount, pages: e.pageCount };
      }
      return next;
    });
    if (updated.length > 0 && !activeFileId) {
      setActiveFileId(updated[0].id);
      setCurrentPage(1);
    } else if (updated.length === 0) {
      setActiveFileId(null);
    }
  }, [activeFileId]);

  const handleUploadFile = useCallback(async (id: string, file: File) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, state: "uploading", progress: 0 } : e)));
    try {
      const { uploadUrl, publicUrl } = await api.getUploadUrl(file.name, file.type);

      // Use XHR with abort support via custom logic or just use the utility
      // For abort support, we'll implement XHR here directly like before but for R2 (PUT)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRefs.current[id] = xhr;
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setEntries((prev) => prev.map((ent) => (ent.id === id ? { ...ent, progress: pct } : ent)));
          }
        });

        xhr.addEventListener("load", () => {
          delete xhrRefs.current[id];
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`R2 upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => { delete xhrRefs.current[id]; reject(new Error("Network error during upload")); });
        xhr.addEventListener("abort", () => { delete xhrRefs.current[id]; reject(new Error("Upload cancelled")); });

        xhr.send(file);
      });

      setEntries((prev) => prev.map((e) => e.id === id ? { ...e, state: "done", progress: 100, fileUrl: publicUrl } : e));
    } catch (err: any) {
      if (err?.message === "Upload cancelled") {
        // If cancelled, just remove the entry
        setEntries((prev) => prev.filter((e) => e.id !== id));
      } else {
        setEntries((prev) => prev.map((e) => e.id === id ? { ...e, state: "error", error: err?.message ?? "Upload failed" } : e));
      }
    }
  }, []);

  const handleCancelUpload = useCallback((id: string) => {
    const xhr = xhrRefs.current[id];
    if (xhr) {
      xhr.abort();
    }
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    // Cancel if still uploading
    const xhr = xhrRefs.current[id];
    if (xhr) xhr.abort();

    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      // If the active file was removed, switch to first remaining
      if (activeFileId === id) {
        const remaining = updated.filter((e) => e.state === "done");
        setActiveFileId(remaining.length > 0 ? remaining[0].id : null);
        setCurrentPage(1);
      }
      return updated;
    });
  }, [activeFileId]);

  const handleAdditionalFiles = async (rawFiles: File[]) => {
    const newEntries: FileEntry[] = [];
    let sizeError = "";
    for (const f of rawFiles) {
      if (f.size > 500 * 1024 * 1024) {
        sizeError = `"${f.name}" is too large (max 500 MB)`;
        continue;
      }
      const pages = await estimatePageCount(f);
      newEntries.push({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
        file: f,
        state: "pending",
        progress: 0,
        pageCount: pages,
      });
    }
    if (sizeError) setGlobalError(sizeError);
    if (!newEntries.length) return;
    const updated = [...entries, ...newEntries];
    handleFilesChange(updated);
    for (const e of newEntries) handleUploadFile(e.id, e.file);
  };

  const updateConfig = (id: string, patch: Partial<PrintConfig>) => {
    setConfigs((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const readyEntries = entries.filter((e) => e.state === "done");
  const hasUploading = entries.some((e) => e.state === "uploading");
  const canSubmit = readyEntries.length > 0 && !hasUploading && !submitting;

  const activeEntry = readyEntries.find((e) => e.id === activeFileId) ?? readyEntries[0];
  const activeConfig = activeEntry ? (configs[activeEntry.id] ?? DEFAULT_CONFIG) : DEFAULT_CONFIG;

  const [activeFileUrl, setActiveFileUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!activeEntry?.file) { setActiveFileUrl(null); return; }
    const url = URL.createObjectURL(activeEntry.file);
    setActiveFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [activeEntry?.id]);

  const activePriceSplit = calculatePrice(activeConfig);
  const grandTotal = readyEntries.reduce((sum, e) => {
    const c = configs[e.id] ?? DEFAULT_CONFIG;
    return sum + calculatePrice(c).total;
  }, 0);

  const handleNext = () => {
    if (!canSubmit) return;
    const jobs = readyEntries.map((e) => ({
      fileUrl: e.fileUrl!,
      fileName: e.file.name,
      config: configs[e.id] ?? DEFAULT_CONFIG,
    }));
    sessionStorage.setItem("printJobs", JSON.stringify(jobs));
    router.push("/checkout");
  };

  const isPdf = activeEntry?.file?.type === "application/pdf";
  const isImage = activeEntry?.file?.type?.startsWith("image/");
  const isDocx = activeEntry?.file?.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isPpt = activeEntry?.file?.type === "application/vnd.ms-powerpoint" || 
                activeEntry?.file?.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  const showConfig = readyEntries.length > 0 && activeEntry;

  return (
    <main className="min-h-screen bg-[#F2F3F7] text-[#1A1A1A] pb-32">
      {/* Top Header */}
      <div className="sticky top-0 z-50 bg-[#F2F3F7] border-b border-[#E8E8E8]">
        <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-[#E8E8E8] hover:bg-[#F8FDF8] transition-colors shadow-sm">
            <span className="text-lg text-[#1A1A1A]">‹</span>
          </button>
          
          {readyEntries.length > 0 && (
            <div className="relative">
              <input
                type="file"
                multiple
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                   if (e.target.files) {
                     handleAdditionalFiles(Array.from(e.target.files));
                     e.target.value = "";
                   }
                }}
              />
              <button className="bg-white border border-[#0C831F] text-[#0C831F] px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-sm">
                <span>+</span> Add files
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6">
        {/* Upload State - if nothing is ready yet */}
        {(!showConfig || hasUploading) && (
          <div className="mb-6 animate-fadeUp">
            <FileDropzone
              entries={entries}
              onFilesChange={handleFilesChange}
              onUploadFile={handleUploadFile}
              onCancelUpload={handleCancelUpload}
              onRemoveFile={handleRemoveFile}
            />
            {globalError && <p className="text-red-500 text-xs mt-2">{globalError}</p>}
          </div>
        )}

        {/* Config / Preview State */}
        {showConfig && (
          <div className="space-y-4 animate-fadeUp">
            {/* Multi-file tabs */}
            {readyEntries.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
                {readyEntries.map((e, i) => (
                  <button
                    key={e.id}
                    onClick={() => { setActiveFileId(e.id); setCurrentPage(1); }}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                      activeFileId === e.id
                        ? "bg-gradient-to-r from-[#00B4D8] via-[#10B981] to-[#0C831F] text-white border-transparent shadow-md shadow-[#0C831F]/20"
                        : "bg-white text-[#666] border-[#E8E8E8]"
                    }`}
                  >
                    File {i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Preview Section */}
            <div className="bg-[#F2F3F7] rounded-2xl mb-2">
              {isPdf && activeFileUrl ? (
                <PdfPreview
                  key={activeFileId}
                  fileUrl={activeFileUrl}
                  colour={activeConfig.colour}
                  orientation={activeConfig.orientation}
                  currentPage={currentPage}
                  totalPages={activeConfig.totalPages}
                  onTotalPages={(n) => updateConfig(activeEntry.id, { totalPages: n, pages: countPagesInRange(activeConfig.pageRange, n) })}
                  onPageChange={setCurrentPage}
                  onClose={() => handleRemoveFile(activeEntry.id)}
                />
              ) : isImage && activeEntry?.file ? (
                /* Image preview */
                <div className="relative bg-white rounded-2xl shadow-sm border border-[#E8E8E8] p-4 text-center">
                  <button
                    onClick={() => handleRemoveFile(activeEntry.id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#F2F3F7] flex items-center justify-center text-xl text-[#999] hover:bg-[#E8E8E8] z-10"
                  >
                    ×
                  </button>
                  <div className="flex items-center justify-center min-h-[300px]">
                    <img
                      key={activeFileId}
                      src={URL.createObjectURL(activeEntry.file)}
                      alt={activeEntry.file.name}
                      className="max-w-full max-h-[350px] rounded-lg shadow-md object-contain"
                      style={{
                        filter: activeConfig.colour ? "none" : "grayscale(100%)",
                        transform: activeConfig.orientation === "landscape" ? "rotate(-90deg) scale(0.75)" : "none",
                      }}
                    />
                  </div>
                </div>
              ) : activeEntry?.file ? (
                /* DOCX / other file preview placeholder */
                <div className="relative bg-white rounded-2xl shadow-sm border border-[#E8E8E8] p-6 text-center">
                  <button
                    onClick={() => handleRemoveFile(activeEntry.id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#F2F3F7] flex items-center justify-center text-xl text-[#999] hover:bg-[#E8E8E8] z-10"
                  >
                    ×
                  </button>
                  <div className="flex flex-col items-center justify-center min-h-[260px] gap-3">
                    <div className={`w-20 h-24 bg-gradient-to-br ${isDocx ? "from-[#4285F4] to-[#1967D2]" : isPpt ? "from-[#FF5722] to-[#D84315]" : "from-[#666] to-[#444]"} rounded-lg flex flex-col items-center justify-center shadow-lg`}>
                      <span className="text-white text-2xl mb-1">{isPpt ? "📊" : "📄"}</span>
                      <span className="text-white text-[10px] font-bold uppercase tracking-wider">
                        {isDocx ? "DOCX" : isPpt ? "PPT" : activeEntry.file.name.split(".").pop()?.toUpperCase() || "FILE"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#1A1A1A] truncate max-w-[280px]">{activeEntry.file.name}</p>
                    <p className="text-xs text-[#999]">{(activeEntry.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <div className="flex items-center gap-2 bg-[#E8F5E9] text-[#0C831F] px-3 py-1.5 rounded-lg text-xs font-semibold">
                      <span>✓</span> Ready for print
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Config Options */}
            
            {/* Copies */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E8E8] flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">Number of copies</p>
                <p className="text-xs text-[#999] mt-0.5">
                  {readyEntries.length > 1 ? `File ${readyEntries.findIndex(e => e.id === activeEntry.id) + 1}` : "File 1"} ({activeConfig.totalPages} pages)
                </p>
              </div>
              <div className="flex items-center gap-3 bg-gradient-to-r from-[#00B4D8] via-[#10B981] to-[#0C831F] text-white rounded-xl px-2 py-1 shadow-md shadow-[#0C831F]/20">
                <button
                  onClick={() => updateConfig(activeEntry.id, { copies: Math.max(1, activeConfig.copies - 1) })}
                  className="w-7 h-7 flex items-center justify-center text-lg font-bold"
                >
                  −
                </button>
                <span className="font-bold w-4 text-center">{activeConfig.copies}</span>
                <button
                  onClick={() => updateConfig(activeEntry.id, { copies: Math.min(50, activeConfig.copies + 1) })}
                  className="w-7 h-7 flex items-center justify-center text-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Options block */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8E8E8] space-y-5">
              {isPdf && activeConfig.totalPages > 1 && (
                <div className="pb-5 border-b border-[#F2F3F7]">
                  <PageRangeSelector
                    totalPages={activeConfig.totalPages}
                    pageRange={activeConfig.pageRange}
                    onChange={(range) => {
                      const pc = countPagesInRange(range, activeConfig.totalPages);
                      updateConfig(activeEntry.id, { pageRange: range, pages: pc });
                    }}
                  />
                </div>
              )}
              
              <PrintOptionCard
                title="Choose print color"
                options={[
                  { value: "colour", label: "Coloured", sublabel: `${storeConfig.currencySymbol}${storeConfig.pricing.colorPerPage}/page`, icon: "🎨" },
                  { value: "bw", label: "B & W", sublabel: `${storeConfig.currencySymbol}${storeConfig.pricing.bwPerPage}/page`, icon: "🖤" },
                ]}
                value={activeConfig.colour ? "colour" : "bw"}
                onChange={(v) => updateConfig(activeEntry.id, { colour: v === "colour" })}
              />

              <PrintOptionCard
                title="Choose print sides"
                options={[
                  { value: "single", label: "Single side", icon: "📃" },
                  { value: "double", label: "Both sides", sublabel: `${storeConfig.pricing.duplexDiscountPercent}% off`, icon: "📄" },
                ]}
                value={activeConfig.duplex ? "double" : "single"}
                onChange={(v) => updateConfig(activeEntry.id, { duplex: v === "double" })}
              />

              <PrintOptionCard
                title="Choose print orientation"
                options={[
                  { value: "portrait", label: "Portrait", sublabel: "8.3 x 11.7 in", icon: "▯" },
                  { value: "landscape", label: "Landscape", sublabel: "11.7 x 8.3 in", icon: "▭" },
                ]}
                value={activeConfig.orientation}
                onChange={(v) => updateConfig(activeEntry.id, { orientation: v as "portrait" | "landscape" })}
              />

              <div className="md:col-span-2 mt-4">
                <PriceCalc config={activeConfig} />
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      {showConfig && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#F2F3F7] z-50 border-t border-[#E8E8E8]">
          <div className="max-w-lg mx-auto flex">
            {/* Price Side */}
            <div className="w-1/3 p-4 flex flex-col justify-center">
              <span className="text-xs text-[#666] font-semibold">Total {activePriceSplit.pageCount * activeConfig.copies} pages</span>
              <p className="text-lg font-black text-[#1A1A1A]">{storeConfig.currencySymbol}{grandTotal}</p>
            </div>
            
            {/* Action Side */}
            <div className="w-2/3 p-4">
               <button
                onClick={handleNext}
                disabled={!canSubmit}
                className="w-full bg-gradient-to-r from-[#00B4D8] via-[#10B981] to-[#0C831F] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0C831F]/20"
              >
                {submitting ? "Processing…" : "Add to cart"}
                {!submitting && <span className="text-sm">›</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}