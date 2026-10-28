import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Semua halaman membutuhkan sesi; Cache Components (static shell) tidak dipakai.
  poweredByHeader: false,
  // Image Docker produksi menjalankan .next/standalone/server.js.
  output: "standalone",
  serverExternalPackages: ["@node-rs/argon2"],
  experimental: {
    // Lampiran cuti & dokumen maks. 10 MB (spesifikasi [9]) + overhead form.
    serverActions: { bodySizeLimit: "11mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // CSP dipasang per permintaan (dengan nonce) di proxy.ts.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
