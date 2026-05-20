import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getUserFromRequest } from "@/lib/auth";
import { corsPreflight, jsonWithCors } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (id === authUser.id) return jsonWithCors(req, { error: "Cannot delete yourself" }, { status: 400 });
  try {
    await prisma.product.updateMany({ where: { assigned_to: id }, data: { assigned_to: null } });
    await prisma.user.delete({ where: { id } });
    return jsonWithCors(req, { success: true });
  } catch {
    return jsonWithCors(req, { error: "Delete failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const { username, password } = await req.json() as { username?: string; password?: string };
    const cleanUsername = typeof username === "string" ? username.trim() : "";
    const cleanPassword = typeof password === "string" ? password.trim() : "";

    if (!cleanUsername && !cleanPassword) {
      return jsonWithCors(req, { error: "Username or password is required" }, { status: 400 });
    }

    const updateData: { username?: string; passwordHash?: string } = {};

    if (cleanUsername) {
      const existingUser = await prisma.user.findUnique({ where: { username: cleanUsername } });
      if (existingUser && existingUser.id !== id) {
        return jsonWithCors(req, { error: "Username already exists" }, { status: 400 });
      }
      updateData.username = cleanUsername;
    }

    if (cleanPassword) {
      updateData.passwordHash = await bcrypt.hash(cleanPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, role: true },
    });

    return jsonWithCors(req, updated);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return jsonWithCors(req, { error: "User not found" }, { status: 404 });
    }
    return jsonWithCors(req, { error: "Reset failed" }, { status: 500 });
  }
}
