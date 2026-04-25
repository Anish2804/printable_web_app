// FILE: services/api/src/server.ts
// HTTP server entry point — connects to MongoDB then starts listening

import app from "./app";
import { connectDB } from "./db";
import { cleanupAllCloudinaryFiles } from "./file/cloudinary.service";

const PORT = process.env.PORT ?? 4000;
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in ms

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`✅ SmartPrint API running on http://localhost:${PORT}`);

    // Run Cloudinary cleanup on startup, then every 24 hours
    cleanupAllCloudinaryFiles();
    setInterval(() => cleanupAllCloudinaryFiles(), CLEANUP_INTERVAL);
    console.log(`🧹 Cloudinary cleanup scheduled every 24 hours`);
  });
}

start().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});