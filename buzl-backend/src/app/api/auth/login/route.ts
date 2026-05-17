import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    const cleanUsername = String(username).trim();

    if (!cleanUsername) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const isAdmin = cleanUsername.toLowerCase() === "admin";

    // 1. Admin login flow (Requires password)
    if (isAdmin) {
      const user = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });

      if (!user) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const isValid = await bcrypt.compare(password || "", user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const token = signToken({ id: user.id, username: user.username, role: user.role });
      return NextResponse.json(
        { token, user: { id: user.id, username: user.username, role: user.role } },
        { headers: { "Access-Control-Allow-Origin": "*" } }
      );
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
    return NextResponse.json(
      { token, user: { id: user.id, username: user.username, role: user.role } },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
