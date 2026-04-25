// FILE: services/api/src/file/cloudinary.service.ts
// Generates a signed Cloudinary upload URL.
// The frontend uploads directly to Cloudinary — this backend never receives the file.
// Files auto-delete after 4 hours via Cloudinary's invalidate/expiry settings.

import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface UploadSignature {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
}

export function getUploadSignature(): UploadSignature {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const folder = process.env.CLOUDINARY_FOLDER ?? "printshop";

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary env vars are not set");
  }

  const timestamp = Math.round(Date.now() / 1000);

  // Parameters to sign — must be alphabetically sorted
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;

  const signature = crypto
    .createHash("sha256")
    .update(paramsToSign + apiSecret)
    .digest("hex");

  return { signature, timestamp, cloudName, apiKey, folder };
}

/**
 * Extracts public_id from a Cloudinary URL and deletes it.
 * Handles both "image" and "raw" (PDFs/Docs) resource types.
 */
export async function deleteFromCloudinary(url: string): Promise<boolean> {
  try {
    const parts = url.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1) return false;

    // Detect resource type (image, raw, video) from URL
    // e.g. .../dd7vojfme/image/upload/... -> parts[uploadIndex - 1] is "image"
    const resourceTypeFromUrl = parts[uploadIndex - 1] || "image";

    // Skip "upload" and the optional version (v...)
    let startIndex = uploadIndex + 1;
    if (parts[startIndex].startsWith("v")) {
      startIndex++;
    }

    // The remaining parts form the public_id + extension
    const fullPathWithExt = parts.slice(startIndex).join("/");
    const lastDot = fullPathWithExt.lastIndexOf(".");
    
    // For "image" or "video", the public_id EXCLUDES the extension.
    // For "raw" (like some PDFs), the public_id INCLUDES the extension.
    const publicIdWithoutExt = lastDot > -1 ? fullPathWithExt.substring(0, lastDot) : fullPathWithExt;
    const publicIdWithExt = fullPathWithExt;

    console.log(`[Cloudinary] Attempting to delete: ${fullPathWithExt} (detected type: ${resourceTypeFromUrl})`);

    // Strategy: Try the detected type first, then fallback to others if needed.
    // 1. Try with detected type and correct publicId format
    const targetId = resourceTypeFromUrl === "raw" ? publicIdWithExt : publicIdWithoutExt;
    const res1 = await cloudinary.uploader.destroy(targetId, { resource_type: resourceTypeFromUrl });
    
    if (res1.result === "ok") {
      console.log(`[Cloudinary] Successfully deleted ${targetId} as ${resourceTypeFromUrl}`);
      return true;
    }

    // 2. Fallback: If it's a PDF/Doc, it might be in the other category
    const fallbackType = resourceTypeFromUrl === "raw" ? "image" : "raw";
    const fallbackId = fallbackType === "raw" ? publicIdWithExt : publicIdWithoutExt;
    
    console.log(`[Cloudinary] ${resourceTypeFromUrl} delete failed (${res1.result}). Trying fallback as ${fallbackType}: ${fallbackId}`);
    const res2 = await cloudinary.uploader.destroy(fallbackId, { resource_type: fallbackType });
    
    if (res2.result === "ok") {
      console.log(`[Cloudinary] Successfully deleted ${fallbackId} as ${fallbackType}`);
      return true;
    }

    console.warn(`[Cloudinary] All deletion attempts failed for ${fullPathWithExt}. Result: ${res2.result}`);
    return false;
  } catch (err) {
    console.error("[Cloudinary] Delete failed:", err);
    return false;
  }
}

/**
 * Cleanup: Delete ALL files in the Cloudinary folder.
 * Called every 24 hours by the cron job.
 */
export async function cleanupAllCloudinaryFiles(): Promise<void> {
  const folder = process.env.CLOUDINARY_FOLDER ?? "printshop";
  
  // Re-initialize config here to ensure env vars are loaded
  // (module-level config may run before dotenv is loaded)
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
    // Delete all resources (images)
    let hasMore = true;
    let nextCursor: string | undefined;
    let totalDeleted = 0;

    // Clean up image type resources
    while (hasMore) {
      const result: any = await cloudinary.api.resources({
        type: "upload",
        resource_type: "image",
        prefix: folder,
        max_results: 100,
        ...(nextCursor ? { next_cursor: nextCursor } : {}),
      });

      const ids = result.resources?.map((r: any) => r.public_id) || [];
      if (ids.length > 0) {
        await cloudinary.api.delete_resources(ids, { resource_type: "image" });
        totalDeleted += ids.length;
      }

      nextCursor = result.next_cursor;
      hasMore = !!nextCursor;
    }

    // Clean up raw type resources (PDFs, DOCX)
    hasMore = true;
    nextCursor = undefined;
    while (hasMore) {
      const result: any = await cloudinary.api.resources({
        type: "upload",
        resource_type: "raw",
        prefix: folder,
        max_results: 100,
        ...(nextCursor ? { next_cursor: nextCursor } : {}),
      });

      const ids = result.resources?.map((r: any) => r.public_id) || [];
      if (ids.length > 0) {
        await cloudinary.api.delete_resources(ids, { resource_type: "raw" });
        totalDeleted += ids.length;
      }

      nextCursor = result.next_cursor;
      hasMore = !!nextCursor;
    }

    console.log(`[Cloudinary Cleanup] Deleted ${totalDeleted} files from folder '${folder}'.`);
  } catch (err) {
    console.error("[Cloudinary Cleanup] Failed:", err);
  }
}