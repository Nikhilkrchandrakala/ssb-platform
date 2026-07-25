import mongoose from "mongoose";
import dns from "node:dns";

// Node's bundled c-ares resolver frequently fails `querySrv` (used by
// mongodb+srv:// URIs) on Windows even when the OS resolver works fine —
// pointing it at a public resolver avoids the "ECONNREFUSED" SRV lookup bug.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const MONGODB_URI = process.env.MONGODB_URI;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Next.js reloads modules on every route handler invocation in dev, and can
// spin up multiple isolates in serverless production — cache the connection
// on `globalThis` so we don't open a new connection per request.
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in the environment.");
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI).then((m) => m);
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}
