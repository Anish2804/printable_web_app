// FILE: services/api/src/db.ts
// MongoDB Atlas connection using Mongoose
import "dotenv/config";
import mongoose from "mongoose";
import dns from "node:dns";

// Use Google public DNS so SRV lookups work on restrictive networks (like mobile hotspots)
dns.setServers(["8.8.8.8", "8.8.4.4"]);

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in .env");

  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
}