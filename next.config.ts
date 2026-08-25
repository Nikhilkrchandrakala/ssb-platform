import type { NextConfig } from "next";
import fs from "fs";

// Monkey-patch fs.readlink, fs.readlinkSync, and fs.promises.readlink to fix mapped drive EISDIR bugs on Windows.
// When called on a regular file or directory, some Windows mapped drives incorrectly return EISDIR instead of EINVAL/ENOTDIR.
const originalReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function (path: any, options: any) {
  try {
    return originalReadlinkSync(path, options);
  } catch (err: any) {
    if (err && err.code === "EISDIR") {
      const newErr = new Error(`EINVAL: invalid argument, readlink '${path}'`) as any;
      newErr.code = "EINVAL";
      newErr.errno = -4071;
      newErr.syscall = "readlink";
      newErr.path = path;
      throw newErr;
    }
    throw err;
  }
} as any;

const originalReadlink = fs.readlink;
fs.readlink = function (path: any, options: any, callback?: any) {
  const cb = typeof options === "function" ? options : callback;
  const opts = typeof options === "function" ? undefined : options;
  return originalReadlink(path, opts, (err: any, linkString: any) => {
    if (err && err.code === "EISDIR") {
      const newErr = new Error(`EINVAL: invalid argument, readlink '${path}'`) as any;
      newErr.code = "EINVAL";
      newErr.errno = -4071;
      newErr.syscall = "readlink";
      newErr.path = path;
      return cb(newErr);
    }
    cb(err, linkString);
  });
} as any;

if (fs.promises && fs.promises.readlink) {
  const originalPromisesReadlink = fs.promises.readlink;
  fs.promises.readlink = async function (path: any, options: any) {
    try {
      return await originalPromisesReadlink(path, options);
    } catch (err: any) {
      if (err && err.code === "EISDIR") {
        const newErr = new Error(`EINVAL: invalid argument, readlink '${path}'`) as any;
        newErr.code = "EINVAL";
        newErr.errno = -4071;
        newErr.syscall = "readlink";
        newErr.path = path;
        throw newErr;
      }
      throw err;
    }
  } as any;
}

const nextConfig: NextConfig = {
  output: "standalone",
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
  webpack(config) {
    if (config.resolve) {
      config.resolve.symlinks = false;
    }
    config.cache = false;
    config.infrastructureLogging = {
      level: "error",
    };
    return config;
  },
};

export default nextConfig;
