import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getUserFromRequest } from "@/lib/auth";
import { corsPreflight, jsonWithCors } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function GET(req: NextRequest) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") {
    return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true },
  });

  return jsonWithCors(req, users);
}

export async function POST(req: NextRequest) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") {
    return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { username, password, role } = await req.json();

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return jsonWithCors(req, { error: "Username already exists" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: role || "worker",
      },
      select: { id: true, username: true, role: true },
    });

    return jsonWithCors(req, user);
  } catch {
    return jsonWithCors(req, { error: "Internal server error" }, { status: 500 });
  }
}
