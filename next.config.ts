import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  outputFileTracingIncludes: {
    "/*": ["./prisma/certs/supabase-ca.crt"],
  },
};

export default nextConfig;


