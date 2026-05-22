import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { corsPreflight, jsonWithCors } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function GET(req: NextRequest) {
  const authUser = getUserFromRequest(req);
  if (!authUser) return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  return jsonWithCors(req, categories);
}

export async function POST(req: NextRequest) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") {
    return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    const cleanName = (name || "").trim();
    if (!cleanName) {
      return jsonWithCors(req, { error: "Category name is required" }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: { name: cleanName },
    });
    return jsonWithCors(req, category, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonWithCors(req, { error: "Category already exists" }, { status: 409 });
    }
    return jsonWithCors(req, { error: "Failed to create category" }, { status: 500 });
  }
}
