"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";

const ACCEPTED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];
const MAX_MB = 5120;

export interface FileEntry {
  id: string;
  file: File;
  state: "pending" | "uploading" | "done" | "error";
  progress: number;
  cloudinaryUrl?: string;
  error?: string;
  pageCount: number;
}

export async function estimatePdfPages(file: File): Promise<number> {
  if (file.type !== "application/pdf") return 1;
  try {
    const buffer = await file.arrayBuffer();
    const content = new TextDecoder().decode(buffer);
    const matches = content.match(/\/Type\s*\/Page\b/g);
    return matches ? matches.length : 1;
  } catch {
    return 1;
  }
}

interface Props {
  onFilesChange: (entries: FileEntry[]) => void;
  entries: FileEntry[];
  onUploadFile: (id: string, file: File) => void;
  onCancelUpload: (id: string) => void;
  onRemoveFile: (id: string) => void;
}

export default function FileDropzone({ onFilesChange, entries, onUploadFile, onCancelUpload, onRemoveFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [validationError, setValidationError] = useState("");

  const validate = (f: File): string => {
    if (!ACCEPTED.includes(f.type)) return `"${f.name}": unsupported type`;
    if (f.size > MAX_MB * 1024 * 1024) return `"${f.name}": too large (max ${MAX_MB} MB)`;
    return "";
  };

  const addFiles = async (rawFiles: File[]) => {
    setValidationError("");
    const newEntries: FileEntry[] = [];
    const errors: string[] = [];

    for (const f of rawFiles) {
      const err = validate(f);
      if (err) { errors.push(err); continue; }
      const pages = await estimatePdfPages(f);
      newEntries.push({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
        file: f,
        state: "pending",
        progress: 0,
        pageCount: pages,
      });
    }

    if (errors.length) setValidationError(errors.join("; "));
    if (!newEntries.length) return;

    const updated = [...entries, ...newEntries];
    onFilesChange(updated);
    for (const e of newEntries) onUploadFile(e.id, e.file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const ext = (name: string) => name.split(".").pop()?.toUpperCase() ?? "FILE";

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragging
            ? "border-[#0C831F] bg-[#E8F5E9]"
            : "border-[#E8E8E8] bg-white hover:border-[#0C831F]/40 hover:bg-[#F8FDF8]"
        }`}
      >
        <div className="text-3xl mb-2">📂</div>
        <p className="text-sm text-[#1A1A1A] font-semibold mb-1">
          Drop files here or <span className="text-[#0C831F]">browse</span>
        </p>
        <p className="text-xs text-[#999]">PDF · DOCX · JPG · PNG — multiple allowed</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.jpg,.jpeg,.png"
          multiple
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {validationError && (
        <p className="text-red-500 text-xs mt-2 px-1">{validationError}</p>
      )}

      {/* File list */}
      {entries.length > 0 && (
        <div className="mt-3 space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`bg-white rounded-xl p-3 flex items-center gap-3 border transition-all ${
                entry.state === "done"
                  ? "border-[#C8E6C9]"
                  : entry.state === "error"
                  ? "border-red-200"
                  : "border-[#E8E8E8]"
              }`}
            >
              {/* Badge */}
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                entry.state === "done" ? "bg-[#E8F5E9] text-[#0C831F]" :
                entry.state === "error" ? "bg-red-50 text-red-500" :
                "bg-[#F2F3F7] text-[#666]"
              }`}>
                {entry.state === "done" ? "✓" : ext(entry.file.name)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${
                  entry.state === "done" ? "text-[#0C831F]" :
                  entry.state === "error" ? "text-red-500" :
                  "text-[#1A1A1A]"
                }`}>
                  {entry.file.name}
                </p>
                {entry.state === "uploading" && (
                  <div className="mt-1.5">
                    <div className="h-1.5 bg-[#F2F3F7] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0C831F] rounded-full transition-all duration-200"
                        style={{ width: `${entry.progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#999] mt-0.5">{entry.progress}% uploading…</p>
                  </div>
                )}
                {entry.state === "pending" && <p className="text-[10px] text-[#999] mt-0.5">Queued…</p>}
                {entry.state === "done" && (
                  <p className="text-[10px] text-[#0C831F] mt-0.5">
                    {(entry.file.size / 1024 / 1024).toFixed(2)} MB — uploaded
                  </p>
                )}
                {entry.state === "error" && (
                  <p className="text-[10px] text-red-400 mt-0.5">{entry.error ?? "Upload failed"}</p>
                )}
              </div>

              {/* Cancel button (while uploading) */}
              {entry.state === "uploading" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onCancelUpload(entry.id); }}
                  className="text-red-400 hover:text-red-600 transition-colors shrink-0 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-red-50"
                  title="Cancel upload"
                >
                  Cancel
                </button>
              )}

              {/* Remove button (when done or error) */}
              {(entry.state === "done" || entry.state === "error") && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveFile(entry.id); }}
                  className="text-[#CCC] hover:text-red-400 transition-colors shrink-0 text-sm px-1"
                  title="Remove"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}