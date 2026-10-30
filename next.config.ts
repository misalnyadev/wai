import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Hanya berlaku saat `next dev`: izinkan host preview sandbox (e2b.app)
  // memuat aset dev. Tanpa ini Next memblokir HMR/chunk lintas-origin
  // sehingga pratinjau tampil kosong. Tidak berpengaruh di produksi.
  allowedDevOrigins: ["*.e2b.app"],
};

export default nextConfig;
