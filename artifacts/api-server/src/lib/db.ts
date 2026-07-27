import mongoose from "mongoose";
import { logger } from "./logger";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}

let cached: mongoose.Connection | null = null;

export async function connectDB(): Promise<mongoose.Connection> {
  if (cached) return cached;

  try {
    await mongoose.connect(MONGODB_URI as string);
    cached = mongoose.connection;
    logger.info("MongoDB connected");
    return cached;
  } catch (err) {
    logger.error({ err }, "MongoDB connection failed");
    throw err;
  }
}
