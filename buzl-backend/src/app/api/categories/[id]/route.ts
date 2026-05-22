import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { corsPreflight, jsonWithCors } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") {
    return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return jsonWithCors(req, { error: "Category not found" }, { status: 404 });

  const usageCount = await prisma.product.count({
    where: { category: category.name },
  });
  if (usageCount > 0) {
    return jsonWithCors(req, { error: "Category is used by products and cannot be deleted" }, { status: 400 });
  }

  await prisma.category.delete({ where: { id } });
  return jsonWithCors(req, { ok: true });
}
