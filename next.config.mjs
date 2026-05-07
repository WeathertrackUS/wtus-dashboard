import { realpathSync } from "node:fs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  turbopack: {
    root: realpathSync.native("."),
  },
};

export default nextConfig;
