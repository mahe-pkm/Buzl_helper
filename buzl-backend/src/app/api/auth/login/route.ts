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
    const cleanPassword = String(password || "");

    if (!cleanUsername) {
      return jsonWithCors(req, { error: "Username is required" }, { status: 400 });
    }

    if (!cleanPassword) {
      return jsonWithCors(req, { error: "Password is required" }, { status: 400 });
    }

    // Login is strictly for existing users created by admin.
    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!user) {
      return jsonWithCors(req, { error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(cleanPassword, user.passwordHash);
    if (!isValid) {
      return jsonWithCors(req, { error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({ id: user.id, username: user.username, role: user.role });
    return jsonWithCors(req, { token, user: { id: user.id, username: user.username, role: user.role } });
  } catch {
    return jsonWithCors(req, { error: "Internal server error" }, { status: 500 });
  }
}
