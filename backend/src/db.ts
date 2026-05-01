// FILE: services/api/src/db.ts
// MongoDB Atlas connection using Mongoose
import "dotenv/config";
import mongoose from "mongoose";
// Use standard DNS resolution
// (Removed manual DNS servers to prevent Vercel crashes)

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