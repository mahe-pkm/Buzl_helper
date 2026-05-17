import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { username, password, role } = await req.json();

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
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

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
