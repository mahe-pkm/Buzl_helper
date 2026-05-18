import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";
import { corsPreflight, jsonWithCors } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    const cleanUsername = String(username).trim();

    if (!cleanUsername) {
      return jsonWithCors(req, { error: "Username is required" }, { status: 400 });
    }

    const isAdmin = cleanUsername.toLowerCase() === "admin";

    // 1. Admin login flow (Requires password)
    if (isAdmin) {
      const user = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });

      if (!user) {
        return jsonWithCors(req, { error: "Invalid credentials" }, { status: 401 });
      }

      const isValid = await bcrypt.compare(password || "", user.passwordHash);
      if (!isValid) {
        return jsonWithCors(req, { error: "Invalid credentials" }, { status: 401 });
      }

      const token = signToken({ id: user.id, username: user.username, role: user.role });
      return jsonWithCors(req, { token, user: { id: user.id, username: user.username, role: user.role } });
    }

    // 2. Worker login flow (Passwordless / Auto-register)
    let user = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    // Auto-create worker if they do not exist!
    if (!user) {
      const defaultPasswordHash = await bcrypt.hash("worker-passwordless-token", 10);
      user = await prisma.user.create({
        data: {
          username: cleanUsername,
          passwordHash: defaultPasswordHash,
          role: "worker",
        },
      });
    }

    const token = signToken({ id: user.id, username: user.username, role: user.role });
    return jsonWithCors(req, { token, user: { id: user.id, username: user.username, role: user.role } });
  } catch {
    return jsonWithCors(req, { error: "Internal server error" }, { status: 500 });
  }
}
