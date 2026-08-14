import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Route local-disk uploads through a route handler that reads fresh from
  // disk per-request (src/app/api/uploads/[...path]/route.ts) instead of
  // Next's own public-folder static serving, which snapshots public/'s file
  // list once at process startup and never sees anything uploaded at
  // runtime until a restart. beforeFiles runs ahead of the public-folder
  // check, so this intercepts /uploads/* before Next's stale cache would —
  // every already-stored /uploads/... URL keeps working unchanged.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/uploads/:path*", destination: "/api/uploads/:path*" }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
