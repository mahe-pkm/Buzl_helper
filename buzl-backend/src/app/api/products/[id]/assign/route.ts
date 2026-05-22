import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { corsPreflight, jsonWithCors } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getUserFromRequest(req);
  if (!authUser) return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const { assigned_to } = (await req.json()) as { assigned_to?: string | null };
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return jsonWithCors(req, { error: "Not found" }, { status: 404 });

    if (authUser.role !== "admin") {
      const isClaimingSelf = assigned_to === authUser.id;
      const isReleasingOwnTask = assigned_to === null && product.assigned_to === authUser.id;

      if (!isClaimingSelf && !isReleasingOwnTask) {
        return jsonWithCors(req, { error: "Workers can only claim tasks for themselves" }, { status: 403 });
      }

      if (isClaimingSelf && product.assigned_to && product.assigned_to !== authUser.id) {
        return jsonWithCors(req, { error: "Task is already assigned" }, { status: 409 });
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { 
        assigned_to: assigned_to ?? null,
        assignedAt: assigned_to ? new Date() : null,
        lastActivityAt: new Date(),
        last_action: assigned_to ? "Assigned to worker" : "Unassigned"
      },
      include: { assignee: { select: { id: true, username: true } } },
    });
    return jsonWithCors(req, updated);
  } catch {
    return jsonWithCors(req, { error: "Internal server error" }, { status: 500 });
  }
}
