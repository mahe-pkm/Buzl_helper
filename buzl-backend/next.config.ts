import type { NextConfig } from "next";

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  process.env.DATABASE_URL = "mysql://dummy:dummy@localhost:3306/dummy";
}

const nextConfig: NextConfig = {};

export default nextConfig;
